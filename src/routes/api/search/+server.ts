import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensure_session } from '$lib/server/device';
import { search } from '$lib/server/search';

export const GET: RequestHandler = async (event) => {
	const u = await ensure_session(event.locals);
	const q = (event.url.searchParams.get('q') ?? '').trim();
	const r = q ? await search(event.locals.db, u.id, q) : [];
	return json({ r });
};
