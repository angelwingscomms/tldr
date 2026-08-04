import { json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { get_secret } from '$lib/server/env';
import { verify_pw } from '$lib/server/pw';
import { get_user_by_email } from '$lib/server/user';
import { encode_session } from '$lib/server/session';

const cookie_opts = { path: '/', httpOnly: true, sameSite: 'lax', secure: !dev, maxAge: 60 * 60 * 24 * 30 } as const;

export const POST = async ({ request, locals, cookies, platform }: import('@sveltejs/kit').RequestEvent) => {
	const { e, p } = await request.json() as Record<string, unknown>;
	const u = typeof e === 'string' ? await get_user_by_email(locals.db, e) : null;
	const ok = !!u && !!u.p && typeof p === 'string' && (await verify_pw(p, u.p));
	if (!ok) {
		return json({ e: 'bad' }, { status: 401 });
	}
	cookies.set('session', await encode_session(await get_secret(platform?.env?.SECRET), { id: u.id, n: u.n, dv: false }), cookie_opts);
	return json({ ok: 1 });
};
