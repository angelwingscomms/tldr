import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { get_secret, type SecretVal } from './env';
import { RATE } from './credits';

export const KOBO_PER_1K_IN = 250;
export const KOBO_PER_1K_OUT = 600;
export const KOBO_PER_AUDIO_MIN = 50_000;

export async function house_model(env: Record<string, unknown>) {
	return createOpenAICompatible({
		name: 'h',
		baseURL: ((env.HOUSE_BASE_URL as string) ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
		apiKey: await get_secret(env.HOUSE_KEY as SecretVal)
	}).chatModel((env.HOUSE_MODEL as string) ?? 'gpt-4o-mini');
}

export function cost_kobo(usage: { inputTokens?: number; outputTokens?: number }) {
	const raw =
		((usage.inputTokens ?? 0) / 1000) * KOBO_PER_1K_IN +
		((usage.outputTokens ?? 0) / 1000) * KOBO_PER_1K_OUT;
	return Math.ceil(raw * RATE);
}
