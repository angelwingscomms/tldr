import { describe, it, expect } from 'vitest';
import { mem_db } from './mem_db';
import { one } from '$lib/server/db';
import { add_pv, list_pv, pv_key, del_pv } from '$lib/server/pv';

const M = 'a-master-key-for-tests-only-0000';
const P = { n: 'groq', b: 'https://api.groq.com/openai/v1', k: 'sk-live-key', m: 'llama' };

describe('pv', () => {
	it('never stores the key in plaintext', async () => {
		const db = mem_db();
		const { id } = await add_pv(db, M, 'u1', P);
		const row = await one<{ k: string }>(db, 'select k from pv where id = ?', id);
		expect(row?.k).not.toBe('sk-live-key');
		expect(row?.k).not.toContain('sk-live-key');
	});

	it('never returns the key from the list shape', async () => {
		const db = mem_db();
		await add_pv(db, M, 'u1', P);
		const list = await list_pv(db, 'u1');
		expect(list).toHaveLength(1);
		expect(Object.keys(list[0])).not.toContain('k');
	});

	it('decrypts back to the original at call time', async () => {
		const db = mem_db();
		const { id } = await add_pv(db, M, 'u1', P);
		expect(await pv_key(db, M, 'u1', id)).toBe('sk-live-key');
	});

	it('will not delete another user row', async () => {
		const db = mem_db();
		const { id } = await add_pv(db, M, 'u1', P);
		expect(await del_pv(db, 'u2', id)).toBe(0);
		expect(await del_pv(db, 'u1', id)).toBe(1);
	});
});
