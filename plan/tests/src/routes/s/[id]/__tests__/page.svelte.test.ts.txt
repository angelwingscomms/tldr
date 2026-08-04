import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

const row = (over: Record<string, unknown> = {}) => ({
	data: { r: { id: 's1', t: 'title', b: 'hello', uid: 'u1', pub: 0, ty: 'x', cr: Date.now(), ...over }, me: 'u1' }
});

describe('public summary page', () => {
	it('strips event handlers from the rendered body', async () => {
		const s = render(Page, row({ b: '<img src=x onerror=alert(1)> safe text' }));
		const img = s.container.querySelector('img');
		expect(img?.getAttribute('onerror')).toBeNull();
		await expect.element(s.getByText('safe text')).toBeVisible();
	});

	it('hides the share toggle from a non-owner', async () => {
		const s = render(Page, { data: { ...row().data, me: 'u2' } });
		await expect.element(s.getByRole('button', { name: 'share' })).not.toBeInTheDocument();
	});

	it('noindexes a private page and indexes a public one', async () => {
		render(Page, row({ pub: 0 }));
		expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
		document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove());
		render(Page, row({ pub: 1 }));
		expect(document.querySelector('meta[name="robots"]')).toBeNull();
	});
});
