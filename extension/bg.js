import { pick_input, site_url } from './lib.js';

const SITE = 'https://tldr.apexlinks.org';

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: 'sum_media',
		contexts: ['video', 'audio'],
		title: 'summarize this'
	});
	chrome.contextMenus.create({ id: 'sum_page', contexts: ['page'], title: 'summarize this page' });
	chrome.contextMenus.create({
		id: 'sum_sel',
		contexts: ['selection'],
		title: 'summarize selection'
	});
	chrome.contextMenus.create({ id: 'sum_link', contexts: ['link'], title: 'summarize this link' });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	const in0 = pick_input(info.menuItemId, info, { url: tab?.url ?? '', text: tab?.title ?? '' });
	if (!in0) return;
	let i = in0.i;
	const res = await chrome.tabs.sendMessage(tab.id, { k: info.menuItemId, info }).catch(() => null);
	if (res?.i) i = res.i;
	const st = await chrome.storage.local.get('token');
	const headers = { 'content-type': 'application/json' };
	if (st.token) headers.authorization = `Bearer ${st.token}`;
	const r = await fetch(`${SITE}/api/sum`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ i, ln: 'm' })
	});
	if (!r.ok) return;
	await r.text();
	const id = r.headers.get('x-tldr-id') ?? '';
	chrome.tabs.create({ url: site_url(`/s/${id}`) });
});
