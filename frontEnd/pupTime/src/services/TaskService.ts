import {
	TaskOverrideRepository,
	TaskTemplateRepository,
	type NewTaskOverride,
	type TaskOverride,
	type TaskTemplate,
} from '../DB';
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

export const TaskService = {
	/**
	 * Create a new override instance and schedule its notification.
	 */
	async createOverrides(template_id: string, input: NewTaskOverride[]): Promise<{ inserted: TaskOverride[], deleted: string[] }> {
		const template = await TaskTemplateRepository.findById(template_id);
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

		for (const ov of inserted) {
			await scheduleNotificationForOverride(ov, template);
		}
		return { inserted, deleted };
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
				await scheduleNotificationForOverride(saved, template);
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
};

export default TaskService;

