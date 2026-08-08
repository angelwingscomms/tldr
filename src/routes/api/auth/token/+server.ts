import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { encode_session } from '$lib/server/session';
import { get_secret } from '$lib/server/env';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) return json({ e: 'no_session' }, { status: 401 });
	const secret = await get_secret(event.platform?.env?.SECRET);
	const t = await encode_session(secret, { ...event.locals.user, exp: Date.now() + 90 * 24 * 60 * 60 * 1000 });
	return json({ t });
};