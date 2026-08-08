import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { add_credit } from '$lib/server/credits';
import { get_secret_key } from '$lib/server/paystack';

async function hmac_sha512_hex(secret: string, body: string): Promise<string> {
	const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body));
	return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const POST: RequestHandler = async (event) => {
	const env = (event.platform?.env ?? {}) as Record<string, string>;
	const body = await event.request.text();
	const sig = event.request.headers.get('x-paystack-signature') ?? '';
	const want = await hmac_sha512_hex(await get_secret_key(env), body);
	if (sig !== want) return json({ e: 'bad_sig' }, { status: 401 });
	const p = JSON.parse(body) as {
		event?: string;
		data?: { amount?: number; reference?: string; metadata?: { uid?: string } };
	};
	if (p.event === 'charge.success' && p.data?.amount && p.data.reference && p.data.metadata?.uid) {
		await add_credit(event.locals.db, p.data.metadata.uid, p.data.amount, p.data.reference);
	}
	return json({ ok: 1 });
};