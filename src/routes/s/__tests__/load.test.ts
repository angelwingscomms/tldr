import { describe, it, expect } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { load } from '../[id]/+page.server';

const add = (db: D1Database, id: string, uid: string, pub: number) =>
	db
		.prepare('insert into s (id, uid, t, ty, md, ln, b, pub, cr) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
		.bind(id, uid, 't', 'x', 'm', 'm', 'body', pub, Date.now())
		.run();

const evt = (db: D1Database, id: string, uid: string | null) =>
	({ params: { id }, locals: { db, user: uid ? { id: uid, n: uid } : null } }) as never;

describe('/s/[id] load', () => {
	it('404s a missing id', async () => {
		await expect(load(evt(mem_db(), 'nope', 'u1'))).rejects.toMatchObject({ status: 404 });
	});

	it('404s another user private row', async () => {
		const db = mem_db();
		await add(db, 's1', 'u2', 0);
		await expect(load(evt(db, 's1', 'u1'))).rejects.toMatchObject({ status: 404 });
	});

	it('serves a public row to anyone', async () => {
		const db = mem_db();
		await add(db, 's1', 'u2', 1);
		const out = await load(evt(db, 's1', null));
		expect(out.r.id).toBe('s1');
	});
});
