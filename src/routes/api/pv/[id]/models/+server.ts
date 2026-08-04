import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { get_secret } from '$lib/server/env';
import { one } from '$lib/server/db';
import { pv_key } from '$lib/server/pv';
import { ensure_session } from '$lib/server/device';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
	const u = await ensure_session(locals);
	const row = await one<{ b: string }>(locals.db, 'select b from pv where id = ? and uid = ?', params.id, u.id);
	if (!row) return json({ m: [] });
	const master = await get_secret(platform?.env?.MASTER_KEY);
	const key = await pv_key(locals.db, master, u.id, params.id);
	let ids: string[] = [];
	try {
		const res = await fetch(`${row.b.replace(/\/$/, '')}/models`, {
			headers: { authorization: `Bearer ${key}` }
		});
		if (res.ok) {
			const data = await res.json() as { data?: { id?: unknown }[] };
			ids = (data.data ?? []).map((d) => String(d.id)).filter(Boolean);
		}
	} catch {
		ids = [];
	}
	return json({ m: ids.sort() });
};
