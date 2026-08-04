import { describe, it, expect } from 'vitest';
import { mem_db } from './mem_db';
import { search, fts_escape } from '$lib/server/search';

const add = (db: D1Database, id: string, uid: string, t: string, b: string) =>
	db
		.prepare('insert into s (id, uid, t, ty, md, ln, b, cr) values (?, ?, ?, ?, ?, ?, ?, ?)')
		.bind(id, uid, t, 'x', 'm', 'm', b, Date.now())
		.run();

describe('search', () => {
	it('returns only the owner rows', async () => {
		const db = mem_db();
		await add(db, 's1', 'u1', 'mine', 'hydrogen is the lightest element');
		await add(db, 's2', 'u2', 'theirs', 'hydrogen again');
		const rows = await search(db, 'u1', 'hydrogen');
		expect(rows.map((r) => r.id)).toEqual(['s1']);
	});

	it('survives fts operator characters in the query', async () => {
		const db = mem_db();
		await add(db, 's1', 'u1', 'mine', 'foo appears here');
		const rows = await search(db, 'u1', 'foo "bar* NEAR');
		expect(rows.map((r) => r.id)).toEqual(['s1']);
	});

	it('escapes each term as a quoted literal', () => {
		expect(fts_escape('foo "bar* NEAR')).toBe('"foo" "bar*" "NEAR"');
	});

	it('returns nothing for an empty query without touching the db', async () => {
		const db = { prepare: () => { throw new Error('should not query'); } } as unknown as D1Database;
		expect(await search(db, 'u1', '   ')).toEqual([]);
	});

	it('returns a highlighted snippet', async () => {
		const db = mem_db();
		await add(db, 's1', 'u1', 'mine', 'hydrogen is the lightest element');
		const rows = await search(db, 'u1', 'hydrogen');
		expect(rows[0].sn).toContain('<b>');
	});
});
