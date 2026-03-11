import { and, eq } from 'drizzle-orm';

import { getDrizzleDb } from '../drizzleClient';
import {
	taskOverrides,
	type NewTaskOverride,
	type TaskOverride,
} from '../schema';
import { areOverridesEqual } from '../../types/task';

export const TaskOverrideRepository = {
	async create(data: NewTaskOverride): Promise<TaskOverride> {
		const db = await getDrizzleDb();
		const [ row ] = await db
			.insert(taskOverrides)
			.values(data)
			.onConflictDoNothing()
			.returning();
		return row;
	},
	async create_many(data: NewTaskOverride[]): Promise<TaskOverride[]> {
		const db = await getDrizzleDb();

		const result: TaskOverride[] = [];
		for (const d of data) {
			const rows = await db
				.insert(taskOverrides)
				.values(d)
				.onConflictDoNothing()
				.returning();
			result.push(...rows);
		}

		return result;
	},
	async upsertTaskOverrides(data: NewTaskOverride[]): Promise<{ inserted: TaskOverride[], deleted: string[] }> {
		const db = await getDrizzleDb();

		const deleted: string[] = [];
		const dataToInsert: NewTaskOverride[] = [];
		for (const d of data) {
			const selct = await db.select().from(taskOverrides).where(
				and(
					eq(taskOverrides.template_id, d.template_id),
					eq(taskOverrides.instance_datetime, d.instance_datetime)
				)
			);
			if(selct.length > 0/* && areOverridesEqual(d as TaskOverride, selct[0])*/) {
				continue; 
			}
			dataToInsert.push(d);
			const rows = await db
				.delete(taskOverrides)
				.where(
					and(
						eq(taskOverrides.template_id, d.template_id),
						eq(taskOverrides.instance_datetime, d.instance_datetime)
					)
				).returning();
			if (rows.length > 0) {
				deleted.push(rows[ 0 ].id);
			}
		}

		return { inserted: await this.create_many(dataToInsert), deleted };
	},
	async listByTemplate(template_id: string): Promise<TaskOverride[]> {
		const db = await getDrizzleDb();
		return await db
			.select()
			.from(taskOverrides)
			.where(eq(taskOverrides.template_id, template_id));
	},
	async findById(id: string): Promise<TaskOverride | undefined> {
		const db = await getDrizzleDb();
		const rows = await db
			.select()
			.from(taskOverrides)
			.where(eq(taskOverrides.id, id));
		return rows[ 0 ];
	},
	async softDelete(id: string): Promise<void> {
		const db = await getDrizzleDb();
		await db
			.update(taskOverrides)
			.set({ is_deleted: true })
			.where(eq(taskOverrides.id, id));
	},
	async deleteById(id: string): Promise<void> {
		const db = await getDrizzleDb();
		await db
			.delete(taskOverrides)
			.where(eq(taskOverrides.id, id));
	},
	async update(
		id: string,
		patch: Partial<NewTaskOverride>
	): Promise<TaskOverride | undefined> {
		const db = await getDrizzleDb();
		const [ row ] = await db
			.update(taskOverrides)
			.set(patch)
			.where(eq(taskOverrides.id, id))
			.returning();
		return row;
	},
};
