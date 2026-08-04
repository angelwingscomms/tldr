import { json } from '@sveltejs/kit';
import { get_secret } from '$lib/server/env';
import { list_pv, add_pv } from '$lib/server/pv';
import { ensure_session } from '$lib/server/device';

export const GET = async ({ locals }: import('@sveltejs/kit').RequestEvent) => {
	const u = await ensure_session(locals);
	return json({ p: await list_pv(locals.db, u.id) });
};

export const POST = async ({ request, locals, platform }: import('@sveltejs/kit').RequestEvent) => {
	const u = await ensure_session(locals);
	const { n, b, k, m } = await request.json() as Record<string, unknown>;
	if (typeof n !== 'string' || typeof b !== 'string' || typeof k !== 'string') {
		return json({ e: 'bad_input' }, { status: 400 });
	}
	let parsed: URL;
	try {
		parsed = new URL(b);
	} catch {
		return json({ e: 'bad_url' }, { status: 400 });
	}
	if (parsed.protocol !== 'https:') {
		return json({ e: 'bad_url' }, { status: 400 });
	}
	const master = await get_secret(platform?.env?.MASTER_KEY);
	const { id } = await add_pv(locals.db, master, u.id, { n, b, k, m: typeof m === 'string' && m ? m : null });
	return json({ id });
};
