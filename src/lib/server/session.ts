import { get_secret, type SecretVal } from './env';

export type SessionUser = { id: string; n: string; dv?: boolean };

const b64u = (b: ArrayBuffer) =>
	btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function key(secret: string) {
	return crypto.subtle.importKey('raw', new TextEncoder().encode(secret).slice(0, 32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
export async function encode_session(sv: SecretVal, u: SessionUser): Promise<string> {
	const body = btoa(JSON.stringify(u)).replace(/=+$/, '');
	const sig = b64u(await crypto.subtle.sign('HMAC', await key(await get_secret(sv)), new TextEncoder().encode(body)));
	return `${body}.${sig}`;
}
export async function decode_session(sv: SecretVal, t: string): Promise<SessionUser | null> {
	const [body, sig] = t.split('.');
	if (!body || !sig) return null;
	const want = b64u(await crypto.subtle.sign('HMAC', await key(await get_secret(sv)), new TextEncoder().encode(body)));
	if (sig !== want) return null;
	try { return JSON.parse(atob(body)) as SessionUser; } catch { return null; }
}
