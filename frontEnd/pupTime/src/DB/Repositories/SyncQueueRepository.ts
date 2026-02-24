import { eq, asc } from 'drizzle-orm';

import { getDrizzleDb } from '../drizzleClient';
import {
	syncQueue,
	type NewSyncQueueItem,
	type SyncQueueItem,
} from '../schema';

export const SyncQueueRepository = {
	async enqueue(data: NewSyncQueueItem): Promise<SyncQueueItem> {
		const db = await getDrizzleDb();
		const [row] = await db.insert(syncQueue).values(data).returning();
		return row;
	},

	async getAll(): Promise<SyncQueueItem[]> {
		const db = await getDrizzleDb();
		return db.select().from(syncQueue).orderBy(asc(syncQueue.id)); 
	},

	async deleteById(id: number): Promise<void> {
		const db = await getDrizzleDb();
		await db.delete(syncQueue).where(eq(syncQueue.id, id));
	},

	async clear(): Promise<void> {
		const db = await getDrizzleDb();
		await db.delete(syncQueue);
	},
};
