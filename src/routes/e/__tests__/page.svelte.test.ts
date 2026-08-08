import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

const data = { r: [] };

beforeEach(() => {
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: 1 }))));
	history.replaceState(null, '', '/e');
});

describe('popup page', () => {
	it('adopts a hash token once and clears the hash', async () => {
		history.replaceState(null, '', '/e#t=abc');
		render(Page, { data });
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
		expect(String((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0])).toContain('/api/auth/adopt');
		expect(location.hash).toBe('');
	});

	it('shows the login card with no token', async () => {
		const s = render(Page, { data });
		await expect.element(s.getByPlaceholder('email')).toBeVisible();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('ignores a message from a foreign origin', async () => {
		render(Page, { data });
		window.dispatchEvent(new MessageEvent('message', { data: { t: 'evil' }, origin: 'https://evil.example' }));
		await new Promise((r) => setTimeout(r, 20));
		expect(fetch).not.toHaveBeenCalled();
	});
});
