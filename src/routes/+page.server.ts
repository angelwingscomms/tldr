import type { PageServerLoad } from './$types';
import { many } from '$lib/server/db';
import { ensure_session } from '$lib/server/device';
import { list_pv } from '$lib/server/pv';

export const load: PageServerLoad = async ({ locals }) => {
	const u = await ensure_session(locals);
	const r = await many<{ id: string; t: string; ty: string; ln: string; cr: number }>(
		locals.db,
		'select id, t, ty, ln, cr from s where uid = ? order by cr desc limit 20',
		u.id
	);
	return { r, p: await list_pv(locals.db, u.id) };
};
