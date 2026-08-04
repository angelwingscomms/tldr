const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));

async function derive(pw: string, salt: Uint8Array<ArrayBuffer>) {
	const ik = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
	return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, ik, 256);
}

export async function hash_pw(pw: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const bits = await derive(pw, salt);
	return `${hex(salt)}$${hex(new Uint8Array(bits))}`;
}
export async function verify_pw(pw: string, stored: string): Promise<boolean> {
	const [s, h] = stored.split('$');
	if (!s || !h) return false;
	return hex(new Uint8Array(await derive(pw, unhex(s)))) === h;
}
