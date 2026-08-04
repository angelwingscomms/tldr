export type Db = D1Database;
export const now = () => Date.now();
export function new_id(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}
export async function one<T>(db: Db, sql: string, ...a: unknown[]): Promise<T | null> {
	return (await db.prepare(sql).bind(...a).first<T>()) ?? null;
}
export async function many<T>(db: Db, sql: string, ...a: unknown[]): Promise<T[]> {
	return (await db.prepare(sql).bind(...a).all<T>()).results ?? [];
}
export async function run(db: Db, sql: string, ...a: unknown[]): Promise<number> {
	const r = await db.prepare(sql).bind(...a).run();
	return r.meta.changes ?? 0;
}
