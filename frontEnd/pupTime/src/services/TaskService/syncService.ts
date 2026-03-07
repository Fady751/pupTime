/**
 * syncService.ts — Offline-first sync engine for tasks.
 *
 * ── Design decisions (confirmed with user) ──────────────────────────────
 *
 *  READ    → Always from local DB (paginated).
 *            Trigger a non-blocking background sync first.
 *
 *  WRITE (online)
 *            API first → save server response to local DB.
 *            On network failure → fallback to offline path.
 *
 *  WRITE (offline)
 *            Save to local DB → enqueue to SyncQueue.
 *            CREATE: also generate 30-day local overrides for Calendar visibility.
 *            UPDATE: regenerate overrides only if schedule fields changed
 *                    (startDatetime / rrule / isRecurring).
 *
 *  DELETE   → Soft-delete locally + enqueue. On sync just push API delete
 *             (no timestamp comparison).
 *
 *  QUEUE    → Replay every operation in FIFO order (no collapsing).
 *             5 retries per item.
 *
 *  PULL (delta sync, every ~5 min)
 *    Template: compare updatedAt — last write wins.
 *    Overrides: keep local override if status ≠ PENDING (user interacted),
 *               otherwise take server version.
 *
 *  QUEUE FLUSH merge rule (CREATE / UPDATE response)
 *    Same as pull: keep non-PENDING local overrides, take server for the rest.
 */

import { eq, and, gte } from 'drizzle-orm';
import uuid from 'react-native-uuid';

import { store } from '../../redux/store';
import {
	TaskTemplateRepository,
	SyncQueueRepository,
	AppMetaRepository,
	getDrizzleDb,
	taskOverrides,
	taskTemplateCategories,
	categories,
	syncQueue,
} from '../../DB';
import type {
	NewTaskTemplate,
	NewSyncQueueItem,
	NewTaskOverride,
	GetOverridesParams,
} from '../../DB';
import TaskService from '../TaskService';
import {
	createTaskTemplate as apiCreateTemplate,
	patchTask as apiPatchTask,
	deleteTask as apiDeleteTask,
	getTasks as apiGetTasks,
	patchTaskOverride as apiPatchTaskOverride,
	deleteTaskOverride as apiDeleteTaskOverride,
	type getTasksRequest,
	type getTasksResponse,
	patchTaskOverrideRequest,
} from './tasks';
import {
	type TaskTemplate,
	type TaskOverride,
	getCurrentTimezone,
	getTaskOccurrences,
} from '../../types/task';
import type { Category } from '../../types/category';
import { getCategories } from '../interestService/getCategories';
import { fetchTasks } from '../../redux/slices/tasksSlice';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════════════ */

const LAST_SYNC_KEY = 'lastSyncDate';
const PROCESS_QUEUE_KEY = 'processQueue';
const SYNC_IN_PROGRESS_KEY = 'syncInProgress';
const MAX_RETRIES = 5;

type EntityType = 'TASK_TEMPLATE' | 'TASK_OVERRIDE';
type Operation = 'CREATE' | 'UPDATE' | 'DELETE';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const isOnline = (): boolean => store.getState().network.isConnected;

const generateId = (): string => uuid.v4() as string;

/** Enqueue a sync operation for later replay. */
const enqueueOperation = async (
	operation: Operation,
	entity_type: EntityType,
	local_id: string,
	payload: any,
): Promise<void> => {
	const item: NewSyncQueueItem = {
		operation,
		entity_type,
		local_id,
		payload: JSON.stringify(payload),
		retry_count: 0,
		last_error: null,
		created_at: new Date().toISOString(),
	};
	await SyncQueueRepository.enqueue(item);
};

/* ═══════════════════════════════════════════════════════════
   LOCAL DB HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Fetch category rows for a template from the local junction table. */
const getLocalCategories = async (template_id: string): Promise<Category[]> => {
	const db = await getDrizzleDb();
	return db
		.select({ id: categories.id, name: categories.name })
		.from(taskTemplateCategories)
		.innerJoin(categories, eq(taskTemplateCategories.category_id, categories.id))
		.where(eq(taskTemplateCategories.template_id, template_id));
};

