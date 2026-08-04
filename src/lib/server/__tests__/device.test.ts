import { describe, it, expect } from 'vitest';
import { mem_db } from './mem_db';
import { get_or_create_device_user } from '$lib/server/device';
import { many } from '$lib/server/db';

describe('get_or_create_device_user', () => {
	it('is stable for the same device id and creates exactly one row', async () => {
		const db = mem_db();
		const a = await get_or_create_device_user(db, 'dev-1');
		const b = await get_or_create_device_user(db, 'dev-1');
		expect(a.id).toBe(b.id);
		expect(await many(db, 'select id from u')).toHaveLength(1);
	});

	it('gives different device ids different rows', async () => {
		const db = mem_db();
		await get_or_create_device_user(db, 'dev-1');
		await get_or_create_device_user(db, 'dev-2');
		expect(await many(db, 'select id from u')).toHaveLength(2);
	});

	it('creates the row device-only', async () => {
		const db = mem_db();
		const u = await get_or_create_device_user(db, 'dev-1');
		const row = await many<{ dv: number }>(db, 'select dv from u where id = ?', u.id);
		expect(row[0].dv).toBe(1);
	});
});
