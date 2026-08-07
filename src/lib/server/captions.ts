type Track = { languageCode?: string; kind?: string; baseUrl?: string };

async function youtube_captions(url: string): Promise<string | null> {
	const page = await (await fetch(url)).text();
	const m = /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/.exec(page);
	if (!m) return null;
	let data: { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Track[] } } };
	try {
		data = JSON.parse(m[1]);
	} catch {
		return null;
	}
	const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
	if (!tracks.length) return null;
	const track = tracks.find((t) => t.languageCode?.startsWith('en') && t.kind !== 'asr') ?? tracks[0];
	if (!track?.baseUrl) return null;
	const cap = (await (await fetch(track.baseUrl + (track.baseUrl.includes('?') ? '&' : '?') + 'fmt=json3')).json()) as {
		events?: Array<{ segs?: Array<{ utf8?: string }> }>;
	};
	const events = cap?.events ?? [];
	return events.map((e) => (e.segs ?? []).map((s) => s.utf8 ?? '').join('')).join('');
}

async function vimeo_captions(id: string): Promise<string | null> {
	const cfg = (await (await fetch(`https://player.vimeo.com/video/${id}/config`)).json()) as {
		request?: { text_tracks?: Array<{ url?: string }> };
	};
	const t = cfg?.request?.text_tracks?.[0]?.url;
	if (!t) return null;
	const vtt = await (await fetch(t)).text();
	return vtt
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !l.includes('-->') && !/^\d+$/.test(l))
		.join('\n');
}

export async function get_captions(url: string): Promise<string | null> {
	try {
		const u = new URL(url);
		const h = u.hostname.replace(/^www\./, '').toLowerCase();
		if (h === 'youtube.com' || h === 'youtu.be') {
			return await youtube_captions(u.href);
		}
		if (h === 'vimeo.com') {
			return await vimeo_captions(u.pathname.split('/').pop() ?? '');
		}
		return null;
	} catch {
		return null;
	}
}
