import { describe, it, expect } from 'vitest';
import { hash_pw, verify_pw } from '$lib/server/pw';

describe('pw', () => {
	it('verifies the right password', async () => {
		expect(await verify_pw('correct horse', await hash_pw('correct horse'))).toBe(true);
	});

	it('rejects the wrong password', async () => {
		expect(await verify_pw('wrong', await hash_pw('correct horse'))).toBe(false);
	});

	it('salts, so the same password hashes differently every time', async () => {
		expect(await hash_pw('same')).not.toBe(await hash_pw('same'));
	});

	it('returns false for a malformed stored value instead of throwing', async () => {
		expect(await verify_pw('x', 'not-a-hash')).toBe(false);
		expect(await verify_pw('x', '')).toBe(false);
	});
});
