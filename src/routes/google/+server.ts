import { json } from '@sveltejs/kit';
import { Google, generateState, generateCodeVerifier } from 'arctic';
import { dev } from '$app/env';
import { get_secret } from '$lib/server/env';
import { create_user, get_user_by_email, get_user_by_google, patch_user } from '$lib/server/user';
import { encode_session } from '$lib/server/session';
import { new_id } from '$lib/server/db';

const cookie_opts = { path: '/', httpOnly: true, sameSite: 'lax', secure: !dev, maxAge: 60 * 60 * 24 * 30 } as const;

export const GET = async ({ url, cookies, locals, platform }: import('@sveltejs/kit').RequestEvent) => {
	const google_client = async () =>
		new Google(
			await get_secret(platform?.env?.GOOGLE_ID),
			await get_secret(platform?.env?.GOOGLE_SECRET),
			new URL('/google', url.origin).toString()
		);

	if (locals.user && !locals.user.dv) {
		return new Response(null, { status: 302, headers: { location: '/' } });
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (code) {
		const stored_state = cookies.get('oauth_state') ?? null;
		const stored_verifier = cookies.get('oauth_verifier') ?? null;
		if (!state || !stored_state || !stored_verifier || state !== stored_state) {
			return json({ e: 'bad_oauth' }, { status: 400 });
		}
		let access = '';
		try {
			const tokens = await (await google_client()).validateAuthorizationCode(code, stored_verifier);
			access = tokens.accessToken();
		} catch {
			access = '';
		}
		const ures = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${access}` }
		});
		if (!ures.ok) {
			return json({ e: 'userinfo_failed' }, { status: 400 });
		}
		const gu = (await ures.json()) as { sub?: string; email?: string; name?: string; picture?: string };
		if (!gu.email || !gu.sub) {
			return json({ e: 'email_required' }, { status: 400 });
		}

		let id: string;
		let n: string;
		const by_g = await get_user_by_google(locals.db, gu.sub);
		if (by_g) {
			id = by_g.id;
			n = by_g.n;
		} else {
			const by_e = await get_user_by_email(locals.db, gu.email);
			if (by_e) {
				id = by_e.id;
				n = by_e.n;
				await patch_user(locals.db, id, { g: gu.sub, pic: gu.picture });
			} else if (locals.user?.dv) {
				id = locals.user.id;
				n = locals.user.n;
				await patch_user(locals.db, id, { g: gu.sub, e: gu.email, n: gu.name ?? locals.user.n, pic: gu.picture, dv: 0 });
			} else {
				id = new_id();
				n = gu.name ?? gu.email.split('@')[0];
				await create_user(locals.db, { id, e: gu.email, g: gu.sub, n, pic: gu.picture, dv: 0 });
			}
		}
		cookies.set('session', await encode_session(await get_secret(platform?.env?.SECRET), { id, n, dv: false }), cookie_opts);
		cookies.delete('oauth_state', { path: '/' });
		cookies.delete('oauth_verifier', { path: '/' });
		return new Response(null, { status: 302, headers: { location: '/' } });
	}

	const s = generateState();
	const verifier = generateCodeVerifier();
	const g = await google_client();
	cookies.set('oauth_state', s, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
	cookies.set('oauth_verifier', verifier, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });
	return new Response(null, { status: 302, headers: { location: g.createAuthorizationURL(s, verifier, ['openid', 'email', 'profile']).toString() } });
};
