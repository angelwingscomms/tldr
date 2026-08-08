import { captions_from_player, resolve_media, text_from_doc } from './lib.js';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	void (async () => {
		if (msg.k === 'sum_media') {
			const el = document.querySelector('video,audio');
			const src = el ? resolve_media(el) : null;
			if (src) return sendResponse({ i: src, t: document.title });
			const host = location.hostname;
			if (host.endsWith('youtube.com') || host === 'youtu.be') {
				try {
					const yt = await new Promise((resolve) => {
						const on = (e) => {
							if (e.data?.tldr_yt_res) {
								window.removeEventListener('message', on);
								resolve(e.data.tldr_yt_res);
							}
						};
						window.addEventListener('message', on);
						window.postMessage({ tldr_yt_ping: 1 }, '*');
						setTimeout(() => resolve(null), 1500);
					});
if (yt) {
						const caps = await captions_from_player(yt, (u) => fetch(u).then((r) => r.json()));
						if (caps) return sendResponse({ i: caps, t: document.title });
					}
				} catch {}
			}
			return sendResponse({ i: location.href, t: document.title });
		}
		if (msg.k === 'sum_page') {
			return sendResponse({ i: location.href, t: document.title, x: text_from_doc(document) });
		}
		if (msg.k === 'sum_sel') {
			return sendResponse({ i: msg.info?.selectionText ?? location.href, t: document.title });
		}
		if (msg.k === 'sum_link') {
			return sendResponse({ i: msg.info?.linkUrl ?? location.href, t: document.title });
		}
		return sendResponse(null);
	})();
	return true;
});

document.addEventListener('tldr_yt', (e) => {
	window.postMessage({ tldr_yt_res: e.detail }, '*');
});

const s = document.createElement('script');
s.textContent = `(() => {
	window.addEventListener('message', (e) => {
		if (e.data?.tldr_yt_ping) {
			let v = globalThis.ytInitialPlayerResponse;
			if (!v) {
				try { v = new Function('return ytInitialPlayerResponse')(); } catch {}
			}
			document.dispatchEvent(new CustomEvent('tldr_yt', { detail: v }));
		}
	});
})();`;
document.documentElement.appendChild(s);