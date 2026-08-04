export type SecretVal = string | { get?: () => Promise<string> } | undefined;

export async function get_secret(v: SecretVal): Promise<string> {
	if (!v) return '';
	if (typeof v === 'string') return v;
	if (typeof v.get === 'function') return (await v.get()) ?? '';
	return '';
}
