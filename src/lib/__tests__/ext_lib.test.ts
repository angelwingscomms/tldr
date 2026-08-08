import { describe, it, expect } from 'vitest';
import { pick_input, slug, site_url } from '../../../extension/lib.js';

describe('pick_input', () => {
	it('takes the selection', () => {
		expect(pick_input('sum_sel', { selectionText: 'hello' })).toEqual({ i: 'hello', ty: 'x' });
	});

	it('takes the link url', () => {
		expect(pick_input('sum_link', { linkUrl: 'https://a.com' })).toEqual({ i: 'https://a.com', ty: 'w' });
	});

	it('takes the media url', () => {
		expect(pick_input('sum_media', { srcUrl: 'https://a.com/a.mp3' })).toEqual({ i: 'https://a.com/a.mp3', ty: 'a' });
	});

	it('takes the page url', () => {
		expect(pick_input('sum_page', {}, { url: 'https://a.com/p', text: 'body' })).toMatchObject({ i: 'https://a.com/p' });
	});

	it('returns null for an unknown menu id', () => {
		expect(pick_input('nope', {})).toBeNull();
	});
});

describe('helpers', () => {
	it('slugs a title', () => {
		expect(slug('Hello, World!')).toBe('hello-world');
	});

	it('builds a site url', () => {
		expect(site_url('/s/abc')).toBe('https://tldr.apexlinks.org/s/abc');
	});
});
