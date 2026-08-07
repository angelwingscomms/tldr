export const LEN = { s: '3 sentences', m: '5 to 8 bullet points', l: 'a thorough section-by-section breakdown' } as const;

export function build_prompt(ty: string, len: 's' | 'm' | 'l', title: string): string {
	const chapters =
		ty === 'v' || ty === 'a'
			? '\nWhen the text carries timestamps, add a `## chapters` list of `- MM:SS — what happens` entries.'
			: '';
	return `# ${title}

**tl;dr** — one sentence capturing the whole piece.

## key points
${LEN[len]}, each on its own line starting with '- '.

Output github-flavoured markdown and nothing else: no preamble, no "here is your summary", no closing offer to help.${chapters}`;
}
