import { run, new_id, now, type Db } from './db';

export const DAILY_GRANT = 5400;
export const RATE = 1.08;
export const DAY_MS = 86_400_000;

export async function maybe_grant(db: Db, uid: string) {
	const t = now();
	const fired = await run(
		db,
		'update u set bal = bal + ?, lg = ? where id = ? and lg < ? and dv = 0',
		DAILY_GRANT,
		t,
		uid,
		t - DAY_MS
	);
	if (fired > 0) {
		await run(
			db,
			'insert into ce (id, uid, k, amt, bal, ref, cr) values (?, ?, ?, ?, ?, ?, ?)',
			new_id(),
			uid,
			'g',
			DAILY_GRANT,
			DAILY_GRANT,
			null,
			t
		);
	}
	return fired > 0;
}

export async function deduct(db: Db, uid: string, amt: number): Promise<{ ok: boolean; bal: number }> {
	const fired = await run(db, 'update u set bal = bal - ? where id = ? and bal >= ?', amt, uid, amt);
	if (fired > 0) {
		const row = await db.prepare('select bal from u where id = ?').bind(uid).first<{ bal: number }>();
		await run(
			db,
			'insert into ce (id, uid, k, amt, bal, ref, cr) values (?, ?, ?, ?, ?, ?, ?)',
			new_id(),
			uid,
			'd',
			amt,
			row?.bal ?? 0,
			null,
			now()
		);
		return { ok: true, bal: row?.bal ?? 0 };
	}
	return { ok: false, bal: (await db.prepare('select bal from u where id = ?').bind(uid).first<{ bal: number }>())?.bal ?? 0 };
}

export async function refund(db: Db, uid: string, amt: number, ref: string) {
	await run(db, 'update u set bal = bal + ? where id = ?', amt, uid);
	await run(
		db,
		'insert into ce (id, uid, k, amt, bal, ref, cr) values (?, ?, ?, ?, ?, ?, ?)',
		new_id(),
		uid,
		'r',
		amt,
		amt,
		ref,
		now()
	);
}

export async function add_credit(db: Db, uid: string, amt: number, ref: string) {
	const t = now();
	try {
		await db.batch([
			db.prepare('insert into ce (id, uid, k, amt, bal, ref, cr) values (?, ?, ?, ?, ?, ?, ?)').bind(new_id(), uid, 'p', amt, amt, ref, t),
			db.prepare('update u set bal = bal + ? where id = ?').bind(amt, uid)
		]);
	} catch {
		// duplicate ref: batch rolled back, balance untouched
	}
}