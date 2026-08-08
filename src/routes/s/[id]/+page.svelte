<script lang="ts">
	import { render_md } from '$lib/md';
	import { browser } from '$app/env';

	let { data }: { data?: { r?: Record<string, unknown>; me?: string | null } } = $props();

	const row = data?.r ?? {};
	const t = (row.t as string) ?? '';
	const b = (row.b as string) ?? '';
	const owned = data?.me != null && row.uid === data.me;
	let pub = $state((row.pub as number) === 1);
	let busy = $state(false);

	$effect(() => {
		if (!browser) return;
		if (!pub) {
			const m = document.createElement('meta');
			m.name = 'robots';
			m.content = 'noindex';
			document.head.appendChild(m);
			return () => m.remove();
		}
	});

	const toggle = async () => {
		if (busy) return;
		busy = true;
		const v = pub ? 0 : 1;
		const res = await fetch(`/api/s/${row.id}/pub`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ v })
		});
		if (res.ok) pub = v === 1;
		busy = false;
	};
</script>

<div class="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 p-6">
	<a href="/" class="text-sm text-accent">← back</a>
	<h1 class="text-xl font-bold text-ink">{t}</h1>
	{#if owned}
		<button onclick={toggle} disabled={busy} class="text-sm text-accent">
			{pub ? 'unshare' : 'share'}
		</button>
	{/if}
	<div class="text-ink">{@html render_md(b)}</div>
</div>