export function ctrl_enter(node: HTMLElement, fn: () => void) {
	function on_key(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			fn();
		}
	}
	node.addEventListener('keydown', on_key);
	return { destroy: () => node.removeEventListener('keydown', on_key) };
}