/** Fetch all categories from the local DB. */
export const getAllLocalCategories = async (): Promise<Category[]> => {
	const db = await getDrizzleDb();
	return db.select({ id: categories.id, name: categories.name }).from(categories);
};

/** download all categories localy */

export const downloadCategories = async () => {
	const cats = await getCategories();
	await upsertCategories(cats);
}

/**  Upsert category records into the categories table so JOINs can resolve names */
const upsertCategories = async (cats: Category[]) => {
	const db = await getDrizzleDb();
	await db
		.insert(categories)
		.values(cats)
		.onConflictDoNothing();
}

/** Upsert categories for a template into the local DB. */
const saveCategoriesToLocal = async (
	template_id: string,
	cats: Category[],
): Promise<void> => {
	if (!cats?.length) return;
	const db = await getDrizzleDb();

	await upsertCategories(cats);

	await db.delete(taskTemplateCategories).where(eq(taskTemplateCategories.template_id, template_id));

	const to_add = cats.map((cat) => ({
		template_id,
		category_id: cat.id,
	}));
	const rows = await db.insert(taskTemplateCategories).values(to_add).returning();
};

/** Upsert a task template in the local DB. */
const saveServerResponseToLocal = async (template: TaskTemplate): Promise<TaskTemplate & { inserted: TaskOverride[], deleted: string[] }> => {
	const nowIso = new Date().toISOString();
	const tplData: NewTaskTemplate = {
		id: template.id,
		user_id: template.user_id,
		title: template.title,
		priority: template.priority ?? 'none',
		emoji: template.emoji ?? null,
		start_datetime: template.start_datetime,
		reminder_time: template.reminder_time ?? null,
		duration_minutes: template.duration_minutes ?? null,
		is_recurring: template.is_recurring ?? false,
		rrule: template.rrule ?? null,
		timezone: template.timezone ?? getCurrentTimezone(),
		is_deleted: template.is_deleted ?? false,
		created_at: template.created_at ?? nowIso,
		updated_at: template.updated_at ?? nowIso,
	};
	await TaskTemplateRepository.create(tplData);
	await saveCategoriesToLocal(template.id, template.categories ?? []);

	return { ...template, ...(await TaskService.createOverrides(template.id, template.overrides ?? [])) };
};



/** Whether the patch touches schedule-related fields. */
const isScheduleChange = (patch: Partial<TaskTemplate>): boolean =>
	patch.start_datetime !== undefined ||
	patch.rrule !== undefined ||
	patch.is_recurring !== undefined;

/* ═══════════════════════════════════════════════════════════
   PUBLIC API — CRUD
   ═══════════════════════════════════════════════════════════ */

/**
 * Create a new task template.
 * Online  → API first → save response locally (no queue).
 * Offline → local DB + generate 30-day overrides + enqueue.
 * On network failure → fallback to offline path.
 */
export const createTemplate = async (
	task: TaskTemplate,
): Promise<TaskTemplate> => {
	// ── Online path ────────────
	if (isOnline()) {
		try {
			const serverTask = await apiCreateTemplate(task);
			await saveServerResponseToLocal(serverTask);
			return serverTask;
		} catch (error) {
			console.warn('[sync] create online failed, falling back to offline', error);
		}
	}

	// ── Offline path ───────────
	const localId = task.id || generateId();
	const nowIso = new Date().toISOString();

	const templateData: NewTaskTemplate = {
		...task,
		id: localId,
		timezone: task.timezone ?? getCurrentTimezone(),
		created_at: task.created_at ?? nowIso,
		updated_at: task.updated_at ?? nowIso,
	};
	await TaskTemplateRepository.create(templateData);
	await saveCategoriesToLocal(localId, task.categories ?? []);

	const { inserted } = await TaskService.generateLocalOverrides(templateData as TaskTemplate);

	// Enqueue (camelCase — tasks.ts handles conversion via toServerTaskData)
	await enqueueOperation('CREATE', 'TASK_TEMPLATE', localId, {
		...task,
		id: localId,
		categories: task.categories ?? [],
		overrides: inserted,
	});

	return {
		...templateData,
		categories: task.categories ?? [],
		overrides: inserted,
	} as TaskTemplate;
};

