import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { get_secret } from '$lib/server/env';
import { del_pv } from '$lib/server/pv';
import { ensure_session } from '$lib/server/device';

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	const u = await ensure_session(locals);
	const master = await get_secret(platform?.env?.MASTER_KEY);
	const n = await del_pv(locals.db, u.id, params.id);
	if (n === 0) return json({ e: 'missing' }, { status: 404 });
	return json({ ok: 1 });
};
