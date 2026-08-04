import { describe, it, expect } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { one } from '$lib/server/db';
import { POST } from '../[id]/pub/+server';
import { load } from '../../../s/[id]/+page.server';

const add = (db: D1Database, id: string, uid: string) =>
	db
		.prepare('insert into s (id, uid, t, ty, md, ln, b, pub, cr) values (?, ?, ?, ?, ?, ?, ?, 0, ?)')
		.bind(id, uid, 't', 'x', 'm', 'm', 'body', Date.now())
		.run();

const evt = (db: D1Database, id: string, uid: string, v: 0 | 1) =>
	({
		params: { id },
		locals: { db, user: { id: uid, n: uid } },
		request: new Request('https://t.local/x', { method: 'POST', body: JSON.stringify({ v }) })
	}) as never;

const view = (db: D1Database, id: string, uid: string | null) =>
	({ params: { id }, locals: { db, user: uid ? { id: uid, n: uid } : null } }) as never;

describe('share toggle', () => {
	it('flips pub on for the owner', async () => {
		const db = mem_db();
		await add(db, 's1', 'u1');
		const res = await POST(evt(db, 's1', 'u1', 1));
		expect(res.status).toBe(200);
		expect((await one<{ pub: number }>(db, 'select pub from s where id = ?', 's1'))?.pub).toBe(1);
	});

	it('404s a non-owner and changes nothing', async () => {
		const db = mem_db();
		await add(db, 's1', 'u1');
		const res = await POST(evt(db, 's1', 'u2', 1));
		expect(res.status).toBe(404);
		expect((await one<{ pub: number }>(db, 'select pub from s where id = ?', 's1'))?.pub).toBe(0);
	});

	it('opens and closes the public page', async () => {
		const db = mem_db();
		await add(db, 's1', 'u1');
		await POST(evt(db, 's1', 'u1', 1));
		expect((await load(view(db, 's1', null))).r.id).toBe('s1');
		await POST(evt(db, 's1', 'u1', 0));
		await expect(load(view(db, 's1', null))).rejects.toMatchObject({ status: 404 });
	});
});
