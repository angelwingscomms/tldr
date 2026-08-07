export async function transcribe(base: string, key: string, model: string, media: string): Promise<string> {
	const res = await fetch(media);
	const len = Number(res.headers.get('content-length') ?? 0);
	if (len > 25 * 1024 * 1024) {
		throw Object.assign(new Error('audio too large'), { code: 'too_large' });
	}
	const blob = await res.blob();
	const fd = new FormData();
	fd.set('file', blob, 'audio');
	fd.set('model', model);
	fd.set('response_format', 'text');
	const post = await fetch(base.replace(/\/+$/, '') + '/audio/transcriptions', {
		method: 'POST',
		headers: { authorization: `Bearer ${key}` },
		body: fd
	});
	if (!post.ok) {
		throw new Error((await post.text()) || `transcription failed: ${post.status}`);
	}
	return await post.text();
}
