import type { Handle } from '@sveltejs/kit';
import { decode_session } from '$lib/server/session';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	let db: D1Database | undefined;
	try {
		db = event.platform?.env?.DB;
	} catch {
		db = undefined;
	}
	event.locals.db = db as D1Database;

	const cookies = event.cookies;
	let device_id = cookies.get('device_id');
	if (!device_id) {
		device_id = crypto.randomUUID();
		cookies.set('device_id', device_id, { path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 400, sameSite: 'lax' });
	}
	event.locals.device_id = device_id;

	const session = cookies.get('session');
	if (session) {
		const user = await decode_session(env.SECRET, session);
		if (user) {
			event.locals.user = user;
		} else {
			cookies.delete('session', { path: '/' });
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
