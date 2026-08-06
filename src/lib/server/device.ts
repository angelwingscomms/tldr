import { error } from '@sveltejs/kit';
import { get_user, create_user } from './user';
import { uuid_from, type Db } from './db';

export async function get_or_create_device_user(db: Db, device_id: string) {
	const id = await uuid_from(device_id);
	const found = await get_user(db, id);
	if (found) return found;
	await create_user(db, { id, n: `guest-${id.slice(0, 6)}`, dv: 1 });
	return (await get_user(db, id))!;
}

export async function ensure_session(locals: App.Locals) {
	if (locals.user) return locals.user;
	const u = await get_or_create_device_user(locals.db, locals.device_id);
	if (u.dv !== 1) error(401, 'stale_device');
	locals.user = { id: u.id, n: u.n, dv: true };
	return locals.user;
}
