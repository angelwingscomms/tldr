import { get_secret, type SecretVal } from './env';

export type SessionUser = { id: string; n: string; dv?: boolean; exp?: number };

const b64u = (b: ArrayBuffer | Uint8Array) =>
	btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const unb64u = (s: string) =>
	Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function key(secret: string) {
	return crypto.subtle.importKey('raw', new TextEncoder().encode(secret).slice(0, 32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
export async function encode_session(sv: SecretVal, u: SessionUser): Promise<string> {
	const body = b64u(new TextEncoder().encode(JSON.stringify(u)));
	const sig = b64u(await crypto.subtle.sign('HMAC', await key(await get_secret(sv)), new TextEncoder().encode(body)));
	return `${body}.${sig}`;
}
export async function decode_session(sv: SecretVal, t: string): Promise<SessionUser | null> {
	const [body, sig] = t.split('.');
	if (!body || !sig) return null;
	const want = b64u(await crypto.subtle.sign('HMAC', await key(await get_secret(sv)), new TextEncoder().encode(body)));
	if (sig !== want) return null;
	try {
		const u = JSON.parse(new TextDecoder().decode(unb64u(body))) as SessionUser;
		return u.exp && u.exp < Date.now() ? null : u;
	} catch { return null; }
}
