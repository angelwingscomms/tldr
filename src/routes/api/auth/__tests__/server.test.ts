import { describe, it, expect } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { one } from '$lib/server/db';
import { get_or_create_device_user } from '$lib/server/device';
import { POST as signup } from '../signup/+server';
import { POST as login } from '../login/+server';

const evt = (db: D1Database, body: unknown, user: { id: string; n: string; dv?: boolean } | null = null) =>
	({
		request: new Request('https://t.local/api/auth', { method: 'POST', body: JSON.stringify(body) }),
		locals: { db, user, device_id: 'dev-1' },
		cookies: { set: () => {}, get: () => undefined, delete: () => {} },
		platform: { env: { SECRET: 'a-test-secret-at-least-32-bytes-long' } },
		url: new URL('https://t.local/api/auth')
	}) as never;

describe('auth routes', () => {
	it('upgrades a device user in place, keeping the same id', async () => {
		const db = mem_db();
		const guest = await get_or_create_device_user(db, 'dev-1');
		const res = await signup(evt(db, { e: 'a@b.com', p: 'longenough' }, { id: guest.id, n: guest.n, dv: true }));
		expect(res.status).toBe(200);
		const row = await one<{ id: string; dv: number }>(db, 'select id, dv from u where e = ?', 'a@b.com');
		expect(row?.id).toBe(guest.id);
		expect(row?.dv).toBe(0);
	});

	it('409s on a taken email', async () => {
		const db = mem_db();
		await signup(evt(db, { e: 'a@b.com', p: 'longenough' }));
		const res = await signup(evt(db, { e: 'a@b.com', p: 'longenough' }));
		expect(res.status).toBe(409);
	});

	it('400s a password under 8 chars', async () => {
		const db = mem_db();
		const res = await signup(evt(db, { e: 'a@b.com', p: 'short' }));
		expect(res.status).toBe(400);
	});

	it('gives an identical 401 for a bad email and a bad password', async () => {
		const db = mem_db();
		await signup(evt(db, { e: 'a@b.com', p: 'longenough' }));
		const bad_pw = await login(evt(db, { e: 'a@b.com', p: 'wrongwrong' }));
		const bad_email = await login(evt(db, { e: 'nobody@b.com', p: 'longenough' }));
		expect(bad_pw.status).toBe(401);
		expect(bad_email.status).toBe(401);
		expect(await bad_pw.clone().text()).toBe(await bad_email.clone().text());
	});
});
