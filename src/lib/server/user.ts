import { one, run, now, type Db } from './db';

export type UserRow = { id: string; e: string | null; p: string | null; g: string | null; n: string; pic: string | null; dv: number; bal: number; lg: number; cr: number };

export async function get_user(db: Db, id: string): Promise<UserRow | null> {
	return one<UserRow>(db, 'select * from u where id = ?', id);
}

export async function get_user_by_email(db: Db, e: string): Promise<UserRow | null> {
	return one<UserRow>(db, 'select * from u where e = ?', e);
}

export async function get_user_by_google(db: Db, g: string): Promise<UserRow | null> {
	return one<UserRow>(db, 'select * from u where g = ?', g);
}

export async function create_user(
	db: Db,
	u: { id: string; e?: string; p?: string; g?: string; n: string; pic?: string; dv?: number }
): Promise<void> {
	await run(
		db,
		'insert into u (id, e, p, g, n, pic, dv, cr) values (?, ?, ?, ?, ?, ?, ?, ?)',
		u.id,
		u.e ?? null,
		u.p ?? null,
		u.g ?? null,
		u.n,
		u.pic ?? null,
		u.dv ?? 1,
		now()
	);
}

export async function patch_user(db: Db, id: string, fields: Partial<Pick<UserRow, 'e' | 'p' | 'g' | 'n' | 'pic' | 'dv'>>): Promise<void> {
	const ks = Object.keys(fields) as (keyof typeof fields)[];
	if (ks.length === 0) return;
	const sql = `update u set ${ks.map((k) => `${k} = ?`).join(', ')} where id = ?`;
	await run(db, sql, ...ks.map((k) => fields[k] ?? null), id);
}
