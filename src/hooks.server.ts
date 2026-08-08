import type { Handle } from '@sveltejs/kit';
import { decode_session } from '$lib/server/session';
import { get_secret } from '$lib/server/env';

export const handle: Handle = async ({ event, resolve }) => {
	let secret: string | undefined;
	try {
		secret = await get_secret(event.platform?.env?.SECRET);
	} catch {
		secret = undefined;
	}
	event.locals.db = event.platform?.env?.DB as D1Database;

	const cookies = event.cookies;
	let device_id = cookies.get('device_id');
	if (!device_id) {
		device_id = crypto.randomUUID();
		cookies.set('device_id', device_id, { path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 400, sameSite: 'lax' });
	}
	event.locals.device_id = device_id;

	event.locals.user = null;
	const bearer = event.request.headers.get('authorization')?.replace(/^Bearer /, '');
	const session = cookies.get('session');
	if (bearer && secret) {
		event.locals.user = await decode_session(secret, bearer);
	} else if (session && secret) {
		const user = await decode_session(secret, session);
		if (user) event.locals.user = user;
		else cookies.delete('session', { path: '/' });
	}

	return resolve(event);
};
