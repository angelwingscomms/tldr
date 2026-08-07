import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { enc, dec } from './crypto';
import { one, many, run, new_id, now, type Db } from './db';

export type Pv = { id: string; n: string; b: string; m: string | null };

export async function list_pv(db: Db, uid: string): Promise<Pv[]> {
	return many<Pv>(db, 'select id, n, b, m from pv where uid = ? order by cr desc', uid);
}

export async function add_pv(db: Db, master: string, uid: string, p: { n: string; b: string; k: string; m?: string | null }): Promise<{ id: string }> {
	const id = new_id();
	await run(db, 'insert into pv (id, uid, n, b, k, m, cr) values (?, ?, ?, ?, ?, ?, ?)', id, uid, p.n, p.b, await enc(master, p.k), p.m ?? null, now());
	return { id };
}

export async function del_pv(db: Db, uid: string, id: string): Promise<number> {
	return run(db, 'delete from pv where id = ? and uid = ?', id, uid);
}

export async function pv_key(db: Db, master: string, uid: string, id: string): Promise<string | null> {
	const row = await one<{ k: string }>(db, 'select k from pv where id = ? and uid = ?', id, uid);
	if (!row) return null;
	return dec(master, row.k);
}

export async function get_pv(db: Db, master: string, uid: string, id: string): Promise<{ b: string; k: string } | null> {
	const row = await one<{ b: string; k: string }>(db, 'select b, k from pv where id = ? and uid = ?', id, uid);
	if (!row) return null;
	return { b: row.b, k: await dec(master, row.k) };
}

export function model_of(base: string, key: string, id: string) {
	return createOpenAICompatible({ name: 'p', baseURL: base.replace(/\/$/, ''), apiKey: key }).chatModel(id);
}
