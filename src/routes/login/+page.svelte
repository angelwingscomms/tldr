<script lang="ts">
	import { goto } from '$app/navigation';
	import { ctrl_enter } from '$lib/actions';

	let mode = $state<'in' | 'up'>('in');
	let e = $state('');
	let p = $state('');
	let err = $state('');

	const submit = async () => {
		err = '';
		if (p.length < 8) {
			err = 'password needs at least 8 characters';
			return;
		}
		const res = await fetch(`/api/auth/${mode === 'in' ? 'login' : 'signup'}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ e, p })
		});
		if (res.ok) {
			goto('/');
		} else {
			err = mode === 'in' ? 'wrong email or password' : 'email already taken';
		}
	};
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<form use:ctrl_enter={submit} class="w-full max-w-sm space-y-4 rounded-card border border-line bg-surface p-6">
		<h1 class="text-lg font-semibold text-ink">{mode === 'in' ? 'log in' : 'sign up'}</h1>
		<input
			bind:value={e}
			type="email"
			placeholder="email"
			class="w-full rounded-field border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted"
		/>
		<input
			bind:value={p}
			type="password"
			placeholder="password"
			class="w-full rounded-field border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted"
		/>
		<button type="button" onclick={submit} class="w-full rounded-field bg-accent px-3 py-2 text-bg">
			{mode === 'in' ? 'log in' : 'sign up'}
		</button>
		{#if err}<p class="text-sm text-danger">{err}</p>{/if}
		<a href="/google" class="block text-center text-sm text-accent">continue with google</a>
		<button
			type="button"
			onclick={() => (mode = mode === 'in' ? 'up' : 'in')}
			class="w-full text-center text-sm text-muted"
		>
			{mode === 'in' ? 'no account? sign up' : 'have an account? log in'}
		</button>
	</form>
</div>
