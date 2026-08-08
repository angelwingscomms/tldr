<script lang="ts">
	import { render_md } from '$lib/md';

	let { data }: { data?: { r?: Record<string, unknown> } } = $props();

	const row = data?.r ?? {};
	const t = (row.t as string) ?? '';
	const b = (row.b as string) ?? '';
</script>

<div class="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 p-6">
	<a href="/" class="text-sm text-accent">← back</a>
	<h1 class="text-xl font-bold text-ink">{t}</h1>
	<div class="text-ink">{@html render_md(b)}</div>
</div>