import { describe, it, expect } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { POST as mint } from '../token/+server';
import { POST as adopt } from '../adopt/+server';

const SECRET = 'a-test-secret-at-least-32-bytes-long';

const evt = (db: D1Database, user: { id: string; n: string } | null, body: unknown = {}) => {
	const set: Record<string, string> = {};
	return {
		e: {
			request: new Request('https://t.local/api/auth', { method: 'POST', body: JSON.stringify(body) }),
			locals: { db, user, device_id: 'dev-1' },
			cookies: { set: (k: string, v: string) => (set[k] = v), get: () => undefined, delete: () => {} },
			platform: { env: { SECRET } },
			url: new URL('https://t.local/api/auth')
		} as never,
		set
	};
};

describe('extension token', () => {
	it('401s without a session', async () => {
		const res = await mint(evt(mem_db(), null).e);
		expect(res.status).toBe(401);
	});

	it('round-trips to the same uid', async () => {
		const db = mem_db();
		const res = await mint(evt(db, { id: 'u1', n: 'ed' }).e);
		const { t } = (await res.json()) as { t: string };
		const a = evt(db, null, { t });
		const ok = await adopt(a.e);
		expect(ok.status).toBe(200);
		expect(a.set.session).toBeTruthy();
	});

	it('401s a tampered token and sets no cookie', async () => {
		const db = mem_db();
		const res = await mint(evt(db, { id: 'u1', n: 'ed' }).e);
		const { t } = (await res.json()) as { t: string };
		const a = evt(db, null, { t: 'x' + t.slice(1) });
		expect((await adopt(a.e)).status).toBe(401);
		expect(a.set.session).toBeUndefined();
	});
});
