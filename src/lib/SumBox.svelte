<script lang="ts">
	import { browser } from '$app/env';
	import { ctrl_enter } from '$lib/actions';
	import { render_md } from '$lib/md';

	type Prov = { id: string; n: string; m: string | null };

	let { p = [], load_pv = false }: { p?: Prov[]; load_pv?: boolean } = $props();

	let input = $state('');
	let ln = $state<'s' | 'm' | 'l'>('m');
	let pv = $state('');
	let md = $state('');
	let fetched = $state<Prov[] | null>(null);
	const pvs = $derived(fetched ?? p);
	let mds = $state<string[]>([]);
	let out = $state('');
	let err = $state('');
	let busy = $state(false);
	let done = $state(false);
	let started = $state(false);

	const row_count = $derived(Math.min(14, Math.max(3, input.split('\n').length)));

	const err_text: Record<string, string> = {
		no_provider: 'add a provider in settings first',
		needs_extension: 'this site needs the extension',
		bad_key: 'that api key was rejected'
	};

	const slug = (s: string) =>
		s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'summary';

	const dl = () => {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([out], { type: 'text/markdown' }));
		a.download = `${slug(input)}-${new Date().toISOString().slice(0, 10)}.md`;
		a.click();
		URL.revokeObjectURL(a.href);
	};

	$effect(() => {
		if (!browser || !load_pv) return;
		void (async () => {
			const res = await fetch('/api/pv');
			if (!res.ok) return;
			fetched = ((await res.json()) as { p: Prov[] }).p ?? [];
		})();
	});

	$effect(() => {
		if (!pv && pvs.length) pv = pvs[0].id;
	});

	$effect(() => {
		const id = pv;
		if (!browser || !id) {
			mds = [];
			return;
		}
		void (async () => {
			const res = await fetch(`/api/pv/${id}/models`);
			const list = res.ok ? (((await res.json()) as { m: string[] }).m ?? []) : [];
			if (pv !== id) return;
			mds = list;
			md = list.includes(md) ? md : (pvs.find((p) => p.id === id)?.m ?? list[0] ?? '');
		})();
	});

	const reset = () => {
		started = false;
		done = false;
		out = '';
		err = '';
		input = '';
	};

	const submit = async () => {
		if (busy || !input.trim()) return;
		started = true;
		busy = true;
		done = false;
		err = '';
		out = '';
		const res = await fetch('/api/sum', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ i: input, ln, pv, md })
		});
		if (!res.ok) {
			let code = '';
			try {
				code = ((await res.json()) as { e?: string }).e ?? '';
			} catch {}
			err = err_text[code] ?? 'something went wrong';
			busy = false;
			return;
		}
		const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
		while (true) {
			const { value, done: d } = await reader.read();
			if (d) break;
			out += value;
		}
		busy = false;
		done = true;
		if (browser && localStorage.getItem('tldr:auto') === '1') dl();
	};
</script>

{#if !started}
	<form use:ctrl_enter={submit} class="flex flex-col gap-4">
		<textarea
			bind:value={input}
			rows={row_count}
			placeholder="paste a link, or any amount of text"
			class="w-full resize-none rounded-card border border-line bg-surface p-3 text-ink placeholder:text-muted outline-none focus:border-accent"
		></textarea>
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex overflow-hidden rounded-field border border-line">
				{#each [['s', 'short'], ['m', 'medium'], ['l', 'long']] as [v, label]}
					<button
						type="button"
						class="px-3 py-1.5 text-sm {ln === v ? 'bg-accent text-bg' : 'bg-surface text-muted'}"
						onclick={() => (ln = v as 's' | 'm' | 'l')}
					>
						{label}
					</button>
				{/each}
			</div>
			<select bind:value={pv} class="rounded-field border border-line bg-surface px-2 py-1.5 text-sm text-ink">
				<option value="">provider</option>
				{#each pvs as p}
					<option value={p.id}>{p.n}</option>
				{/each}
			</select>
			<select bind:value={md} class="rounded-field border border-line bg-surface px-2 py-1.5 text-sm text-ink">
				<option value="">model</option>
				{#each mds as m}
					<option value={m}>{m}</option>
				{/each}
			</select>
			<button
				type="button"
				class="ml-auto rounded-field bg-accent px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
				disabled={busy}
				onclick={submit}
			>
				summarize
			</button>
		</div>
		{#if browser && !pvs.length}
			<p class="text-sm text-muted">
				no providers yet — <a href="/settings" class="text-accent">add one in settings</a>
			</p>
		{:else if pv && !mds.length}
			<p class="text-sm text-muted">no models came back from this provider — check its key in settings</p>
		{/if}
	</form>
{/if}
{#if err}
	<p class="text-sm text-danger">
		{#if err === 'add a provider in settings first'}
			<a href="/settings">{err}</a>
		{:else if err === 'this site needs the extension'}
			<a href="/e" target="_blank" rel="noreferrer">{err}</a>
		{:else}
			{err}
		{/if}
	</p>
{/if}
{#if started}
	<div class="rounded-card border border-line bg-surface p-4">
		{#if browser}
			<div class="text-ink">{@html render_md(out)}</div>
		{:else}
			<pre class="whitespace-pre-wrap text-ink">{out}</pre>
		{/if}
		{#if busy && !out}
			<p class="text-sm text-muted">summarizing…</p>
		{/if}
	</div>
{/if}
{#if done}
	<div class="flex gap-3">
		<button onclick={dl} class="text-sm text-accent">download .md</button>
		<button
			onclick={() => {
				navigator.clipboard.writeText(out);
			}}
			class="text-sm text-accent"
		>
			copy
		</button>
		<button onclick={reset} class="ml-auto text-sm text-muted">new summary</button>
	</div>
{/if}