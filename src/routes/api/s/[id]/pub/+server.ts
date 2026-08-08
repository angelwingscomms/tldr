import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { run, one } from '$lib/server/db';
import { ensure_session } from '$lib/server/device';

export const POST: RequestHandler = async (event) => {
	const u = await ensure_session(event.locals);
	const row = await one<{ uid: string }>(event.locals.db, 'select uid from s where id = ?', event.params.id);
	if (!row) return json({ e: 'missing' }, { status: 404 });
	if (row.uid !== u.id) return json({ e: 'private' }, { status: 404 });
	const v = ((await event.request.json()) as { v?: unknown }).v ?? -1;
	if (v === 0 || v === 1) await run(event.locals.db, 'update s set pub = ? where id = ?', v, event.params.id);
	return json({ ok: 1 });
};