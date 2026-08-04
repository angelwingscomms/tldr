import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { many } from '$lib/server/db';
import { cache_key } from '$lib/server/cache';

const calls = { model: 0 };
vi.mock('ai', () => ({
	streamText: () => {
		calls.model++;
		return { toTextStreamResponse: () => new Response('fresh summary'), text: Promise.resolve('fresh summary'), usage: Promise.resolve({ inputTokens: 1, outputTokens: 1 }) };
	}
}));
vi.mock('$lib/server/captions', () => ({ get_captions: async () => 'caption text' }));

import { POST } from '../+server';

const evt = (db: D1Database, body: unknown) =>
	({
		request: new Request('https://t.local/api/sum', { method: 'POST', body: JSON.stringify(body) }),
		locals: { db, user: { id: 'u1', n: 'ed', dv: false }, device_id: 'dev-1' },
		cookies: { get: () => undefined, set: () => {}, delete: () => {} },
		platform: { env: { SECRET: 'a-test-secret-at-least-32-bytes-long' }, ctx: { waitUntil: (p: Promise<unknown>) => p } },
		url: new URL('https://t.local/api/sum')
	}) as never;

const seed_user = (db: D1Database, id: string) =>
	db.prepare('insert into u (id, n, dv, cr) values (?, ?, 0, ?)').bind(id, id, Date.now()).run();

beforeEach(() => {
	calls.model = 0;
});

describe('summary cache', () => {
	it('serves a stored summary without calling the model, and copies the row', async () => {
		const db = mem_db();
		await seed_user(db, 'u1');
		await seed_user(db, 'u0');
		const src = 'https://a.com/post';
		const h = await cache_key(src, 'm-1', 'm');
		await db
			.prepare('insert into s (id, uid, h, t, src, ty, md, ln, b, cr) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
			.bind('seed', 'u0', h, 'stored', src, 'w', 'm-1', 'm', 'stored summary', Date.now())
			.run();

		const res = await POST(evt(db, { i: src, ln: 'm', pv: 'p1', md: 'm-1' }));
		expect(await res.text()).toBe('stored summary');
		expect(res.headers.get('x-tldr-cache')).toBe('1');
		expect(calls.model).toBe(0);

		const rows = await many<{ uid: string }>(db, 'select uid from s');
		expect(rows).toHaveLength(2);
		expect(rows.filter((r) => r.uid === 'u1')).toHaveLength(1);
	});

	it('never caches pasted text', async () => {
		const db = mem_db();
		await seed_user(db, 'u1');
		await POST(evt(db, { i: 'some pasted words', ln: 'm', pv: 'p1', md: 'm-1' }));
		await POST(evt(db, { i: 'some pasted words', ln: 'm', pv: 'p1', md: 'm-1' }));
		const rows = await many<{ h: string | null }>(db, 'select h from s');
		expect(rows).toHaveLength(2);
		expect(rows.every((r) => r.h === null)).toBe(true);
		expect(calls.model).toBe(2);
	});
});
