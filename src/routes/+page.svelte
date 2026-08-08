<script lang="ts">
	import SumBox from '$lib/SumBox.svelte';

	let { data }: { data?: { r?: Row[] } } = $props();

	let q = $state('');
	let list: Row[] = $state(data?.r ?? []);

	type Row = { id: string; t: string; ty: string; ln?: string; cr: number; sn?: string | null };

	const ty_icon: Record<string, string> = { v: 'v', a: 'a', w: 'w', x: 'x' };

	const since = (cr: number) => {
		const s = Math.floor((Date.now() - cr) / 1000);
		if (s < 60) return 'just now';
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	};

	$effect(() => {
		const t = setTimeout(async () => {
			const q2 = q.trim();
			if (!q2) {
				list = data?.r ?? [];
				return;
			}
			const res = await fetch(`/api/search?q=${encodeURIComponent(q2)}`);
			if (res.ok && q.trim() === q2) list = ((await res.json()) as { r: Row[] }).r;
		}, 200);
		return () => clearTimeout(t);
	});
</script>

<div class="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 p-6">
	<h1 class="text-xl font-bold text-ink">tldr</h1>
	<SumBox />
	<div class="flex flex-col gap-2">
		<input
			bind:value={q}
			placeholder="search your summaries"
			class="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
		/>
		{#if list.length === 0}
			<p class="text-sm text-muted">no summaries yet</p>
		{:else}
			<ul class="flex flex-col divide-y divide-line rounded-card border border-line">
				{#each list as row}
					<li>
						<a href={`/s/${row.id}`} class="flex items-center gap-3 px-3 py-2 text-sm text-ink">
							<span class="w-5 text-center">{ty_icon[row.ty] ?? 'x'}</span>
							<span class="truncate flex-1">{row.t}</span>
							{#if row.sn}
								<span class="truncate flex-1 text-muted">{@html row.sn}</span>
							{/if}
							<span class="shrink-0 text-muted">{since(row.cr)}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>