export async function get_secret_key(env: Record<string, string>): Promise<string> {
	return env.PAYSTACK_TEST ? env.PAYSTACK_SECRET_KEY_TEST : env.PAYSTACK_SECRET_KEY_LIVE;
}

export async function paystack_init(
	env: Record<string, string>,
	email: string,
	amount: number,
	reference: string,
	callback_url: string,
	metadata: Record<string, unknown>
) {
	const base = env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co';
	const res = await fetch(`${base}/transaction/initialize`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${await get_secret_key(env)}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({ email, amount, reference, callback_url, metadata })
	});
	return res.json();
}