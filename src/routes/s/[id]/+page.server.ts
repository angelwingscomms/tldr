import { error } from '@sveltejs/kit';
import { one } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const row = await one<{ id: string; uid: string; pub: number }>(
		locals.db,
		'select * from s where id = ?',
		params.id
	);
	if (!row) error(404, 'missing');
	if (row.uid !== locals.user?.id && row.pub !== 1) error(404, 'private');
	return { r: row, me: locals.user?.id ?? null };
};