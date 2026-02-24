import { eq } from 'drizzle-orm';

import { getDrizzleDb } from '../drizzleClient';
import {
	appMeta,
	type NewAppMetaItem,
	type AppMetaItem,
} from '../schema';

export const AppMetaRepository = {
	async get(key: string): Promise<AppMetaItem | undefined> {
		const db = await getDrizzleDb();
		const rows = await db.select().from(appMeta).where(eq(appMeta.key, key));
		return rows[0];
	},

	async set(key: string, value: string): Promise<AppMetaItem> {
		const db = await getDrizzleDb();
		const [row] = await db
			.insert(appMeta)
			.values({ key, value } satisfies NewAppMetaItem)
			.onConflictDoUpdate({
				target: appMeta.key,
				set: { value },
			})
			.returning();
		return row;
	},

	async delete(key: string): Promise<void> {
		const db = await getDrizzleDb();
		await db.delete(appMeta).where(eq(appMeta.key, key));
	},
};
