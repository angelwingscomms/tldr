async function sha256_hex(s: string): Promise<string> {
	const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
	return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function cache_key(src: string | null, md: string, ln: string): Promise<string | null> {
	if (!src) return null;
	let u: URL;
	try {
		u = new URL(src);
	} catch {
		return null;
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
	return sha256_hex(`${u.origin}${u.pathname}${u.search}|${md}|${ln}`);
}
