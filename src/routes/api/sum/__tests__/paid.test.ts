import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { one, many } from '$lib/server/db';
import { DAILY_GRANT } from '$lib/server/credits';

const behaviour = { throws: false };

vi.mock('ai', () => ({
	streamText: (o: { onFinish?: (x: unknown) => unknown }) => {
		if (behaviour.throws) throw new Error('model exploded');
		void o.onFinish?.({ usage: { inputTokens: 1000, outputTokens: 200 } });
		return { toTextStreamResponse: () => new Response('summary'), text: Promise.resolve('summary'), usage: Promise.resolve({ inputTokens: 1000, outputTokens: 200 }) };
	}
}));

import { POST } from '../+server';

const DAY = 86_400_000;

const user = (db: D1Database, id: string, bal: number, dv: 0 | 1, lg: number) =>
	db.prepare('insert into u (id, n, dv, bal, lg, cr) values (?, ?, ?, ?, ?, ?)').bind(id, id, dv, bal, lg, Date.now()).run();

const bal_of = async (db: D1Database, id: string) => (await one<{ bal: number }>(db, 'select bal from u where id = ?', id))!.bal;

const evt = (db: D1Database, uid: string, dv: boolean, body: Record<string, unknown>) =>
	({
		request: new Request('https://t.local/api/sum', { method: 'POST', body: JSON.stringify({ i: 'pasted text', ln: 'm', ...body }) }),
		locals: { db, user: { id: uid, n: uid, dv }, device_id: 'dev-1' },
		cookies: { get: () => undefined, set: () => {}, delete: () => {} },
		platform: {
			env: { SECRET: 'a-test-secret-at-least-32-bytes-long', HOUSE_BASE_URL: 'https://h/v1', HOUSE_KEY: 'k', HOUSE_MODEL: 'm' },
			ctx: { waitUntil: (p: Promise<unknown>) => p }
		},
		url: new URL('https://t.local/api/sum')
	}) as never;

beforeEach(() => {
	behaviour.throws = false;
});

describe('paid tier', () => {
	it('grants and proceeds for a stale lg', async () => {
		const db = mem_db();
		await user(db, 'u1', 0, 0, Date.now() - DAY - 1000);
		const res = await POST(evt(db, 'u1', false, {}));
		expect(res.status).toBe(200);
		expect(await bal_of(db, 'u1')).toBeLessThan(DAILY_GRANT);
	});

	it('402s with the balance when there is nothing left today', async () => {
		const db = mem_db();
		await user(db, 'u1', 0, 0, Date.now());
		const res = await POST(evt(db, 'u1', false, {}));
		expect(res.status).toBe(402);
		expect(await res.json()).toMatchObject({ e: 'insufficient_credits', bal: 0 });
	});

	it('refunds the unused part of the hold', async () => {
		const db = mem_db();
		await user(db, 'u1', 100_000, 0, Date.now());
		await POST(evt(db, 'u1', false, {}));
		const events = await many<{ k: string }>(db, 'select k from ce where uid = ?', 'u1');
		expect(events.some((e) => e.k === 'refund')).toBe(true);
		expect(await bal_of(db, 'u1')).toBeGreaterThan(0);
		expect(await bal_of(db, 'u1')).toBeLessThan(100_000);
	});

	it('refunds the whole hold when the model throws', async () => {
		const db = mem_db();
		await user(db, 'u1', 100_000, 0, Date.now());
		behaviour.throws = true;
		await POST(evt(db, 'u1', false, {})).catch(() => {});
		expect(await bal_of(db, 'u1')).toBe(100_000);
	});

	it('never charges a device-only guest, and points them at settings', async () => {
		const db = mem_db();
		await user(db, 'u1', 0, 1, 0);
		const res = await POST(evt(db, 'u1', true, {}));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ e: 'no_provider' });
		expect(await bal_of(db, 'u1')).toBe(0);
	});

	it('never touches the balance when the request brings its own key', async () => {
		const db = mem_db();
		await user(db, 'u1', 100_000, 0, Date.now());
		await POST(evt(db, 'u1', false, { pv: 'p1', md: 'm-1' }));
		expect(await bal_of(db, 'u1')).toBe(100_000);
	});
});
