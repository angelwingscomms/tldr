import { describe, it, expect, vi } from 'vitest';
import { ctrl_enter } from '$lib/actions';

function fake_node() {
	const h: Record<string, ((e: unknown) => void)[]> = {};
	return {
		addEventListener: (k: string, f: (e: unknown) => void) => {
			(h[k] ??= []).push(f);
		},
		removeEventListener: (k: string, f: (e: unknown) => void) => {
			h[k] = (h[k] ?? []).filter((x) => x !== f);
		},
		fire: (e: Record<string, unknown>) => (h.keydown ?? []).slice().forEach((f) => f(e))
	};
}

const ev = (o: Record<string, unknown>) => ({ key: 'Enter', ctrlKey: false, metaKey: false, preventDefault: () => {}, ...o });

describe('ctrl_enter', () => {
	it('fires on ctrl+enter', () => {
		const n = fake_node();
		const fn = vi.fn();
		ctrl_enter(n as unknown as HTMLElement, fn);
		n.fire(ev({ ctrlKey: true }));
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('fires on meta+enter', () => {
		const n = fake_node();
		const fn = vi.fn();
		ctrl_enter(n as unknown as HTMLElement, fn);
		n.fire(ev({ metaKey: true }));
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('does nothing on plain enter', () => {
		const n = fake_node();
		const fn = vi.fn();
		ctrl_enter(n as unknown as HTMLElement, fn);
		n.fire(ev({}));
		expect(fn).not.toHaveBeenCalled();
	});

	it('unbinds on destroy', () => {
		const n = fake_node();
		const fn = vi.fn();
		const { destroy } = ctrl_enter(n as unknown as HTMLElement, fn);
		destroy();
		n.fire(ev({ ctrlKey: true }));
		expect(fn).not.toHaveBeenCalled();
	});
});
