<script lang="ts">
	import { browser } from '$app/env';
	import SumBox from '$lib/SumBox.svelte';

	const SITE = 'https://tldr.apexlinks.org';

	let authed = $state(false);
	let email = $state('');
	let pw = $state('');
	let busy = $state(false);
	let err = $state('');

	const adopt = async (t: string) => {
		const res = await fetch('/api/auth/adopt', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ t })
		});
		if (res.ok) authed = true;
		history.replaceState(null, '', location.pathname);
	};

	$effect(() => {
		if (!browser) return;
		const m = location.hash.match(/#t=(.+)/);
		if (m) {
			void adopt(m[1]);
			return;
		}
		const on = (e: MessageEvent) => {
			if (e.origin !== SITE) return;
			const t = (e.data as { t?: unknown }).t;
			if (typeof t === 'string') {
				history.replaceState(null, '', `${location.pathname}#t=${encodeURIComponent(t)}`);
				void adopt(t);
			}
		};
		window.addEventListener('message', on);
		return () => window.removeEventListener('message', on);
	});

	const login = async () => {
		if (busy) return;
		busy = true;
		err = '';
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ e: email, p: pw })
		});
		if (!res.ok) {
			err = 'wrong email or password';
			busy = false;
			return;
		}
		const r2 = await fetch('/api/auth/token', { method: 'POST' });
		if (r2.ok) {
			const { t } = (await r2.json()) as { t: string };
			window.parent.postMessage({ t }, SITE);
		}
		authed = true;
		busy = false;
	};
</script>

<div class="mx-auto flex min-h-screen w-full max-w-full flex-col gap-4 p-4">
	<h1 class="text-xl font-bold text-ink">tldr</h1>
	{#if authed}
		<SumBox />
	{:else}
		<form onsubmit={(e) => e.preventDefault()} class="flex flex-col gap-3">
			<input
				bind:value={email}
				type="email"
				placeholder="email"
				class="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
			/>
			<input
				bind:value={pw}
				type="password"
				placeholder="password"
				class="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
			/>
			<button
				type="button"
				disabled={busy}
				onclick={login}
				class="rounded-field bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
			>
				sign in
			</button>
			{#if err}<p class="text-sm text-danger">{err}</p>{/if}
		</form>
	{/if}
</div>