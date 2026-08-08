import { many } from './db';

export function fts_escape(q: string): string {
	return q
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((t) => `"${t.replace(/"/g, '')}"`)
		.join(' ');
}

export async function search(db: D1Database, uid: string, q: string): Promise<SearchRow[]> {
	const esc = fts_escape(q);
	if (!esc) return [];
	return many<SearchRow>(
		db,
		`select s.id, s.t, s.ty, s.cr, snippet(s_fts, 1, '<b>', '</b>', '…', 12) as sn
		 from s_fts join s on s.rid = s_fts.rowid
		 where s_fts match ? and s.uid = ?
		 order by rank limit 30`,
		esc.replaceAll(' ', ' OR '),
		uid
	);
}

export type SearchRow = { id: string; t: string; ty: string; cr: number; sn: string | null };