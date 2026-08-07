import { describe, it, expect } from 'vitest';
import { cache_key } from '$lib/server/cache';

describe('cache_key', () => {
	it('is stable for the same url, model and length', async () => {
		expect(await cache_key('https://a.com/x', 'm-1', 'm')).toBe(await cache_key('https://a.com/x', 'm-1', 'm'));
	});

	it('changes with the length', async () => {
		expect(await cache_key('https://a.com/x', 'm-1', 's')).not.toBe(await cache_key('https://a.com/x', 'm-1', 'l'));
	});

	it('ignores the fragment', async () => {
		expect(await cache_key('https://a.com/x#frag', 'm-1', 'm')).toBe(await cache_key('https://a.com/x', 'm-1', 'm'));
	});

	it('keeps the query string', async () => {
		expect(await cache_key('https://a.com/x?v=1', 'm-1', 'm')).not.toBe(await cache_key('https://a.com/x?v=2', 'm-1', 'm'));
	});

	it('is null for pasted text', async () => {
		expect(await cache_key(null, 'm-1', 'm')).toBeNull();
	});

	it('is null for a non-http url', async () => {
		expect(await cache_key('data:text/plain,hi', 'm-1', 'm')).toBeNull();
	});
});
