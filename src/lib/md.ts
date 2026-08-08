import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function render_md(s: string): string {
	if (typeof window === 'undefined') return '';
	return DOMPurify.sanitize(marked.parse(s) as string);
}