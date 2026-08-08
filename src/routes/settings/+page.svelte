<script lang="ts">
	import { browser } from '$app/env';
	import { ctrl_enter } from '$lib/actions';

	type Pv = { id: string; n: string; b: string; m: string | null };

	let pvs = $state<Pv[]>([]);
	let n = $state('');
	let b = $state('');
	let k = $state('');
	let err = $state('');
	let models = $state<Record<string, string[]>>({});
	let custom = $state<Record<string, string>>({});
	let auto = $state(false);

	$effect(() => {
		if (browser) {
			auto = localStorage.getItem('tldr:auto') === '1';
		}
	});
	$effect(() => {
		if (browser && typeof localStorage !== 'undefined') {
			localStorage.setItem('tldr:auto', auto ? '1' : '0');
		}
	});

	const load = async () => {
		const res = await fetch('/api/pv');
		if (res.ok) {
			pvs = ((await res.json()) as { p: Pv[] }).p;
		}
	};
	$effect(() => {
		load();
	});

	const load_models = async (id: string, base: string) => {
		const res = await fetch(`/api/pv/${id}/models`);
		if (res.ok) {
			const { m } = (await res.json()) as { m: string[] };
			models[id] = m;
		}
	};

	const add = async () => {
		err = '';
		const res = await fetch('/api/pv', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ n, b, k })
		});
		if (!res.ok) {
			err = 'check the fields: base url must be https';
			return;
		}
		n = '';
		b = '';
		k = '';
		await load();
	};

	const del = async (id: string) => {
		await fetch(`/api/pv/${id}`, { method: 'DELETE' });
		await load();
	};
</script>

<div class="mx-auto w-full max-w-lg space-y-6 p-4">
	<h1 class="text-lg font-semibold text-ink">settings</h1>

	<section class="space-y-3">
		<h2 class="text-sm font-semibold text-muted">providers</h2>
		{#if pvs.length === 0}
			<p class="text-sm text-muted">no providers yet — add one below</p>
		{/if}
		{#each pvs as p (p.id)}
			<div class="rounded-card border border-line bg-surface p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-ink">{p.n}</p>
						<p class="text-xs text-muted">{p.b}</p>
						<p class="text-xs text-muted">key ••••</p>
					</div>
					<div class="flex items-center gap-3">
						{#if (models[p.id] ?? []).length > 0}
							<select
								value={p.m ?? ''}
								onchange={(e) => (custom[p.id] = (e.currentTarget as HTMLSelectElement).value)}
								class="rounded-field border border-line bg-bg px-2 py-1 text-xs text-ink"
							>
								{#each models[p.id] as m (m)}
									<option value={m}>{m}</option>
								{/each}
							</select>
						{:else}
							<input
								value={custom[p.id] ?? p.m ?? ''}
								oninput={(e) => (custom[p.id] = (e.currentTarget as HTMLInputElement).value)}
								placeholder="model"
								class="rounded-field border border-line bg-bg px-2 py-1 text-xs text-ink placeholder:text-muted"
							/>
						{/if}
						<button onclick={() => del(p.id)} class="text-xs text-danger">delete</button>
					</div>
				</div>
				{#if (models[p.id] ?? []).length === 0 && !(p.id in models)}
					<button
						onclick={() => load_models(p.id, p.b)}
						class="mt-2 text-xs text-accent"
					>
						load models
					</button>
				{/if}
			</div>
		{/each}
	</section>

	<section class="rounded-card border border-line bg-surface p-4">
		<h2 class="text-sm font-semibold text-muted">add provider</h2>
		<form use:ctrl_enter={add} class="mt-3 space-y-3">
			<input
				bind:value={n}
				placeholder="label, e.g. groq"
				class="w-full rounded-field border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted"
			/>
			<input
				bind:value={b}
				placeholder="base url, e.g. https://api.groq.com/openai/v1"
				class="w-full rounded-field border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted"
			/>
			<input
				bind:value={k}
				type="password"
				placeholder="api key"
				class="w-full rounded-field border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted"
			/>
			{#if err}<p class="text-sm text-danger">{err}</p>{/if}
			<button type="button" onclick={add} class="w-full rounded-field bg-accent px-3 py-2 text-bg">
				add provider
			</button>
		</form>
	</section>

	<section class="space-y-2">
		<h2 class="text-sm font-semibold text-muted">downloads</h2>
		<label class="flex items-center gap-2 text-ink">
			<input type="checkbox" bind:checked={auto} />
			autosave every summary as .md when it finishes
		</label>
	</section>

	<section class="space-y-2">
		<h2 class="text-sm font-semibold text-muted">account</h2>
		<a href="/login" class="block text-sm text-accent">log in or sign up</a>
	</section>
</div>
