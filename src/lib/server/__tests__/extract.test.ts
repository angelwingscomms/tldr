import { describe, it, expect, vi } from 'vitest';
import { classify, extract_page, is_media_host } from '$lib/server/extract';

const html =
	'<html><head><title>The Real Title</title></head><body>' +
	'<script>var trackingpixel = 1;</script><nav>navlink homelink</nav>' +
	'<article>hydrogen is the lightest element</article></body></html>';

const res = (body: string, ct: string, extra: Record<string, string> = {}) =>
	new Response(body, { headers: { 'content-type': ct, ...extra } });

describe('classify', () => {
	it('reads a bare url as a url', () => {
		expect(classify('https://a.com/b')).toBe('url');
	});
	it('reads prose as text', () => {
		expect(classify('hello world')).toBe('text');
	});
	it('reads a url with trailing prose as text', () => {
		expect(classify('https://a.com b')).toBe('text');
	});
	it('reads a non-url as text', () => {
		expect(classify('not a url')).toBe('text');
	});
});

describe('extract_page', () => {
	it('keeps article text and drops script and nav', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => res(html, 'text/html')));
		const out = await extract_page('https://a.com/x');
		expect(out.text).toContain('hydrogen');
		expect(out.text).not.toContain('trackingpixel');
		expect(out.text).not.toContain('navlink');
		expect(out.t).toBe('The Real Title');
	});

	it('returns media without reading the body', async () => {
		const body = res('', 'audio/mpeg');
		const spy = vi.spyOn(body, 'text');
		vi.stubGlobal('fetch', vi.fn(async () => body));
		const out = await extract_page('https://a.com/x');
		expect(out.ty).toBe('a');
		expect(out.media).toBe('https://a.com/x');
		expect(spy).not.toHaveBeenCalled();
	});

	it('refuses a pdf with 415 rather than guessing', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => res('%PDF', 'application/pdf')));
		await expect(extract_page('https://a.com/x.pdf')).rejects.toMatchObject({ status: 415 });
	});

	it('truncates a huge page to 400k chars', async () => {
		const big = '<html><head><title>t</title></head><body><p>' + 'a'.repeat(500_000) + '</p></body></html>';
		vi.stubGlobal('fetch', vi.fn(async () => res(big, 'text/html')));
		const out = await extract_page('https://a.com/x');
		expect(out.text!.length).toBe(400_000);
	});
});

describe('media hosts', () => {
	it('knows the player pages', () => {
		expect(is_media_host('https://www.youtube.com/watch?v=1')).toBe(true);
		expect(is_media_host('https://example.com/post')).toBe(false);
	});

	it('asks for the extension when cobalt is not configured', async () => {
		await expect(extract_page('https://www.youtube.com/watch?v=1', { COBALT_URL: '' })).rejects.toMatchObject({
			code: 'needs_extension'
		});
	});
});
