import { describe, it, expect } from 'vitest';
import { mem_db } from '$lib/server/__tests__/mem_db';
import { one, many } from '$lib/server/db';
import { POST } from '../+server';

const KEY = 'sk_test_1';

async function sign(body: string) {
	const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(KEY), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body));
	return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const event = (ev: string, ref: string) =>
	JSON.stringify({ event: ev, data: { amount: 50_000, reference: ref, metadata: { uid: 'u1' } } });

const evt = (db: D1Database, body: string, sig: string) =>
	({
		request: new Request('https://t.local/api/webhooks/paystack', { method: 'POST', body, headers: { 'x-paystack-signature': sig } }),
		locals: { db },
		platform: { env: { PAYSTACK_SECRET_KEY_TEST: KEY, PAYSTACK_TEST: '.' } }
	}) as never;

const seed = (db: D1Database) => db.prepare('insert into u (id, n, dv, bal, cr) values (?, ?, 0, 0, ?)').bind('u1', 'ed', Date.now()).run();
const bal = async (db: D1Database) => (await one<{ bal: number }>(db, 'select bal from u where id = ?', 'u1'))!.bal;

describe('paystack webhook', () => {
	it('401s a bad signature and changes nothing', async () => {
		const db = mem_db();
		await seed(db);
		const res = await POST(evt(db, event('charge.success', 'r-1'), 'deadbeef'));
		expect(res.status).toBe(401);
		expect(await bal(db)).toBe(0);
	});

	it('credits a valid charge.success', async () => {
		const db = mem_db();
		await seed(db);
		const body = event('charge.success', 'r-1');
		await POST(evt(db, body, await sign(body)));
		expect(await bal(db)).toBe(50_000);
		expect(await many(db, 'select id from ce')).toHaveLength(1);
	});

	it('credits a repeated delivery only once', async () => {
		const db = mem_db();
		await seed(db);
		const body = event('charge.success', 'r-1');
		const sig = await sign(body);
		await POST(evt(db, body, sig));
		await POST(evt(db, body, sig));
		expect(await bal(db)).toBe(50_000);
		expect(await many(db, 'select id from ce')).toHaveLength(1);
	});

	it('200s an event it ignores, without crediting', async () => {
		const db = mem_db();
		await seed(db);
		const body = event('charge.failed', 'r-2');
		const res = await POST(evt(db, body, await sign(body)));
		expect(res.status).toBe(200);
		expect(await bal(db)).toBe(0);
	});
});
