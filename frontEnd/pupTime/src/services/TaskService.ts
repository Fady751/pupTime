import {
	TaskOverrideRepository,
	TaskTemplateRepository,
	type NewTaskOverride,
	type TaskOverride,
	type TaskTemplate,
} from '../DB';
import NotificationService from './NotificationService';
import uuid from 'react-native-uuid';

type CreateOverrideInput = {
    id?: string | null;
	templateId: string;
	instanceDatetime: string;
	newDatetime?: string | null;
	status?: string;
    createdAt?: string;
    updatedAt?: string;
};

type UpdateOverrideInput = {
    id?: string | null;
    templateId?: string;
	instanceDatetime?: string;
	newDatetime?: string | null;
	status?: string;
    updatedAt?: string;
};

const generateId = (): string => uuid.v4() as string;

const getEffectiveTimestamp = (
	override: Pick<TaskOverride, 'instanceDatetime' | 'newDatetime'>,
	template?: TaskTemplate | null
): number | null => {
	const base = override.instanceDatetime;
	if (!base || override.newDatetime) return null;

	const date = new Date(base);
	if (Number.isNaN(date.getTime())) return null;

	let timestamp = date.getTime();

	if (template?.reminderTime != null) {
		const minutes = Number(template.reminderTime);
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
	const body = 'You have a task coming up at ' + new Date(override.instanceDatetime).toLocaleTimeString();

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
	async createOverride(input: CreateOverrideInput): Promise<TaskOverride> {
		const template = await TaskTemplateRepository.findById(input.templateId);
		if (!template) {
			throw new Error(`Task template not found: ${input.templateId}`);
		}

		const nowIso = new Date().toISOString();
		const data: NewTaskOverride = {
            id: input.id ?? generateId(),
			templateId: input.templateId,
			instanceDatetime: input.instanceDatetime,
			newDatetime: input.newDatetime ?? null,
			status: input.status ?? 'PENDING',
			isDeleted: false,
			createdAt: input.createdAt ?? nowIso,
			updatedAt: input.updatedAt ?? nowIso,
		};

		const override = await TaskOverrideRepository.create(data);
		await scheduleNotificationForOverride(override, template);
		return override;
	},

	/**
	 * Update an existing override: cancel old notification, save changes, then reschedule.
	 */
	async updateOverride(
		id: string,
		patch: UpdateOverrideInput
	): Promise<TaskOverride | undefined> {
		const existing = await TaskOverrideRepository.findById(id);
		if (!existing) return undefined;

		// Cancel previous notification if any
		await NotificationService.cancel(id);

		const updatePatch: Partial<NewTaskOverride> = {
			updatedAt: patch.updatedAt ?? new Date().toISOString(),
		};

        if (patch.templateId) {
			updatePatch.templateId = patch.templateId;
		}

		if (patch.instanceDatetime) {
			updatePatch.instanceDatetime = patch.instanceDatetime;
		}
		if (patch.newDatetime !== undefined) {
			updatePatch.newDatetime = patch.newDatetime ?? null;
		}
		if (patch.status) {
			updatePatch.status = patch.status;
		}

		const saved = await TaskOverrideRepository.update(id, updatePatch);
		if (!saved) return undefined;

		const template = await TaskTemplateRepository.findById(saved.templateId);
		if (template) {
			await scheduleNotificationForOverride(saved, template);
		}

		return saved;
	},

	/**
	 * Soft-delete an override and cancel its scheduled notification.
	 */
	async deleteOverride(id: string): Promise<void> {
		await TaskOverrideRepository.softDelete(id);
		await NotificationService.cancel(id);
	},
};

export default TaskService;

