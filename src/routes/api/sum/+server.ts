import { json } from '@sveltejs/kit';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { ensure_session } from '$lib/server/device';
import { classify, extract_page, is_media_host } from '$lib/server/extract';
import { get_pv, model_of } from '$lib/server/pv';
import { build_prompt } from '$lib/server/prompt';
import { get_secret, type SecretVal } from '$lib/server/env';
import { cache_key } from '$lib/server/cache';
import { run, new_id, now, one } from '$lib/server/db';
import { maybe_grant, deduct, refund } from '$lib/server/credits';
import {
	house_model,
	cost_kobo,
	KOBO_PER_1K_IN,
	KOBO_PER_1K_OUT,
	KOBO_PER_AUDIO_MIN
} from '$lib/server/house';

const MAX = 300_000;
const CHUNK = 120_000;

function chunk_text(text: string): string[] {
	const out: string[] = [];
	let rest = text;
	while (rest.length > CHUNK) {
		const head = rest.slice(0, CHUNK);
		let cut = head.lastIndexOf('\n\n');
		if (cut < CHUNK / 2) cut = head.lastIndexOf('\n');
		if (cut < CHUNK / 2) cut = CHUNK;
		out.push(rest.slice(0, cut));
		rest = rest.slice(cut);
	}
	if (rest) out.push(rest);
	return out;
}

export const POST: RequestHandler = async (event) => {
	const db = event.locals.db;
	const platform = event.platform;
	const env = (platform?.env ?? {}) as Record<string, unknown>;
	const u = await ensure_session(event.locals);
	const body = (await event.request.json()) as {
		i?: string;
		ln?: 's' | 'm' | 'l';
		pv?: string;
		md?: string;
	};
	if (!body.i || !body.ln) {
		return json({ e: 'no_provider' }, { status: 400 });
	}
	const byok = !!(body.pv && body.md);
	if (!byok && u.dv) {
		return json({ e: 'no_provider' }, { status: 400 });
	}
	let hold = 0;
	try {
		let ty = 'x';
		let title = body.i.slice(0, 80);
		let text = body.i;
		let src: string | null = null;
		let media: string | null = null;

		if (classify(body.i) === 'url') {
			src = body.i;
		}

		const h = await cache_key(src, body.md ?? '', body.ln);
		if (h) {
			const hit = await one<{
				t: string;
				ty: string;
				b: string;
				src: string | null;
				tr: string | null;
			}>(db, 'select * from s where h = ? limit 1', h);
			if (hit) {
				const id = new_id();
				await run(
					db,
					'insert into s (id, uid, h, t, src, ty, md, ln, b, tr, pub, cr) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
					id,
					u.id,
					h,
					hit.t,
					hit.src,
					hit.ty,
					body.md ?? '',
					body.ln,
					hit.b,
					hit.tr,
					now()
				);
				return new Response(hit.b, { headers: { 'x-tldr-cache': '1' } });
			}
		}

		if (src) {
			const url = src;
			if (is_media_host(url)) {
				const { get_captions } = await import('$lib/server/captions');
				const caps = await get_captions(url);
				if (!caps) {
					throw Object.assign(new Error('needs_extension'), { code: 'needs_extension' });
				}
				ty = 'v';
				text = caps;
			} else {
				const inp = await extract_page(url);
				ty = inp.ty;
				title = inp.t;
				text = inp.text ?? '';
				src = inp.src ?? url;
				media = inp.media ?? null;
			}
		}

		if ((ty === 'a' || ty === 'v') && !text) {
			const { get_captions } = await import('$lib/server/captions');
			const caps = media ? await get_captions(media) : null;
			if (!caps) {
				const { transcribe } = await import('$lib/server/stt');
				const master = await get_secret(env.SECRET as SecretVal);
				const pr = body.pv ? await get_pv(db, master, u.id, body.pv) : null;
				const base = byok
					? (pr?.b ?? 'https://api.openai.com/v1')
					: ((env.HOUSE_BASE_URL as string | undefined) ?? 'https://api.openai.com/v1');
				const key = byok ? (pr?.k ?? 'sk-none') : await get_secret(env.HOUSE_KEY as SecretVal);
				const model = byok
					? body.md!
					: ((env.HOUSE_STT_MODEL as string | undefined) ?? 'whisper-1');
				text = await transcribe(base, key, model, media ?? src!);
			} else {
				text = caps;
			}
		}

		if (!byok) {
			await maybe_grant(db, u.id);
		}

		const master = await get_secret(env.SECRET as SecretVal);
		const pr = byok && body.pv ? await get_pv(db, master, u.id, body.pv) : null;
		const base = byok
			? (pr?.b ?? 'https://api.openai.com/v1')
			: ((env.HOUSE_BASE_URL as string | undefined) ?? 'https://api.openai.com/v1');
		const key = byok ? (pr?.k ?? 'sk-none') : '';
		const model = byok ? model_of(base, key, body.md!) : await house_model(env);

		let n_calls = 1;
		if (text.length > MAX) {
			n_calls = Math.ceil(text.length / CHUNK) + 1;
		}

		if (!byok) {
			const in_kobo = Math.max(1, Math.ceil((text.length / 4 / 1000) * KOBO_PER_1K_IN));
			const out_kobo = Math.max(500, in_kobo);
			let est = (in_kobo + out_kobo) * n_calls;
			if (ty === 'a' || ty === 'v') est += KOBO_PER_AUDIO_MIN;
			const d = await deduct(db, u.id, est);
			hold = est;
			if (!d.ok) return json({ e: 'insufficient_credits', bal: d.bal }, { status: 402 });
		}
		let final = '';
		let response: Response | null = null;
		try {
			if (text.length > MAX) {
				const chunks = chunk_text(text);
				const parts: string[] = [];
				for (const chunk of chunks) {
					const result = await streamText({
						model,
						system: build_prompt(ty, body.ln, title),
						prompt: chunk
					});
					parts.push(await result.text);
				}
				const result = await streamText({
					model,
					system:
						'Combine the chunk summaries below into one cohesive markdown summary with a tl;dr and key points.',
					prompt: parts.join('\n\n'),
					onFinish: async (x) => {
						if (!byok) {
							const real = cost_kobo((x.usage ?? {}) as never);
							if (real < hold) await refund(db, u.id, hold - real, 'hold');
						}
					}
				});
				final = await result.text;
				response = result.toTextStreamResponse();
			} else {
				const result = await streamText({
					model,
					system: build_prompt(ty, body.ln, title),
					prompt: text,
					onFinish: async (x) => {
						if (!byok) {
							const c = cost_kobo((x.usage ?? {}) as never);
							if (c < hold) await refund(db, u.id, hold - c, 'hold');
						}
					}
				});
				final = await result.text;
				response = result.toTextStreamResponse();
			}
		} catch (e) {
			if (!byok && hold > 0) await refund(db, u.id, hold, 'hold');
			throw e;
		}

		const id = new_id();
		await run(
			db,
			'insert into s (id, uid, h, t, src, ty, md, ln, b, tr, pub, cr) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
			id,
			u.id,
			h,
			title,
			src,
			ty,
			body.md ?? '',
			body.ln,
			final,
			null,
			now()
		);

		return response;
	} catch (e) {
		if ((e as { code?: string }).code === 'needs_extension') {
			return json({ e: 'needs_extension' }, { status: 422 });
		}
		if ((e as { status?: number }).status === 415) {
			return json({ e: 'unsupported' }, { status: 415 });
		}
		throw e;
	}
};