/**
 * Partially update a template.
 * Online  → API first → save response locally.
 * Offline → update local DB → regenerate overrides if schedule changed → enqueue.
 */
export const updateTemplate = async (
	id: string,
	patch: Partial<TaskTemplate>,
): Promise<TaskTemplate & { deleted?: string[] } | undefined> => {


	// ── Offline path ───────────
	const dbPatch: Partial<NewTaskTemplate> = {
		updated_at: new Date().toISOString(),
		...patch,
	};

	const updated = await TaskTemplateRepository.update(id, dbPatch);
	if (!updated) return undefined;

	await saveCategoriesToLocal(id, patch.categories ?? []);

	// Enqueue (camelCase)
	const payload: Record<string, any> = {
		...patch,
	};
	let inserted: TaskOverride[] = [];
	let deleted: string[] = [];
	if (isScheduleChange(patch)) {
		const res = await TaskService.regenerateLocalOverrides(updated as TaskTemplate);
		inserted = res.inserted;
		deleted = res.deleted;
		payload.overrides = inserted;
		payload.deleted_overrides = deleted;
	}
	await enqueueOperation('UPDATE', 'TASK_TEMPLATE', id, payload);

	const cats = await getLocalCategories(id);
	return { ...updated, categories: cats, overrides: inserted, deleted };
};

/**
 * Soft-delete a template.
 * Online  → API first → soft-delete locally.
 * Offline → soft-delete locally → enqueue (no timestamp check on sync).
 */
export const deleteTemplate = async (id: string): Promise<void> => {
	const count = await SyncQueueRepository.getCount();
	if (isOnline() && !count) {
		try {
			await apiDeleteTask(id);
			await TaskService.deleteByTemplateId(id);
			await TaskTemplateRepository.deleteByTemplateId(id);
			return;
		} catch (error) {
			console.warn('[sync] delete online failed, falling back to offline', error);
		}
	}

	await saveCategoriesToLocal(id, []);
	await TaskService.deleteByTemplateId(id);
	await TaskTemplateRepository.deleteByTemplateId(id);
	await enqueueOperation('DELETE', 'TASK_TEMPLATE', id, {});
};

/**
 * Update override status (complete / skip / reschedule).
 * Online  → API first → update locally.
 * Offline → update locally → enqueue.
 */

