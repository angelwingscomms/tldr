import { describe, it, expect } from 'vitest';
import { get_secret } from '$lib/server/env';

describe('get_secret', () => {
	it('passes a plain string through', async () => {
		expect(await get_secret('abc')).toBe('abc');
	});

	it('awaits a secrets-store binding', async () => {
		expect(await get_secret({ get: async () => 'xyz' })).toBe('xyz');
	});

	it('returns empty for undefined', async () => {
		expect(await get_secret(undefined)).toBe('');
	});

	it('returns empty for a binding-shaped object with no get, without throwing', async () => {
		expect(await get_secret({})).toBe('');
	});
});
