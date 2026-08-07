import { json } from '@sveltejs/kit';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { ensure_session } from '$lib/server/device';
import { classify, extract_page, is_media_host } from '$lib/server/extract';
import { get_pv, model_of } from '$lib/server/pv';
import { build_prompt } from '$lib/server/prompt';
import { get_secret } from '$lib/server/env';
import { run, new_id, now } from '$lib/server/db';

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
	const u = await ensure_session(event.locals);
	const body = (await event.request.json()) as { i?: string; ln?: 's' | 'm' | 'l'; pv?: string; md?: string };
	if (!body.i || !body.ln || !body.pv || !body.md) {
		return json({ e: 'no_provider' }, { status: 400 });
	}
	try {
		let ty = 'x';
		let title = body.i.slice(0, 80);
		let text = body.i;
		let src: string | null = null;
		let media: string | null = null;

		if (classify(body.i) === 'url') {
			const url = body.i;
			src = url;
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
				const master = await get_secret(platform!.env.SECRET);
				const pr = await get_pv(db, master, u.id, body.pv);
				const base = pr?.b ?? 'https://api.openai.com/v1';
				const key = pr?.k ?? 'sk-none';
				text = await transcribe(base, key, body.md, media ?? src!);
			} else {
				text = caps;
			}
		}

		const master = await get_secret(platform!.env.SECRET);
		const pr = await get_pv(db, master, u.id, body.pv);
		const base = pr?.b ?? 'https://api.openai.com/v1';
		const key = pr?.k ?? 'sk-none';

		let n_calls = 1;
		let final: string;
		let response: Response;

		if (text.length > MAX) {
			const chunks = chunk_text(text);
			n_calls = chunks.length + 1;
			const parts: string[] = [];
			for (const chunk of chunks) {
				const result = await streamText({
					model: model_of(base, key, body.md),
					system: build_prompt(ty, body.ln, title),
					prompt: chunk
				});
				parts.push(await result.text);
			}
			const result = await streamText({
				model: model_of(base, key, body.md),
				system: 'Combine the chunk summaries below into one cohesive markdown summary with a tl;dr and key points.',
				prompt: parts.join('\n\n')
			});
			final = await result.text;
			response = result.toTextStreamResponse();
		} else {
			const result = await streamText({
				model: model_of(base, key, body.md),
				system: build_prompt(ty, body.ln, title),
				prompt: text
			});
			final = await result.text;
			response = result.toTextStreamResponse();
		}

		const id = new_id();
		await run(
			db,
			'insert into s (id, uid, h, t, src, ty, md, ln, b, tr, pub, cr) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
			id,
			u.id,
			null,
			title,
			src,
			ty,
			body.md,
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
