import { describe, it, expect, vi } from 'vitest';
import { transcribe } from '$lib/server/stt';

const media = 'https://a.com/x.mp3';
const audio = (len: string) => new Response('bytes', { headers: { 'content-length': len, 'content-type': 'audio/mpeg' } });

describe('transcribe', () => {
	it('posts to the compat endpoint with the base url normalised', async () => {
		const f = vi.fn(async (u: string) => (String(u) === media ? audio('100') : new Response('the words')));
		vi.stubGlobal('fetch', f);
		await transcribe('https://api.groq.com/openai/v1/', 'sk-k', 'whisper-large-v3-turbo', media);
		const post = f.mock.calls.find((c) => String(c[0]).includes('/audio/transcriptions'))!;
		expect(post[0]).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
	});

	it('sends the bearer key and the form fields', async () => {
		const f = vi.fn(async (u: string) => (String(u) === media ? audio('100') : new Response('the words')));
		vi.stubGlobal('fetch', f);
		await transcribe('https://b/v1', 'sk-k', 'm-1', media);
		const init = f.mock.calls.find((c) => String(c[0]).includes('/audio/transcriptions'))![1] as RequestInit;
		expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-k');
		const body = init.body as FormData;
		expect(body.get('model')).toBe('m-1');
		expect(body.get('response_format')).toBe('text');
	});

	it('returns the body verbatim', async () => {
		vi.stubGlobal('fetch', vi.fn(async (u: string) => (String(u) === media ? audio('100') : new Response('the words'))));
		expect(await transcribe('https://b/v1', 'sk-k', 'm-1', media)).toBe('the words');
	});

	it('throws with the provider message on 401', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (u: string) => (String(u) === media ? audio('100') : new Response('invalid api key', { status: 401 })))
		);
		await expect(transcribe('https://b/v1', 'sk-k', 'm-1', media)).rejects.toThrow(/invalid api key/);
	});

	it('refuses over 25MB before uploading anything', async () => {
		const f = vi.fn(async () => audio(String(26 * 1024 * 1024)));
		vi.stubGlobal('fetch', f);
		await expect(transcribe('https://b/v1', 'sk-k', 'm-1', media)).rejects.toMatchObject({ code: 'too_large' });
		expect(f).toHaveBeenCalledTimes(1);
	});
});
