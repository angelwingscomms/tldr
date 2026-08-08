export function site_url(path) {
	return `https://tldr.apexlinks.org${path}`;
}

export function slug(s) {
	return (
		s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'summary'
	);
}

export function pick_input(k, info, page) {
	if (k === 'sum_sel' && info.selectionText) return { i: info.selectionText, ty: 'x' };
	if (k === 'sum_link' && info.linkUrl) return { i: info.linkUrl, ty: 'w' };
	if (k === 'sum_media' && info.srcUrl) return { i: info.srcUrl, ty: 'a' };
	if (k === 'sum_page' && page) return { i: page.url, ty: 'w' };
	return null;
}

export function text_from_doc(doc) {
	doc.querySelectorAll('script, nav, noscript, footer, iframe, [hidden]').forEach((n) => n.remove());
	const root = doc.querySelector('article') ?? doc.body;
	if (!root) return '';
	const raw = root.innerText || root.textContent || '';
	return raw.replace(/\s+/g, ' ').trim().slice(0, 400_000);
}

export async function captions_from_player(player, fetcher = fetch) {
	const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
	if (!tracks?.length) return null;
	const track = tracks.find((t) => t.kind !== 'asr') ?? tracks[0];
	const res = await fetcher(track.baseUrl);
	const json = typeof res.json === 'function' ? await res.json() : res;
	return (json.events ?? [])
		.map((e) => (e.segs ?? []).map((s) => s.utf8 ?? '').join(''))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
}

export function resolve_media(el) {
	const src = el?.currentSrc || el?.src || '';
	if (src.startsWith('blob:')) return null;
	return src || null;
}