import { pick_input } from './lib.js';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	const inp = pick_input(msg.k, msg.info, { url: location.href, text: document.title });
	if (!inp) return;
	sendResponse({
		i: msg.k === 'sum_sel' ? (msg.info.selectionText ?? location.href) : location.href,
		t: document.title
	});
	return true;
});