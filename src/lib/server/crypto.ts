const b64u = (b: ArrayBuffer) =>
	btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) =>
	Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function mk(master: string) {
	const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master));
	return crypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function enc(master: string, plain: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, await mk(master), new TextEncoder().encode(plain).buffer as ArrayBuffer);
	return `${b64u(iv.buffer)}.${b64u(new Uint8Array(ct).buffer)}`;
}
export async function dec(master: string, blob: string): Promise<string> {
	const [iv, ct] = blob.split('.');
	const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv).buffer as ArrayBuffer }, await mk(master), unb64u(ct).buffer as ArrayBuffer);
	return new TextDecoder().decode(pt);
}
