import { json } from '@sveltejs/kit';

export const POST = async ({ cookies }: import('@sveltejs/kit').RequestEvent) => {
	cookies.delete('session', { path: '/' });
	return json({ ok: 1 });
};
