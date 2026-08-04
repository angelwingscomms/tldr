import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { many } from '$lib/server/db';
import { get_or_create_device_user } from '$lib/server/device';
import { GET } from '../+server';

const userinfo = { sub: 'g-1', email: 'a@b.com', name: 'ed', picture: 'https://p/x.png' };

const evt = (db: D1Database, q: string, state = 'st', user: { id: string; n: string; dv?: boolean } | null = null) =>
	({
		url: new URL('https://t.local/google?' + q),
		locals: { db, user, device_id: 'dev-1' },
		cookies: {
			get: (k: string) => (k === 'oauth_state' ? state : k === 'oauth_verifier' ? 'vf' : undefined),
			set: () => {},
			delete: () => {}
		},
		platform: { env: { SECRET: 'a-test-secret-at-least-32-bytes-long', GOOGLE_ID: 'id', GOOGLE_SECRET: 'sc' } }
	}) as never;

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(JSON.stringify(userinfo), { headers: { 'content-type': 'application/json' } }))
	);
});

describe('google callback', () => {
	it('400s when the state does not match the cookie', async () => {
		const db = mem_db();
		const res = await GET(evt(db, 'code=c&state=other', 'st'));
		expect(res.status).toBe(400);
	});

	it('upgrades the device row in place instead of making a second one', async () => {
		const db = mem_db();
		const guest = await get_or_create_device_user(db, 'dev-1');
		await GET(evt(db, 'code=c&state=st', 'st', { id: guest.id, n: guest.n, dv: true }));
		const rows = await many<{ id: string; dv: number; g: string }>(db, 'select id, dv, g from u');
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(guest.id);
		expect(rows[0].dv).toBe(0);
		expect(rows[0].g).toBe('g-1');
	});

	it('creates exactly one row when there is no local user', async () => {
		const db = mem_db();
		await GET(evt(db, 'code=c&state=st'));
		expect(await many(db, 'select id from u')).toHaveLength(1);
	});

	it('logs into the existing row on a second callback with the same sub', async () => {
		const db = mem_db();
		await GET(evt(db, 'code=c&state=st'));
		await GET(evt(db, 'code=c&state=st'));
		expect(await many(db, 'select id from u')).toHaveLength(1);
	});

	it('400s a profile with no email', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sub: 'g-2' }), { headers: { 'content-type': 'application/json' } })));
		const db = mem_db();
		const res = await GET(evt(db, 'code=c&state=st'));
		expect(res.status).toBe(400);
	});
});
