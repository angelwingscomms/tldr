import { describe, it, expect, vi } from 'vitest';
import { get_captions } from '$lib/server/captions';

const json3 = { events: [{ segs: [{ utf8: 'hello ' }, { utf8: 'there' }] }, { segs: [{ utf8: ' world' }] }] };

const tracks = (list: unknown[]) =>
	'<html>var ytInitialPlayerResponse = ' +
	JSON.stringify({ captions: { playerCaptionsTracklistRenderer: { captionTracks: list } } }) +
	';</html>';

const manual = { languageCode: 'en', baseUrl: 'https://c/manual' };
const asr = { languageCode: 'en', kind: 'asr', baseUrl: 'https://c/asr' };

const vtt = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nspoken words here\n\n2\n00:00:04.000 --> 00:00:06.000\nand more\n';

describe('get_captions', () => {
	it('joins json3 segments in order', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (u: string) => new Response(String(u).includes('/manual') ? JSON.stringify(json3) : tracks([manual])))
		);
		expect(await get_captions('https://www.youtube.com/watch?v=1')).toBe('hello there world');
	});

	it('prefers the manual english track over the asr one', async () => {
		const f = vi.fn(async (u: string) => new Response(String(u).includes('/manual') ? JSON.stringify(json3) : tracks([asr, manual])));
		vi.stubGlobal('fetch', f);
		await get_captions('https://www.youtube.com/watch?v=1');
		expect(f.mock.calls.some((c) => String(c[0]).includes('/manual'))).toBe(true);
		expect(f.mock.calls.some((c) => String(c[0]).includes('/asr'))).toBe(false);
	});

	it('returns null when there are no caption tracks', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>nothing here</html>')));
		expect(await get_captions('https://www.youtube.com/watch?v=1')).toBeNull();
	});

	it('returns null instead of throwing when the fetch fails', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('blocked'); }));
		expect(await get_captions('https://www.youtube.com/watch?v=1')).toBeNull();
	});

	it('strips vtt cue numbers and timestamps', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (u: string) =>
				String(u).includes('/config')
					? new Response(JSON.stringify({ request: { text_tracks: [{ url: 'https://v/track.vtt' }] } }))
					: new Response(vtt)
			)
		);
		const out = await get_captions('https://vimeo.com/12345');
		expect(out).toContain('spoken words here');
		expect(out).toContain('and more');
		expect(out).not.toContain('-->');
		expect(out).not.toMatch(/^\d+$/m);
	});

	it('does not even fetch for an unsupported host', async () => {
		const f = vi.fn();
		vi.stubGlobal('fetch', f);
		expect(await get_captions('https://example.com/x')).toBeNull();
		expect(f).not.toHaveBeenCalled();
	});
});
