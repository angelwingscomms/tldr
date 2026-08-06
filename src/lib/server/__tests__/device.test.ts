import { describe, it, expect } from 'vitest';
import { mem_db } from './mem_db';
import { get_or_create_device_user, ensure_session } from '$lib/server/device';
import { many, run } from '$lib/server/db';

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

describe('ensure_session', () => {
	it('adopts a device-only row', async () => {
		const db = mem_db();
		const l = { db, device_id: 'dev-1', user: null } as unknown as App.Locals;
		expect((await ensure_session(l)).dv).toBe(true);
	});

	it('refuses a device row that has been upgraded to a real account', async () => {
		const db = mem_db();
		const u = await get_or_create_device_user(db, 'dev-1');
		await run(db, 'update u set dv = 0, e = ?, p = ? where id = ?', 'a@b.c', 'hash', u.id);
		const l = { db, device_id: 'dev-1', user: null } as unknown as App.Locals;
		await expect(ensure_session(l)).rejects.toMatchObject({ status: 401 });
	});
});
