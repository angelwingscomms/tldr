import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function mem_db(): D1Database {
	const db = new DatabaseSync(':memory:');
	db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
	const prep = (sql: string) => {
		let args: unknown[] = [];
		const api = {
			bind: (...a: unknown[]) => ((args = a), api),
			first: async <T>() => (db.prepare(sql).get(...(args as never[])) as T) ?? null,
			all: async <T>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
			run: async () => {
				const r = db.prepare(sql).run(...(args as never[]));
				return { meta: { changes: Number(r.changes) } };
			}
		};
		return api;
	};
	return { prepare: prep } as unknown as D1Database;
}
