import { describe, it, expect } from 'vitest';
import { mem_db } from './mem_db';
import { one, many } from '$lib/server/db';
import { deduct, refund, maybe_grant, add_credit, DAILY_GRANT } from '$lib/server/credits';

const DAY = 86_400_000;

const user = (db: D1Database, id: string, bal: number, dv: 0 | 1, lg = 0) =>
	db.prepare('insert into u (id, n, dv, bal, lg, cr) values (?, ?, ?, ?, ?, ?)').bind(id, id, dv, bal, lg, Date.now()).run();

const bal_of = async (db: D1Database, id: string) => (await one<{ bal: number }>(db, 'select bal from u where id = ?', id))!.bal;

describe('credits', () => {
	it('deducts what fits', async () => {
		const db = mem_db();
		await user(db, 'u1', 500, 0);
		expect((await deduct(db, 'u1', 100)).ok).toBe(true);
		expect(await bal_of(db, 'u1')).toBe(400);
	});

	it('refuses what does not fit and leaves the balance alone', async () => {
		const db = mem_db();
		await user(db, 'u1', 500, 0);
		expect((await deduct(db, 'u1', 600)).ok).toBe(false);
		expect(await bal_of(db, 'u1')).toBe(500);
	});

	it('allows spending the balance exactly', async () => {
		const db = mem_db();
		await user(db, 'u1', 500, 0);
		expect((await deduct(db, 'u1', 500)).ok).toBe(true);
		expect(await bal_of(db, 'u1')).toBe(0);
	});

	it('grants once a day, and only once', async () => {
		const db = mem_db();
		await user(db, 'u1', 0, 0);
		await maybe_grant(db, 'u1');
		expect(await bal_of(db, 'u1')).toBe(DAILY_GRANT);
		await maybe_grant(db, 'u1');
		expect(await bal_of(db, 'u1')).toBe(DAILY_GRANT);
	});

	it('grants again the next day', async () => {
		const db = mem_db();
		await user(db, 'u1', 0, 0);
		await maybe_grant(db, 'u1');
		await db.prepare('update u set lg = ? where id = ?').bind(Date.now() - DAY - 1000, 'u1').run();
		await maybe_grant(db, 'u1');
		expect(await bal_of(db, 'u1')).toBe(DAILY_GRANT * 2);
	});

	it('never grants a device-only account', async () => {
		const db = mem_db();
		await user(db, 'u1', 0, 1);
		await maybe_grant(db, 'u1');
		expect(await bal_of(db, 'u1')).toBe(0);
	});

	it('credits a paystack reference exactly once', async () => {
		const db = mem_db();
		await user(db, 'u1', 0, 0);
		await add_credit(db, 'u1', 10_000, 'ref-1');
		await add_credit(db, 'u1', 10_000, 'ref-1');
		expect(await bal_of(db, 'u1')).toBe(10_000);
		expect(await many(db, "select id from ce where ref = ?", 'ref-1')).toHaveLength(1);
	});

	it('never goes negative under a run of deducts', async () => {
		const db = mem_db();
		await user(db, 'u1', 50, 0);
		for (let i = 0; i < 100; i++) await deduct(db, 'u1', 1);
		expect(await bal_of(db, 'u1')).toBe(0);
	});

	it('refunds back onto the balance', async () => {
		const db = mem_db();
		await user(db, 'u1', 500, 0);
		await deduct(db, 'u1', 200);
		await refund(db, 'u1', 150, 'r-1');
		expect(await bal_of(db, 'u1')).toBe(450);
	});
});
