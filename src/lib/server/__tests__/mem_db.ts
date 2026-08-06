import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function mem_db(): D1Database {
	const db = new DatabaseSync(':memory:');
	db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
	const prep = (sql: string) => {
		let args: unknown[] = [];
		const api = {
			_run: () => {
				const r = db.prepare(sql).run(...(args as never[]));
				return { meta: { changes: Number(r.changes) } };
			},
			bind: (...a: unknown[]) => ((args = a), api),
			first: async <T>() => (db.prepare(sql).get(...(args as never[])) as T) ?? null,
			all: async <T>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
			run: async () => api._run()
		};
		return api;
	};
	const batch = async (stmts: { _run: () => { meta: { changes: number } } }[]) => {
		db.exec('begin');
		try {
			const out = stmts.map((s) => s._run());
			db.exec('commit');
			return out;
		} catch (e) {
			db.exec('rollback');
			throw e;
		}
	};
	return { prepare: prep, batch } as unknown as D1Database;
}
