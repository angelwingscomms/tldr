import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { many } from '$lib/server/db';

const calls = { model: 0 };

vi.mock('ai', () => ({
	streamText: (...a: unknown[]) => {
		calls.model++;
		return {
			toTextStreamResponse: () => new Response('the summary'),
			text: Promise.resolve('the summary'),
			usage: Promise.resolve({ inputTokens: 10, outputTokens: 5 })
		};
	}
}));

const transcribe_spy = vi.fn(async () => 'spoken words');
vi.mock('$lib/server/stt', () => ({ transcribe: transcribe_spy }));

const captions_spy = vi.fn(async () => null as string | null);
vi.mock('$lib/server/captions', () => ({ get_captions: captions_spy }));

import { POST } from '../+server';

const evt = (db: D1Database, body: unknown) =>
	({
		request: new Request('https://t.local/api/sum', { method: 'POST', body: JSON.stringify(body) }),
		locals: { db, user: { id: 'u1', n: 'ed', dv: false }, device_id: 'dev-1' },
		cookies: { get: () => undefined, set: () => {}, delete: () => {} },
		platform: { env: { SECRET: 'a-test-secret-at-least-32-bytes-long' }, ctx: { waitUntil: (p: Promise<unknown>) => p } },
		url: new URL('https://t.local/api/sum')
	}) as never;

const seed_user = (db: D1Database) =>
	db.prepare('insert into u (id, n, dv, cr) values (?, ?, 0, ?)').bind('u1', 'ed', Date.now()).run();

beforeEach(() => {
	calls.model = 0;
	transcribe_spy.mockClear();
	captions_spy.mockClear();
	vi.stubGlobal('fetch', vi.fn(async () => new Response('should not be called')));
});

describe('POST /api/sum', () => {
	it('sends pasted text straight to the model with no fetch', async () => {
		const db = mem_db();
		await seed_user(db);
		await POST(evt(db, { i: 'a long pasted essay', ln: 'm', pv: 'p1', md: 'm-1' }));
		expect(calls.model).toBe(1);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('never transcribes when captions exist', async () => {
		captions_spy.mockResolvedValueOnce('caption text');
		const db = mem_db();
		await seed_user(db);
		await POST(evt(db, { i: 'https://www.youtube.com/watch?v=1', ln: 'm', pv: 'p1', md: 'm-1' }));
		expect(transcribe_spy).not.toHaveBeenCalled();
	});

	it('transcribes exactly once when captions are missing', async () => {
		const db = mem_db();
		await seed_user(db);
		await POST(evt(db, { i: 'https://a.com/x.mp3', ln: 'm', pv: 'p1', md: 'm-1' }));
		expect(transcribe_spy).toHaveBeenCalledTimes(1);
	});

	it('writes exactly one row owned by the session user', async () => {
		const db = mem_db();
		await seed_user(db);
		await POST(evt(db, { i: 'pasted', ln: 'm', pv: 'p1', md: 'm-1' }));
		const rows = await many<{ uid: string; b: string }>(db, 'select uid, b from s');
		expect(rows).toHaveLength(1);
		expect(rows[0].uid).toBe('u1');
		expect(rows[0].b).toBe('the summary');
	});

	it('surfaces needs_extension as 422', async () => {
		const db = mem_db();
		await seed_user(db);
		const res = await POST(evt(db, { i: 'https://www.tiktok.com/@a/video/1', ln: 'm', pv: 'p1', md: 'm-1' }));
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ e: 'needs_extension' });
	});

	it('chunks only on overflow', async () => {
		const db = mem_db();
		await seed_user(db);
		await POST(evt(db, { i: 'a'.repeat(100_000), ln: 'm', pv: 'p1', md: 'm-1' }));
		expect(calls.model).toBe(1);
		calls.model = 0;
		await POST(evt(db, { i: 'a'.repeat(800_000), ln: 'm', pv: 'p1', md: 'm-1' }));
		expect(calls.model).toBeGreaterThan(1);
	});
});
