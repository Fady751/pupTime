import { and, eq, gte } from 'drizzle-orm';
import {
	getDrizzleDb,
	TaskOverrideRepository,
	taskOverrides,
	TaskTemplateRepository,
	type NewTaskOverride,
	type TaskOverride,
} from '../DB';

import { getExactlyTime, getTaskOccurrences, TaskTemplate } from '../types/task';
import NotificationService from './NotificationService';
import uuid from 'react-native-uuid';

type UpdateOverrideInput = {
	id?: string | null;
	template_id?: string;
	instance_datetime?: string;
	new_datetime?: string | null;
	status?: string | null;
	updated_at?: string;
};

const generateId = (): string => uuid.v4() as string;

const getEffectiveTimestamp = (
	override: Pick<TaskOverride, 'instance_datetime' | 'new_datetime' | 'status'>,
	template?: TaskTemplate | null
): number | null => {
	const base = override.instance_datetime;
	if (!base || override.new_datetime || override?.status !== 'PENDING') return null;

	const date = new Date(base);
	if (Number.isNaN(date.getTime())) return null;

	let timestamp = date.getTime();

	if (template?.reminder_time != null) {
		const minutes = Number(template.reminder_time);
		if (!Number.isNaN(minutes) && minutes > 0) {
			timestamp -= minutes * 60 * 1000;
		}
	}

	if (timestamp <= Date.now()) return null;

	return timestamp;
};

const scheduleNotificationForOverride = async (
	override: TaskOverride,
	template: TaskTemplate
): Promise<void> => {
	const timestamp = getEffectiveTimestamp(override, template);
	if (!timestamp) return;

	const title = template.title ?? 'Task reminder';
	const body = 'You have a task coming up at ' + new Date(override.instance_datetime).toLocaleTimeString();

	await NotificationService.scheduleAtTime(
		override.id,
		title,
		body,
		timestamp,
		'tasks'
	);
};

