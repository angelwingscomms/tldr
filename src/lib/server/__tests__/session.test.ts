import { describe, it, expect } from 'vitest';
import { encode_session, decode_session } from '$lib/server/session';

const S = 'a-test-secret-at-least-32-bytes-long';

describe('session', () => {
	it('round-trips a user', async () => {
		const t = await encode_session(S, { id: 'u1', n: 'ed', dv: true });
		expect(await decode_session(S, t)).toEqual({ id: 'u1', n: 'ed', dv: true });
	});

	it('rejects a tampered body', async () => {
		const t = await encode_session(S, { id: 'u1', n: 'ed' });
		const bad = 'x' + t.slice(1);
		expect(await decode_session(S, bad)).toBeNull();
	});

	it('rejects a token signed with another secret', async () => {
		const t = await encode_session('another-secret-that-is-also-long-enough', { id: 'u1', n: 'ed' });
		expect(await decode_session(S, t)).toBeNull();
	});

	it('rejects garbage', async () => {
		expect(await decode_session(S, 'garbage')).toBeNull();
		expect(await decode_session(S, '')).toBeNull();
		expect(await decode_session(S, 'a.b.c')).toBeNull();
	});
});
