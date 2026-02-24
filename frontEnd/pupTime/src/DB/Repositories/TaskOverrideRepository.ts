import { eq } from 'drizzle-orm';

import { getDrizzleDb } from '../drizzleClient';
import {
	taskOverrides,
	type NewTaskOverride,
	type TaskOverride,
} from '../schema';

export const TaskOverrideRepository = {
	async create(data: NewTaskOverride): Promise<TaskOverride> {
		const db = await getDrizzleDb();
		const [row] = await db.insert(taskOverrides).values(data).returning();
		return row;
	},

	async listByTemplate(templateId: string): Promise<TaskOverride[]> {
		const db = await getDrizzleDb();
		return db
			.select()
			.from(taskOverrides)
			.where(eq(taskOverrides.templateId, templateId));
	},
	async findById(id: string): Promise<TaskOverride | undefined> {
		const db = await getDrizzleDb();
		const rows = await db
			.select()
			.from(taskOverrides)
			.where(eq(taskOverrides.id, id));
		return rows[0];
	},
	async softDelete(id: string): Promise<void> {
		const db = await getDrizzleDb();
		await db
			.update(taskOverrides)
			.set({ isDeleted: true })
			.where(eq(taskOverrides.id, id));
	},
	async update(
		id: string,
		patch: Partial<NewTaskOverride>
	): Promise<TaskOverride | undefined> {
		const db = await getDrizzleDb();
		const [row] = await db
			.update(taskOverrides)
			.set(patch)
			.where(eq(taskOverrides.id, id))
			.returning();
		return row;
	},
};