export const scheduleNotificationsForOverrides = async (
	overrides: TaskOverride[],
	template: TaskTemplate
): Promise<void> => {
	const activeOverrides = overrides.filter((override) => {
		const isDeleted = override.is_deleted === true;
		const active = override.status === 'PENDING';

		return !isDeleted && active;
	});

	console.log(`activeOverrides: (${activeOverrides.length})`);

	if (activeOverrides.length === 0) {
		// console.log(`Successfully processed scheduling for template: ${template.title}`);
		return;
	}

	// Prepare permission + channel ONCE before the batch
	try {
		await NotificationService.prepare('tasks', 'Task Notifications');
	} catch (error) {
		console.error('Failed to prepare notification channel:', error);
		return;
	}

	// Schedule all triggers concurrently (permission + channel already prepared)
	await Promise.all(
		activeOverrides.map(async (override) => {
			try {
				const taskTimeString = override.new_datetime || override.instance_datetime;

				if (!taskTimeString) {
					console.warn(`Override ${override.id} has no valid datetime string.`);
					return;
				}

				const taskTimeMs = new Date(taskTimeString).getTime();

				if (isNaN(taskTimeMs)) {
					console.error(`Invalid date format for override ${override.id}: ${taskTimeString}`);
					return;
				}

				const reminderMinutes = template.reminder_time ?? 0;
				const reminderOffsetMs = reminderMinutes * 60 * 1000;
				const notificationTimestamp = taskTimeMs - reminderOffsetMs;

				if (notificationTimestamp <= Date.now()) return;

				const title = template.title || 'Task Reminder';
				const formattedTime = new Date(taskTimeMs).toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
				});

				const emojiPrefix = template.emoji ? `${template.emoji} ` : '';
				const body = `${emojiPrefix}You have a task coming up at ${formattedTime}`;

				await NotificationService.scheduleAtTimePrepared(
					override.id,
					title,
					body,
					notificationTimestamp,
					'tasks'
				);
			} catch (error) {
				console.error(`Failed to schedule notification for override ${override.id}:`, error);
			}
		})
	);

	// console.log(`Successfully processed scheduling for template: ${template.title}`);
};
export const TaskService = {
	/**
	 * Create a new override instance and schedule its notification.
	 */
	async createOverrides(template_id: string, input: NewTaskOverride[]): Promise<{ inserted: TaskOverride[], deleted: string[] }> {
		const template = await TaskTemplateRepository.findById(template_id) as TaskTemplate;
		if (!template) return { inserted: [], deleted: [] };

		const nowIso = new Date().toISOString();
		const data: NewTaskOverride[] = input.map((item) => ({
			id: item.id ?? generateId(),
			template_id: template_id,
			instance_datetime: item.instance_datetime,
			new_datetime: item.new_datetime ?? null,
			status: item.status ?? 'PENDING',
			is_deleted: false,
			created_at: item.created_at ?? nowIso,
			updated_at: item.updated_at ?? nowIso,
		}));
		const { inserted, deleted } = await TaskOverrideRepository.upsertTaskOverrides(data);

		for (const id of deleted) {
			await NotificationService.cancel(id);
		}

		// for (const ov of inserted) {
		// 	await scheduleNotificationForOverride(ov, template);
		// }
		await scheduleNotificationsForOverrides(inserted, template);

		return { inserted, deleted };
	},

	/**
	 * Generate local overrides for a template.
	 */
	async generateLocalOverrides(
		template: TaskTemplate,
		next: number = 30
	): Promise<{ inserted: TaskOverride[], deleted: string[] }> {
		if (!template.start_datetime) return { inserted: [], deleted: [] };

		const occurrences = getTaskOccurrences(template, new Date(), next);
		console.log("occurrences: ", occurrences);

		const { inserted, deleted } = await TaskService.createOverrides(
			template.id,
			occurrences.map((datetime) => ({
				template_id: template.id,
				instance_datetime: datetime,
			} as NewTaskOverride))
		);
		return { inserted, deleted };
	},

	/**
	 * Delete future PENDING overrides for a template and regenerate the
	 * next 30 days.  Called during offline update when schedule fields change.
	 */
	async regenerateLocalOverrides(
		template: TaskTemplate,
		next: number = 30
	): Promise<{ inserted: TaskOverride[], deleted: string[] }> {
		const db = await getDrizzleDb();
		const todayIso = new Date().toISOString();

		// Fetch ALL non-deleted future overrides (any status) to know every occupied date
		const allOverrides = (await db
			.select().from(taskOverrides)
			.where(
				and(
					eq(taskOverrides.template_id, template.id),
					gte(taskOverrides.instance_datetime, todayIso),
					eq(taskOverrides.is_deleted, false),
				),
			));

		// Only PENDING overrides are candidates for deletion
		const selected = allOverrides.filter(ov => ov.status === 'PENDING');

		// Use ALL overrides (including COMPLETED) so we don't re-create on occupied dates
		const selectedDates = new Set(allOverrides.map(ov => getExactlyTime(ov.instance_datetime)));

		const occurrences = getTaskOccurrences(template, new Date(), next);
		const occurrenceSet = new Set(occurrences);

		const deleted = selected.filter((ov) => !occurrenceSet.has(getExactlyTime(ov.instance_datetime))).map(ov => ov.id);

		const toInsert = occurrences.filter((datetime) =>
			!selectedDates.has(getExactlyTime(datetime)))
			.map((datetime) => ({
				template_id: template.id,
				instance_datetime: datetime,
			} as NewTaskOverride));

		for (const id of deleted) {
			await NotificationService.cancel(id);
			await TaskOverrideRepository.deleteById(id);
		}
		const { inserted, deleted: insertedDeleted } = await TaskService.createOverrides(
			template.id,
			toInsert
		);
		return { inserted, deleted: [ ...deleted, ...insertedDeleted ] };
	},
	/**
	 * Update an existing override: cancel old notification, save changes, then reschedule.
	 */
	async updateOverride(
		id: string,
		patch: UpdateOverrideInput,
		new_override?: NewTaskOverride
	): Promise<TaskOverride | undefined> {
		const existing = await TaskOverrideRepository.findById(id);
		if (!existing) return undefined;

		// Cancel previous notification if any
		await NotificationService.cancel(id);

		const updatePatch: Partial<NewTaskOverride> = {
			updated_at: patch.updated_at ?? new Date().toISOString(),
		};

		if (patch.template_id) {
			updatePatch.template_id = patch.template_id;
		}

		if (patch.instance_datetime) {
			updatePatch.instance_datetime = patch.instance_datetime;
		}
		if (patch.new_datetime !== undefined) {
			updatePatch.new_datetime = patch.new_datetime ?? null;
		}
		if (patch.status) {
			updatePatch.status = patch.status;
		}

		const saved = await TaskOverrideRepository.update(id, updatePatch);
		if (!saved) return undefined;

		if (patch?.status === 'RESCHEDULED' && new_override) {
			this.createOverrides(existing.template_id, [ new_override ]);
		}
		else {
			const template = await TaskTemplateRepository.findById(saved.template_id);

			if (template) {
				await scheduleNotificationForOverride(saved, template as TaskTemplate);
			}
		}

		return saved;
	},

	/**
	 * Soft-delete an override and cancel its scheduled notification.
	 */
	async deleteOverride(id: string): Promise<void> {
		await TaskOverrideRepository.deleteById(id);
		await NotificationService.cancel(id);
	},
	async deleteByTemplateId(id: string): Promise<void> {
		const overrides = await TaskOverrideRepository.listByTemplate(id);
		for (const ov of overrides) {
			await NotificationService.cancel(ov.id);
		}
	},
};

export default TaskService;

