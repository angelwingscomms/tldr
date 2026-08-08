import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { decode_session } from '$lib/server/session';
import { get_secret } from '$lib/server/env';

export const POST: RequestHandler = async (event) => {
	const { t } = (await event.request.json()) as { t?: unknown };
	if (typeof t !== 'string') return json({ e: 'bad_token' }, { status: 401 });
	const u = await decode_session(await get_secret(event.platform?.env?.SECRET), t);
	if (!u) return json({ e: 'bad_token' }, { status: 401 });
	event.cookies.set('session', t, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 90 * 24 * 60 * 60 });
	return json({ ok: 1 });
};