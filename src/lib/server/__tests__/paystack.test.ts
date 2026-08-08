import { describe, it, expect, vi } from 'vitest';
import { paystack_init, get_secret_key } from '$lib/server/paystack';

const env = (test: string) => ({
	PAYSTACK_SECRET_KEY_TEST: 'sk_test_1',
	PAYSTACK_SECRET_KEY_LIVE: 'sk_live_1',
	PAYSTACK_TEST: test,
	PAYSTACK_BASE_URL: 'https://api.paystack.co'
});

describe('paystack', () => {
	it('posts the amount and reference', async () => {
		const f = vi.fn(async () => new Response(JSON.stringify({ status: true, data: { reference: 'r-1' } })));
		vi.stubGlobal('fetch', f);
		await paystack_init(env('.'), 'a@b.com', 50_000, 'r-1', 'https://t.local/settings', { uid: 'u1' });
		const body = JSON.parse(String((f.mock.calls[0][1] as RequestInit).body));
		expect(body.amount).toBe(50_000);
		expect(body.reference).toBe('r-1');
		expect(body.metadata.uid).toBe('u1');
	});

	it('picks the test key when PAYSTACK_TEST is set', async () => {
		expect(await get_secret_key(env('.'))).toBe('sk_test_1');
	});

	it('picks the live key when it is not', async () => {
		expect(await get_secret_key(env(''))).toBe('sk_live_1');
	});
});
