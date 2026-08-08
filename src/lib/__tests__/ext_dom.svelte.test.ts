import { describe, it, expect, vi } from 'vitest';
import { text_from_doc, captions_from_player, resolve_media } from '../../../extension/lib.js';

const doc_of = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('text_from_doc', () => {
	it('keeps the article and drops chrome', () => {
		const d = doc_of('<script>trackingpixel</script><nav>navlink</nav><article>hydrogen is light</article>');
		const out = text_from_doc(d);
		expect(out).toContain('hydrogen is light');
		expect(out).not.toContain('trackingpixel');
		expect(out).not.toContain('navlink');
	});

	it('collapses whitespace runs', () => {
		expect(text_from_doc(doc_of('<p>a   \n\n  b</p>'))).toBe('a b');
	});

	it('truncates at 400k', () => {
		expect(text_from_doc(doc_of('<p>' + 'a'.repeat(500_000) + '</p>'))).toHaveLength(400_000);
	});
});

describe('captions_from_player', () => {
	const player = (list: unknown[]) => ({ captions: { playerCaptionsTracklistRenderer: { captionTracks: list } } });
	const manual = { languageCode: 'en', baseUrl: 'https://c/manual' };
	const asr = { languageCode: 'en', kind: 'asr', baseUrl: 'https://c/asr' };
	const json3 = { events: [{ segs: [{ utf8: 'hello ' }] }, { segs: [{ utf8: 'world' }] }] };

	it('joins the segments', async () => {
		const fetcher = vi.fn(async () => json3);
		expect(await captions_from_player(player([manual]), fetcher)).toBe('hello world');
	});

	it('prefers the manual track over asr', async () => {
		const fetcher = vi.fn(async () => json3);
		await captions_from_player(player([asr, manual]), fetcher);
		expect(String(fetcher.mock.calls[0][0])).toContain('/manual');
	});

	it('returns null when there are no tracks', async () => {
		expect(await captions_from_player({}, vi.fn())).toBeNull();
	});
});

describe('resolve_media', () => {
	it('takes a real src', () => {
		expect(resolve_media({ currentSrc: 'https://a.com/a.mp3' })).toBe('https://a.com/a.mp3');
	});

	it('refuses a blob url', () => {
		expect(resolve_media({ currentSrc: 'blob:https://a.com/1234' })).toBeNull();
	});
});
