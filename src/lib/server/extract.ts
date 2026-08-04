export type Input = { ty: 'w' | 'x' | 'v' | 'a'; t: string; text?: string; media?: string; src?: string };

const MEDIA_EXT = /\.(mp3|m4a|wav|ogg|opus|flac|mp4|webm|mov|mkv)$/i;
const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|opus|flac)$/i;
const MEDIA_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'soundcloud.com', 'open.spotify.com', 'twitter.com', 'x.com', 'tiktok.com', 'instagram.com'];
const SKIP_TAGS = ['script', 'style', 'noscript', 'nav', 'footer', 'header', 'aside', 'form'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export function classify(raw: string): 'url' | 'text' {
	const s = raw.trim();
	if (!/^https?:\/\//i.test(s) || /\s/.test(s)) return 'text';
	try {
		new URL(s);
		return 'url';
	} catch {
		return 'text';
	}
}

export function is_media_host(url: string): boolean {
	const h = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
	return MEDIA_HOSTS.some((d) => h === d || h.endsWith('.' + d));
}

export async function cobalt_resolve(base: string, url: string): Promise<string> {
	const res = await fetch(base, {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json' },
		body: JSON.stringify({ url })
	});
	if (!res.ok) throw new Error('cobalt_failed');
	const data = await res.json() as { status?: string; url?: string };
	if ((data.status === 'redirect' || data.status === 'tunnel') && typeof data.url === 'string') {
		return data.url;
	}
	throw new Error('cobalt_failed');
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

async function html_rewrite(html: string): Promise<{ t: string; text: string }> {
	if (typeof HTMLRewriter !== 'undefined') {
		let title = '';
		const parts: string[] = [];
		const r = new HTMLRewriter();
		for (const tag of SKIP_TAGS) {
			r.on(tag, { element: (el) => { el.remove(); } });
		}
		r.on('title', { text: (t) => { title += t.text; } });
		r.on('*', { text: (t) => { parts.push(t.text); } });
		await r.transform(new Response(html)).text();
		return { t: collapse(title), text: collapse(parts.join(' ')).slice(0, 400_000) };
	}
	const stripped = html
		.replace(new RegExp(`<(?:${SKIP_TAGS.join('|')})[^>]*>[\\s\\S]*?<\\/(?:${SKIP_TAGS.join('|')})>`, 'gi'), ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
	const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '';
	return { t: collapse(title), text: collapse(stripped).slice(0, 400_000) };
}

export async function extract_page(url: string, c: { COBALT_URL?: string } = {}): Promise<Input> {
	if (MEDIA_EXT.test(url)) {
		return { ty: AUDIO_EXT.test(url) ? 'a' : 'v', t: url.split('/').pop() ?? url, media: url, src: url };
	}
	if (is_media_host(url)) {
		if (c.COBALT_URL) {
			const media = await cobalt_resolve(c.COBALT_URL, url);
			return { ty: 'v', t: url, media, src: url };
		}
		throw Object.assign(new Error('needs_extension'), { code: 'needs_extension' });
	}
	const res = await fetch(url, { headers: { 'user-agent': UA } });
	const ct = (res.headers.get('content-type') ?? '').toLowerCase();
	if (ct.startsWith('audio/')) {
		return { ty: 'a', t: url.split('/').pop() ?? url, media: url, src: url };
	}
	if (ct.startsWith('video/')) {
		return { ty: 'v', t: url.split('/').pop() ?? url, media: url, src: url };
	}
	if (ct.includes('html')) {
		const html = await res.text();
		const { t, text } = await html_rewrite(html);
		return { ty: 'w', t, text, src: url };
	}
	throw Object.assign(new Error(`unsupported content-type: ${ct || 'unknown'}`), { status: 415 });
}
