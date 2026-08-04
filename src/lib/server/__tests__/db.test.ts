import { describe, it, expect } from 'vitest';
import { mem_db } from './mem_db';
import { new_id, one, many, run } from '$lib/server/db';

const add_user = (db: D1Database, id: string) =>
	run(db, 'insert into u (id, n, dv, cr) values (?, ?, 1, ?)', id, 'n-' + id, Date.now());

const add_summary = (db: D1Database, id: string, uid: string, t: string, b: string) =>
	run(db, 'insert into s (id, uid, t, ty, md, ln, b, cr) values (?, ?, ?, ?, ?, ?, ?, ?)', id, uid, t, 'x', 'm', 'm', b, Date.now());

describe('db', () => {
	it('applies the migration cleanly', () => {
		expect(() => mem_db()).not.toThrow();
	});

	it('new_id returns 24 chars and never repeats', () => {
		expect(new_id()).toHaveLength(24);
		expect(new_id()).not.toBe(new_id());
	});

	it('round-trips a row through one()', async () => {
		const db = mem_db();
		await add_user(db, 'u1');
		const row = await one<{ id: string; dv: number }>(db, 'select id, dv from u where id = ?', 'u1');
		expect(row?.id).toBe('u1');
		expect(row?.dv).toBe(1);
	});

	it('run returns the number of rows it actually changed', async () => {
		const db = mem_db();
		await add_user(db, 'u1');
		expect(await run(db, 'update u set n = ? where id = ?', 'x', 'u1')).toBe(1);
		expect(await run(db, 'update u set n = ? where id = ?', 'x', 'nope')).toBe(0);
	});

	it('fts finds only the owner row (insert trigger + uid scoping)', async () => {
		const db = mem_db();
		await add_user(db, 'u1');
		await add_user(db, 'u2');
		await add_summary(db, 's1', 'u1', 'mine', 'hydrogen is the lightest element');
		await add_summary(db, 's2', 'u2', 'theirs', 'hydrogen appears here too');
		const rows = await many<{ id: string }>(
			db,
			"select s.id from s_fts join s on s.rid = s_fts.rowid where s_fts match ? and s.uid = ?",
			'hydrogen',
			'u1'
		);
		expect(rows.map((r) => r.id)).toEqual(['s1']);
	});

	it('fts follows an update (s_au trigger)', async () => {
		const db = mem_db();
		await add_user(db, 'u1');
		await add_summary(db, 's1', 'u1', 'mine', 'hydrogen');
		await run(db, 'update s set b = ? where id = ?', 'helium', 's1');
		const helium = await many(db, "select s.id from s_fts join s on s.rid = s_fts.rowid where s_fts match ?", 'helium');
		const hydrogen = await many(db, "select s.id from s_fts join s on s.rid = s_fts.rowid where s_fts match ?", 'hydrogen');
		expect(helium).toHaveLength(1);
		expect(hydrogen).toHaveLength(0);
	});
});
