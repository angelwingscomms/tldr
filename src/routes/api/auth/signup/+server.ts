import { json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { get_secret } from '$lib/server/env';
import { hash_pw } from '$lib/server/pw';
import { create_user, get_user_by_email, patch_user } from '$lib/server/user';
import { encode_session } from '$lib/server/session';
import { new_id } from '$lib/server/db';

const cookie_opts = { path: '/', httpOnly: true, sameSite: 'lax', secure: !dev, maxAge: 60 * 60 * 24 * 30 } as const;

export const POST = async ({ request, locals, cookies, platform }: import('@sveltejs/kit').RequestEvent) => {
	const { e, p } = await request.json() as Record<string, unknown>;
	if (typeof e !== 'string' || typeof p !== 'string' || p.length < 8) {
		return json({ e: 'bad_input' }, { status: 400 });
	}
	if (await get_user_by_email(locals.db, e)) {
		return json({ e: 'taken' }, { status: 409 });
	}
	let uid: string;
	let n: string;
	if (locals.user?.dv) {
		uid = locals.user.id;
		n = locals.user.n;
		await patch_user(locals.db, uid, { e, p: await hash_pw(p), dv: 0 });
	} else {
		uid = new_id();
		n = e.split('@')[0];
		await create_user(locals.db, { id: uid, e, p: await hash_pw(p), n });
	}
	cookies.set('session', await encode_session(await get_secret(platform?.env?.SECRET), { id: uid, n, dv: false }), cookie_opts);
	return json({ ok: 1 });
};
