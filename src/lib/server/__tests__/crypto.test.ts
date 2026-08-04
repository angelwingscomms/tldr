import { describe, it, expect } from 'vitest';
import { enc, dec } from '$lib/server/crypto';

const M = 'a-master-key-for-tests-only-0000';

describe('crypto', () => {
	it('round-trips', async () => {
		expect(await dec(M, await enc(M, 'sk-secret'))).toBe('sk-secret');
	});

	it('uses a fresh iv each time', async () => {
		expect(await enc(M, 'same')).not.toBe(await enc(M, 'same'));
	});

	it('rejects the wrong master key rather than returning garbage', async () => {
		const blob = await enc(M, 'sk-secret');
		await expect(dec('a-different-master-key-000000000', blob)).rejects.toThrow();
	});

	it('rejects a malformed blob', async () => {
		await expect(dec(M, 'not-a-blob')).rejects.toThrow();
	});
});