export type patchTaskOverrideResponse = {
	type: 'RESCHEDULED';
	rescheduled: TaskOverride;
	new_instance: TaskOverride;
} | {
	type: 'OTHER';
	override: TaskOverride;
}
export const updateOverrideStatus = async (
	template_id: string,
	override_id: string,
	data: { status: string; new_datetime?: string },
): Promise<patchTaskOverrideResponse | undefined> => {
	if (data.status === 'RESCHEDULED' && !data.new_datetime) {
		throw new Error('new_datetime is required when status is RESCHEDULED');
	}
	const count = await SyncQueueRepository.getCount();
	if (isOnline() && !count) {
		try {
			const patchData: patchTaskOverrideRequest = {
				status: data.status,
				new_instance: data.new_datetime ? {
					new_date: data.new_datetime
				} : undefined,
			};
			const serverOv = await apiPatchTaskOverride(template_id, override_id, patchData);
			if (serverOv.type === 'RESCHEDULED') {
				await TaskService.updateOverride(override_id, {
					template_id,
					status: 'RESCHEDULED',
					new_datetime: serverOv.rescheduled.new_datetime,
				}, serverOv.new_instance);
			}
			else {
				await TaskService.updateOverride(override_id, {
					template_id,
					status: serverOv.override.status,
					new_datetime: serverOv.override.new_datetime,
				});
			}
			return serverOv;
		} catch (error) {
			console.warn('[sync] updateOverride online failed, falling back to offline', error);
		}
	}
	if (data?.status === 'RESCHEDULED' && data.new_datetime) {
		const new_instance: TaskOverride = {
			id: generateId(),
			template_id,
			status: 'PENDING',
			instance_datetime: data.new_datetime,
			new_datetime: null,
			is_deleted: false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		const updated = await TaskService.updateOverride(override_id, {
			template_id,
			status: 'RESCHEDULED',
			new_datetime: data.new_datetime,
		}, new_instance);
		if (!updated) return undefined;

		await enqueueOperation('UPDATE', 'TASK_OVERRIDE', override_id, {
			template_id,
			...data,
			new_instance
		});

		return {
			type: 'RESCHEDULED',
			rescheduled: updated,
			new_instance: updated,
		};
	}
	const updated = await TaskService.updateOverride(override_id, {
		template_id,
		status: data.status
	});
	if (!updated) return undefined;

	await enqueueOperation('UPDATE', 'TASK_OVERRIDE', override_id, {
		template_id,
		...data,
	});
	return {
		type: 'OTHER',
		override: updated,
	};
};

/* ═══════════════════════════════════════════════════════════
   PUBLIC API — READ (always local DB)
   ═══════════════════════════════════════════════════════════ */

/**
 * List templates from the local DB (paginated, filtered).
 * Triggers a background sync first (fire-and-forget).
 */
export const getTemplates = async (
	params: GetOverridesParams,
) => {
	// Fire-and-forget background sync
	fullSync().catch(() => { });

	return TaskTemplateRepository.filter(params);
};

/**
 * List templates joined with their overrides (paginated).
 * Triggers a background sync first (fire-and-forget).
 */
export const getTemplatesWithOverrides = async (
	params: GetOverridesParams,
) => {
	// Fire-and-forget background sync
	fullSync().catch(() => { });

	return TaskTemplateRepository.getTaskOverrides(params);
};

/* ═══════════════════════════════════════════════════════════
   SYNC ENGINE — PUSH (queue flush)
   ═══════════════════════════════════════════════════════════ */

/**
 * Replay every queued operation in FIFO order.
 */
export const processQueue = async (): Promise<void> => {
	const isProcessing = (await AppMetaRepository.get(PROCESS_QUEUE_KEY))?.value === 'true';
	const isSyncing = (await AppMetaRepository.get(SYNC_IN_PROGRESS_KEY))?.value === 'true';

	if (isProcessing || isSyncing) {
		return;
	}
	const items = await SyncQueueRepository.getAll();
	if (items.length === 0) {
		return;
	}
	await AppMetaRepository.set(PROCESS_QUEUE_KEY, 'true');
	await AppMetaRepository.set(SYNC_IN_PROGRESS_KEY, 'true');

	for (const item of items) {
		if ((item.retry_count ?? 0) >= MAX_RETRIES) {
			console.warn(`[sync] skipping item ${item.id} after ${MAX_RETRIES} retries`);
			continue;
		}

		const payload = JSON.parse(item.payload);

		try {
			switch (`${item.operation}:${item.entity_type}`) {
				/* ── TEMPLATE CREATE ──────────────────────── */
				case 'CREATE:TASK_TEMPLATE': {
					await apiCreateTemplate(payload as TaskTemplate);
					break;
				}

				/* ── TEMPLATE UPDATE ──────────────────────── */
				case 'UPDATE:TASK_TEMPLATE': {
					await apiPatchTask(item.local_id, payload as Partial<TaskTemplate>);
					break;
				}

				/* ── TEMPLATE DELETE ──────────────────────── */
				case 'DELETE:TASK_TEMPLATE': {
					await apiDeleteTask(item.local_id);
					break;
				}

				/* ── OVERRIDE UPDATE ──────────────────────── */
				case 'UPDATE:TASK_OVERRIDE': {
					if (!payload?.new_instance) {
						await apiPatchTaskOverride(
							payload.template_id,
							item.local_id,
							{ status: payload.status },
						);
					}
					else {
						await apiPatchTaskOverride(
							payload.template_id,
							item.local_id,
							{
								status: payload.status, new_instance: {
									new_date: payload.new_datetime,
									id: payload.new_instance.id
								}
							},
						);
					}
					break;
				}
				case 'DELETE:TASK_OVERRIDE': {
					await apiDeleteTaskOverride(payload.template_id, item.local_id);
					break;
				}
				default:
					console.warn('[sync] unknown queue item', item.operation, item.entity_type);
			}

			await SyncQueueRepository.deleteById(item.id);
		} catch (error: any) {
			console.error(`[sync] queue item ${item.id} failed`, error);

			const db = await getDrizzleDb();
			await db
				.update(syncQueue)
				.set({
					retry_count: (item.retry_count ?? 0) + 1,
					last_error: error?.message ?? 'Unknown error',
				})
				.where(eq(syncQueue.id, item.id));
		}
	}
	await AppMetaRepository.set(PROCESS_QUEUE_KEY, 'false');
	await AppMetaRepository.set(SYNC_IN_PROGRESS_KEY, 'false');
};

/* ═══════════════════════════════════════════════════════════
   SYNC ENGINE — PULL (delta)
   ═══════════════════════════════════════════════════════════ */

/**
 * Pull tasks updated after lastSyncDate.
 * Template: last updatedAt wins.
 * Overrides: keep local if non-PENDING, else take server.
 */
export const pullFromServer = async (): Promise<boolean> => {
	const queueCount = await SyncQueueRepository.getCount();
	if (queueCount > 0) {
		processQueue();
	}

	const isSyncing = (await AppMetaRepository.get(SYNC_IN_PROGRESS_KEY))?.value === 'true';
	const isProcessing = (await AppMetaRepository.get(PROCESS_QUEUE_KEY))?.value === 'true';

	if (isSyncing || isProcessing) {
		return false;
	}
	console.log('pulling from server');
	await AppMetaRepository.set(SYNC_IN_PROGRESS_KEY, 'true');

	try {
		const meta = await AppMetaRepository.get(LAST_SYNC_KEY);
		const lastSync = meta?.value ?? undefined;

		let page = 1;
		let hasMore = true;
		let changes = false;

		while (hasMore) {
			const request: getTasksRequest = {
				page,
				page_size: 100,
				...(lastSync ? { updated_after: lastSync } : {}),
			};

			const response: getTasksResponse<TaskTemplate> = await apiGetTasks(request);
			changes = response.count > 0;

			for (const task of response.results) {
				await saveServerResponseToLocal(task);
			}

			hasMore = response.next !== null;
			page += 1;
		}

		await AppMetaRepository.set(LAST_SYNC_KEY, new Date().toISOString());
		await AppMetaRepository.set(SYNC_IN_PROGRESS_KEY, 'false');
		return changes;
	} catch (error) {
		await AppMetaRepository.set(SYNC_IN_PROGRESS_KEY, 'false');
		throw error;
	}
};

/* ═══════════════════════════════════════════════════════════
   SYNC ENGINE — FULL SYNC
   ═══════════════════════════════════════════════════════════ */

/**
 * Full bi-directional sync:
 *   1. Push — flush the sync queue.
 *   2. Pull — fetch server delta and merge.
 *
 * Called every ~5 min while the app is in the foreground,
 * and also triggered (fire-and-forget) on read operations.
 */
let isSyncing = false;
export const fullSync = async (): Promise<boolean> => {
	if (isSyncing) {
		return false;
	}
	if (!isOnline()) {
		console.warn('[sync] offline — skipping');
		return false;
	}
	isSyncing = true;

	try {
		await processQueue();
		const changes = await pullFromServer();
		if (changes) {
			const userId = store.getState().user?.data?.id;
			if (userId) store.dispatch(fetchTasks(userId));
		}
		isSyncing = false;
		return changes;
	} catch (error) {
		console.error('[sync] failed', error);
		isSyncing = false;
		throw error;
	}
};

/* ═══════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════ */

/** Clear queue + last sync timestamp (call on logout). */
export const resetSyncState = async (): Promise<void> => {
	await SyncQueueRepository.clear();
	await AppMetaRepository.delete(LAST_SYNC_KEY);
};

export default {
	// CRUD
	createTemplate,
	updateTemplate,
	deleteTemplate,
	updateOverrideStatus,
	// Read
	getTemplates,
	getTemplatesWithOverrides,
	// Sync
	processQueue,
	pullFromServer,
	fullSync,
	resetSyncState,
};
