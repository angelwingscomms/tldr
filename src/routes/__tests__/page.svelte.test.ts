import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from '@vitest/browser/context';
import Page from '../+page.svelte';

const stream = (chunks: string[]) =>
	new Response(
		new ReadableStream({
			start(c) {
				const enc = new TextEncoder();
				chunks.forEach((x) => c.enqueue(enc.encode(x)));
				c.close();
			}
		})
	);

const data = { r: [] };

beforeEach(() => {
	vi.stubGlobal('fetch', vi.fn(async () => stream(['hello ', 'world'])));
});

describe('home page', () => {
	it('renders the one box with its placeholder', async () => {
		const s = render(Page, { data });
		await expect.element(s.getByPlaceholder('paste a link, or any amount of text')).toBeVisible();
	});

	it('submits on ctrl+enter and not on plain enter', async () => {
		const s = render(Page, { data });
		const box = s.getByPlaceholder('paste a link, or any amount of text');
		await box.fill('some text');
		await userEvent.keyboard('{Enter}');
		expect(fetch).not.toHaveBeenCalled();
		await userEvent.keyboard('{Control>}{Enter}{/Control}');
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('paints partial text then the full text', async () => {
		const s = render(Page, { data });
		await s.getByPlaceholder('paste a link, or any amount of text').fill('x');
		await userEvent.keyboard('{Control>}{Enter}{/Control}');
		await expect.element(s.getByText('hello world')).toBeVisible();
	});

	it('shows the download button only after the stream ends', async () => {
		const s = render(Page, { data });
		await expect.element(s.getByRole('button', { name: 'download .md' })).not.toBeInTheDocument();
		await s.getByPlaceholder('paste a link, or any amount of text').fill('x');
		await userEvent.keyboard('{Control>}{Enter}{/Control}');
		await expect.element(s.getByRole('button', { name: 'download .md' })).toBeVisible();
	});

	it('renders a specific sentence for each error code', async () => {
		for (const [code, sentence] of [
			['no_provider', 'add a provider in settings first'],
			['needs_extension', 'this site needs the extension'],
			['bad_key', 'that api key was rejected']
		] as const) {
			vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ e: code }), { status: 400 })));
			const s = render(Page, { data });
			await s.getByPlaceholder('paste a link, or any amount of text').fill('x');
			await userEvent.keyboard('{Control>}{Enter}{/Control}');
			await expect.element(s.getByText(sentence)).toBeVisible();
		}
	});
});
