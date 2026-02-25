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
	TaskOverrideRepository,
	getDrizzleDb,
	taskTemplates,
	taskOverrides,
	taskTemplateCategories,
	categories,
} from '../../DB';
import type {
	NewTaskTemplate,
	NewSyncQueueItem,
	TaskOverride as DBTaskOverride,
} from '../../DB';
import TaskService from '../TaskService';
import {
	createTaskTemplate as apiCreateTemplate,
	patchTask as apiPatchTask,
	deleteTask as apiDeleteTask,
	getTasks as apiGetTasks,
	patchTaskOverride as apiPatchTaskOverride,
	type getTasksRequest,
	type getTasksResponse,
} from './tasks';
import {
	type TaskTemplate,
	type TaskOverride,
	getCurrentTimezone,
	getTaskOccurrences,
} from '../../types/task';
import type { Category } from '../../types/category';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════════════ */

const LAST_SYNC_KEY = 'lastSyncDate';
const MAX_RETRIES = 5;

type EntityType = 'TASK_TEMPLATE' | 'TASK_OVERRIDE';
type Operation = 'CREATE' | 'UPDATE' | 'DELETE';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const isOnline = (): boolean => store.getState().network.isConnected;

const generateId = (): string => uuid.v4() as string;

/** True when `a` is strictly newer than `b` (ISO-8601 strings). */
const isNewer = (a: string | null | undefined, b: string | null | undefined): boolean => {
	if (!a) return false;
	if (!b) return true;
	return new Date(a).getTime() > new Date(b).getTime();
};

/** Enqueue a sync operation for later replay. */
const enqueueOperation = async (
	operation: Operation,
	entityType: EntityType,
	localId: string,
	payload: Record<string, any>,
): Promise<void> => {
	const item: NewSyncQueueItem = {
		operation,
		entityType,
		localId,
		payload: JSON.stringify(payload),
		retryCount: 0,
		createdAt: new Date().toISOString(),
	};
	await SyncQueueRepository.enqueue(item);
};

/* ═══════════════════════════════════════════════════════════
   LOCAL DB HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Fetch category rows for a template from the local junction table. */
const getLocalCategories = async (templateId: string): Promise<Category[]> => {
	const db = await getDrizzleDb();
	return db
		.select({ id: categories.id, name: categories.name })
		.from(taskTemplateCategories)
		.innerJoin(categories, eq(taskTemplateCategories.categoryId, categories.id))
		.where(eq(taskTemplateCategories.templateId, templateId));
};

/** Upsert categories for a template into the local DB. */
const saveCategoriesToLocal = async (
	templateId: string,
	cats: Category[],
): Promise<void> => {
	if (!cats?.length) return;
	const db = await getDrizzleDb();

	await db
		.delete(taskTemplateCategories)
		.where(eq(taskTemplateCategories.templateId, templateId));

	for (const cat of cats) {
		await db
			.insert(categories)
			.values({ id: cat.id, name: cat.name })
			.onConflictDoUpdate({ target: categories.id, set: { name: cat.name } });
		await db
			.insert(taskTemplateCategories)
			.values({ templateId, categoryId: cat.id });
	}
};

/**
 * Merge a single server override into the local DB.
 *
 * Rule: if a local override exists with the same ID **and** its status is
 * NOT 'PENDING' (user interacted with it), keep the local version.
 * Otherwise take the server version.
 */
const mergeOverride = async (
	templateId: string,
	serverOv: TaskOverride,
): Promise<void> => {
	const ovId = String(serverOv.id);
	const existing = await TaskOverrideRepository.findById(ovId);

	if (existing && existing.status !== 'PENDING') {
		// Local override wins — user already interacted (COMPLETED / SKIPPED / etc.)
		return;
	}

	if (existing) {
		await TaskService.updateOverride(ovId, {
			templateId,
			instanceDatetime: serverOv.instanceDatetime,
			newDatetime: serverOv.newDatetime,
			status: serverOv.status ?? 'PENDING',
			updatedAt: serverOv.updatedAt ?? undefined,
		});
	} else {
		await TaskService.createOverride({
			id: ovId,
			templateId,
			instanceDatetime: serverOv.instanceDatetime,
			newDatetime: serverOv.newDatetime,
			status: serverOv.status ?? 'PENDING',
			createdAt: serverOv.createdAt ?? undefined,
			updatedAt: serverOv.updatedAt ?? undefined,
		});
	}
};

/**
 * Merge server overrides into the local DB for a template that was created
 * offline (local overrides have different IDs from server overrides).
 *
 * 1) Match local ↔ server by instance_datetime.
 * 2) If local is non-PENDING → keep local status, update ID to server ID.
 * 3) If local is PENDING → replace with server version.
 * 4) Server overrides with no local match → insert.
 * 5) Local overrides with no server match → delete.
 *
 * Returns a map of localOverrideId → serverOverrideId for ID remapping.
 */
const mergeOverridesAfterCreate = async (
	templateId: string,
	serverOverrides: TaskOverride[],
): Promise<Map<string, string>> => {
	const idMap = new Map<string, string>();
	const db = await getDrizzleDb();

	// Fetch all local overrides for this template
	const localOverrides = await db
		.select()
		.from(taskOverrides)
		.where(
			and(
				eq(taskOverrides.templateId, templateId),
				eq(taskOverrides.isDeleted, false),
			),
		);

	// Build instance_datetime → local override lookup
	const localByDatetime = new Map<string, DBTaskOverride>();
	for (const local of localOverrides) {
		localByDatetime.set(local.instanceDatetime, local);
	}

	const processedLocalIds = new Set<string>();

	for (const serverOv of serverOverrides) {
		const serverId = String(serverOv.id);
		const local = localByDatetime.get(serverOv.instanceDatetime);

		if (local) {
			processedLocalIds.add(local.id);

			if (local.id !== serverId) {
				idMap.set(local.id, serverId);
			}

			if (local.status !== 'PENDING') {
				// User interacted → keep local status, but swap ID to server's
				await TaskService.deleteOverride(local.id);
				await db.delete(taskOverrides).where(eq(taskOverrides.id, local.id));
				await TaskService.createOverride({
					id: serverId,
					templateId,
					instanceDatetime: serverOv.instanceDatetime,
					newDatetime: local.newDatetime,
					status: local.status ?? 'PENDING',
					createdAt: serverOv.createdAt ?? undefined,
					updatedAt: local.updatedAt ?? undefined,
				});
			} else {
				// Local was PENDING → take server version
				await TaskService.deleteOverride(local.id);
				await db.delete(taskOverrides).where(eq(taskOverrides.id, local.id));
				await TaskService.createOverride({
					id: serverId,
					templateId,
					instanceDatetime: serverOv.instanceDatetime,
					newDatetime: serverOv.newDatetime,
					status: serverOv.status ?? 'PENDING',
					createdAt: serverOv.createdAt ?? undefined,
					updatedAt: serverOv.updatedAt ?? undefined,
				});
			}
		} else {
			// No local match → insert server override
			await TaskService.createOverride({
				id: serverId,
				templateId,
				instanceDatetime: serverOv.instanceDatetime,
				newDatetime: serverOv.newDatetime,
				status: serverOv.status ?? 'PENDING',
				createdAt: serverOv.createdAt ?? undefined,
				updatedAt: serverOv.updatedAt ?? undefined,
			});
		}
	}

	// Local overrides with no server match → clean up
	for (const local of localOverrides) {
		if (!processedLocalIds.has(local.id)) {
			await TaskService.deleteOverride(local.id);
			await db.delete(taskOverrides).where(eq(taskOverrides.id, local.id));
		}
	}

	return idMap;
};

/**
 * Save / merge a server task into the local DB.
 *
 * Template: last updatedAt wins.
 * Overrides: keep local if non-PENDING, else take server.
 */
const mergeServerTaskToLocal = async (
	serverTask: TaskTemplate,
): Promise<void> => {
	const id = String(serverTask.id);

	// ── 1. Template ──────────────────────────
	const local = await TaskTemplateRepository.findById(id);

	const templateData: NewTaskTemplate = {
		id,
		userId: serverTask.userId,
		title: serverTask.title,
		priority: serverTask.priority ?? 'none',
		emoji: serverTask.emoji ?? null,
		startDatetime: serverTask.startDatetime,
		reminderTime: serverTask.reminderTime ?? null,
		durationMinutes: serverTask.durationMinutes ?? null,
		isRecurring: serverTask.isRecurring ?? false,
		rrule: serverTask.rrule ?? null,
		timezone: serverTask.timezone ?? getCurrentTimezone(),
		isDeleted: serverTask.isDeleted ?? false,
		createdAt: serverTask.createdAt ?? new Date().toISOString(),
		updatedAt: serverTask.updatedAt ?? new Date().toISOString(),
	};

	if (!local) {
		// New template from server — just create
		await TaskTemplateRepository.create(templateData);
	} else if (isNewer(serverTask.updatedAt, local.updatedAt)) {
		// Server is newer → update local
		await TaskTemplateRepository.update(id, templateData);
	}
	// else: local is newer → keep local template as-is

	// ── 2. Categories (always take server if template was updated) ───
	if (!local || isNewer(serverTask.updatedAt, local.updatedAt)) {
		if (serverTask.categories?.length) {
			await saveCategoriesToLocal(id, serverTask.categories);
		}
	}

	// ── 3. Overrides: merge each independently ──────────────────────
	if (serverTask.overrides) {
		for (const ov of serverTask.overrides) {
			await mergeOverride(id, ov);
		}
	}
};

/**
 * Force-save a server task to local (no updatedAt comparison).
 * Used after a successful online write where we trust the server response.
 */
const saveServerResponseToLocal = async (
	serverTask: TaskTemplate,
): Promise<void> => {
	const id = String(serverTask.id);

	const templateData: NewTaskTemplate = {
		id,
		userId: serverTask.userId,
		title: serverTask.title,
		priority: serverTask.priority ?? 'none',
		emoji: serverTask.emoji ?? null,
		startDatetime: serverTask.startDatetime,
		reminderTime: serverTask.reminderTime ?? null,
		durationMinutes: serverTask.durationMinutes ?? null,
		isRecurring: serverTask.isRecurring ?? false,
		rrule: serverTask.rrule ?? null,
		timezone: serverTask.timezone ?? getCurrentTimezone(),
		isDeleted: serverTask.isDeleted ?? false,
		createdAt: serverTask.createdAt ?? new Date().toISOString(),
		updatedAt: serverTask.updatedAt ?? new Date().toISOString(),
	};

	const existing = await TaskTemplateRepository.findById(id);
	if (existing) {
		await TaskTemplateRepository.update(id, templateData);
	} else {
		await TaskTemplateRepository.create(templateData);
	}

	if (serverTask.categories?.length) {
		await saveCategoriesToLocal(id, serverTask.categories);
	}

	if (serverTask.overrides) {
		for (const ov of serverTask.overrides) {
			await mergeOverride(id, ov);
		}
	}
};

/**
 * Generate local overrides for the next 30 days so an offline-created
 * task appears in the calendar immediately.
 */
const generateLocalOverrides = async (
	template: TaskTemplate,
): Promise<void> => {
	if (!template.startDatetime) return;

	const occurrences = getTaskOccurrences(template, new Date(), 30);

	for (const datetime of occurrences) {
		await TaskService.createOverride({
			templateId: template.id,
			instanceDatetime: datetime,
			status: 'PENDING',
		});
	}
};

/**
 * Delete future PENDING overrides for a template and regenerate the
 * next 30 days.  Called during offline update when schedule fields change.
 */
const regenerateLocalOverrides = async (
	template: TaskTemplate,
): Promise<void> => {
	const db = await getDrizzleDb();
	const todayIso = new Date().toISOString();

	const futurePending = await db
		.select()
		.from(taskOverrides)
		.where(
			and(
				eq(taskOverrides.templateId, template.id),
				eq(taskOverrides.status, 'PENDING'),
				gte(taskOverrides.instanceDatetime, todayIso),
				eq(taskOverrides.isDeleted, false),
			),
		);

	for (const ov of futurePending) {
		await TaskService.deleteOverride(ov.id);
	}

	await generateLocalOverrides(template);
};

/**
 * Replace a local template ID with a server ID across all related tables.
 */
const replaceLocalTemplateId = async (
	oldId: string,
	newId: string,
): Promise<void> => {
	const db = await getDrizzleDb();

	await db
		.update(taskOverrides)
		.set({ templateId: newId })
		.where(eq(taskOverrides.templateId, oldId));

	await db
		.update(taskTemplateCategories)
		.set({ templateId: newId })
		.where(eq(taskTemplateCategories.templateId, oldId));

	const existing = await TaskTemplateRepository.findById(oldId);
	if (existing) {
		await TaskTemplateRepository.create({ ...existing, id: newId });
		await db.delete(taskTemplates).where(eq(taskTemplates.id, oldId));
	}
};

/** Whether the patch touches schedule-related fields. */
const isScheduleChange = (patch: Partial<TaskTemplate>): boolean =>
	patch.startDatetime !== undefined ||
	patch.rrule !== undefined ||
	patch.isRecurring !== undefined;

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
		id: localId,
		userId: task.userId ?? null,
		title: task.title,
		priority: task.priority ?? 'none',
		emoji: task.emoji ?? null,
		startDatetime: task.startDatetime ?? null,
		reminderTime: task.reminderTime ?? null,
		durationMinutes: task.durationMinutes ?? null,
		isRecurring: task.isRecurring ?? false,
		rrule: task.rrule ?? null,
		timezone: task.timezone ?? getCurrentTimezone(),
		isDeleted: false,
		createdAt: task.createdAt ?? nowIso,
		updatedAt: task.updatedAt ?? nowIso,
	};

	await TaskTemplateRepository.create(templateData);

	if (task.categories?.length) {
		await saveCategoriesToLocal(localId, task.categories);
	}

	// Generate 30-day overrides for calendar visibility
	await generateLocalOverrides({
		...templateData,
		categories: task.categories ?? [],
		overrides: [],
	} as TaskTemplate);

	// Enqueue (camelCase — tasks.ts handles conversion via toServerTaskData)
	await enqueueOperation('CREATE', 'TASK_TEMPLATE', localId, {
		title: task.title,
		categories: task.categories ?? [],
		priority: task.priority,
		emoji: task.emoji,
		startDatetime: task.startDatetime,
		reminderTime: task.reminderTime,
		durationMinutes: task.durationMinutes,
		isRecurring: task.isRecurring,
		rrule: task.rrule,
		timezone: task.timezone,
		overrides: [],
	});

	return {
		...templateData,
		categories: task.categories ?? [],
		overrides: [],
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
): Promise<TaskTemplate | undefined> => {
	// ── Online path ────────────
	if (isOnline()) {
		try {
			const serverTask = await apiPatchTask(id, patch);
			await saveServerResponseToLocal(serverTask);
			return serverTask;
		} catch (error) {
			console.warn('[sync] update online failed, falling back to offline', error);
		}
	}

	// ── Offline path ───────────
	const dbPatch: Partial<NewTaskTemplate> = {
		updatedAt: new Date().toISOString(),
	};
	if (patch.title !== undefined) dbPatch.title = patch.title;
	if (patch.priority !== undefined) dbPatch.priority = patch.priority;
	if (patch.emoji !== undefined) dbPatch.emoji = patch.emoji;
	if (patch.startDatetime !== undefined) dbPatch.startDatetime = patch.startDatetime;
	if (patch.reminderTime !== undefined) dbPatch.reminderTime = patch.reminderTime;
	if (patch.durationMinutes !== undefined) dbPatch.durationMinutes = patch.durationMinutes;
	if (patch.isRecurring !== undefined) dbPatch.isRecurring = patch.isRecurring;
	if (patch.rrule !== undefined) dbPatch.rrule = patch.rrule;
	if (patch.timezone !== undefined) dbPatch.timezone = patch.timezone;

	const updated = await TaskTemplateRepository.update(id, dbPatch);
	if (!updated) return undefined;

	if (patch.categories) {
		await saveCategoriesToLocal(id, patch.categories);
	}

	// Regenerate overrides only when schedule fields changed
	if (isScheduleChange(patch)) {
		const cats = await getLocalCategories(id);
		await regenerateLocalOverrides({
			...updated,
			categories: cats,
			overrides: [],
		} as TaskTemplate);
	}

	// Enqueue (camelCase)
	const payload: Record<string, any> = {};
	if (patch.title !== undefined) payload.title = patch.title;
	if (patch.categories) payload.categories = patch.categories;
	if (patch.priority !== undefined) payload.priority = patch.priority;
	if (patch.emoji !== undefined) payload.emoji = patch.emoji;
	if (patch.startDatetime !== undefined) payload.startDatetime = patch.startDatetime;
	if (patch.reminderTime !== undefined) payload.reminderTime = patch.reminderTime;
	if (patch.durationMinutes !== undefined) payload.durationMinutes = patch.durationMinutes;
	if (patch.isRecurring !== undefined) payload.isRecurring = patch.isRecurring;
	if (patch.rrule !== undefined) payload.rrule = patch.rrule;
	if (patch.timezone !== undefined) payload.timezone = patch.timezone;

	await enqueueOperation('UPDATE', 'TASK_TEMPLATE', id, payload);

	const cats = await getLocalCategories(id);
	return { ...updated, categories: cats, overrides: [] } as TaskTemplate;
};

/**
 * Soft-delete a template.
 * Online  → API first → soft-delete locally.
 * Offline → soft-delete locally → enqueue (no timestamp check on sync).
 */
export const deleteTemplate = async (id: string): Promise<void> => {
	if (isOnline()) {
		try {
			await apiDeleteTask(id);
			await TaskTemplateRepository.softDelete(id);
			return;
		} catch (error) {
			console.warn('[sync] delete online failed, falling back to offline', error);
		}
	}

	await TaskTemplateRepository.softDelete(id);
	await enqueueOperation('DELETE', 'TASK_TEMPLATE', id, {});
};

/**
 * Update override status (complete / skip / reschedule).
 * Online  → API first → update locally.
 * Offline → update locally → enqueue.
 */
export const updateOverrideStatus = async (
	templateId: string,
	overrideId: string,
	data: { status: string; new_datetime?: string },
): Promise<TaskOverride | undefined> => {
	if (isOnline()) {
		try {
			const serverOv = await apiPatchTaskOverride(templateId, overrideId, data);
			await TaskService.updateOverride(overrideId, {
				templateId,
				status: serverOv.status ?? data.status,
				newDatetime: serverOv.newDatetime ?? data.new_datetime,
			});
			return serverOv;
		} catch (error) {
			console.warn('[sync] updateOverride online failed, falling back to offline', error);
		}
	}

	const updated = await TaskService.updateOverride(overrideId, {
		templateId,
		status: data.status,
		newDatetime: data.new_datetime ?? null,
	});
	if (!updated) return undefined;

	await enqueueOperation('UPDATE', 'TASK_OVERRIDE', overrideId, {
		templateId,
		...data,
	});

	return updated as TaskOverride;
};

/* ═══════════════════════════════════════════════════════════
   PUBLIC API — READ (always local DB)
   ═══════════════════════════════════════════════════════════ */

/**
 * List templates from the local DB (paginated, filtered).
 * Triggers a background sync first (fire-and-forget).
 */
export const getTemplates = async (
	params: {
		userId: number;
		page?: number;
		page_size?: number;
		priority?: string | null;
		category?: number | string | null;
		start_date?: string;
		end_date?: string;
		ordering?: string;
	},
) => {
	// Fire-and-forget background sync
	fullSync().catch(() => {});

	return TaskTemplateRepository.filter(params);
};

/**
 * List templates joined with their overrides (paginated).
 * Triggers a background sync first (fire-and-forget).
 */
export const getTemplatesWithOverrides = async (
	params: {
		userId: number;
		page?: number;
		page_size?: number;
		priority?: string | null;
		category?: number | string | null;
		start_date?: string;
		end_date?: string;
		ordering?:
			| 'start_datetime'
			| '-start_datetime'
			| 'created_at'
			| '-created_at'
			| 'title'
			| '-title';
	},
) => {
	// Fire-and-forget background sync
	fullSync().catch(() => {});

	return TaskTemplateRepository.getTaskOverrides(params);
};

/* ═══════════════════════════════════════════════════════════
   SYNC ENGINE — PUSH (queue flush)
   ═══════════════════════════════════════════════════════════ */

/**
 * Replay every queued operation in FIFO order.
 * Returns localId → serverId map for ID remapping.
 */
export const processQueue = async (): Promise<Map<string, string>> => {
	const idMap = new Map<string, string>();
	const items = await SyncQueueRepository.getAll();

	for (const item of items) {
		if ((item.retryCount ?? 0) >= MAX_RETRIES) {
			console.warn(`[sync] skipping item ${item.id} after ${MAX_RETRIES} retries`);
			continue;
		}

		const payload = JSON.parse(item.payload);

		// Remap IDs that changed in an earlier iteration
		let effectiveId = item.localId;
		if (idMap.has(effectiveId)) {
			effectiveId = idMap.get(effectiveId)!;
		}

		try {
			switch (`${item.operation}:${item.entityType}`) {
				/* ── TEMPLATE CREATE ──────────────────────── */
				case 'CREATE:TASK_TEMPLATE': {
					const serverTask = await apiCreateTemplate(payload as TaskTemplate);
					const serverId = String(serverTask.id);

					// Remap template ID
					if (effectiveId !== serverId) {
						await replaceLocalTemplateId(effectiveId, serverId);
						idMap.set(item.localId, serverId);
					}

					// Merge overrides: keep non-PENDING locals, take server for PENDING
					const ovMap = await mergeOverridesAfterCreate(
						serverId,
						(serverTask.overrides ?? []) as TaskOverride[],
					);
					for (const [localOvId, serverOvId] of ovMap) {
						idMap.set(localOvId, serverOvId);
					}

					// Save template + categories from server
					const tplData: NewTaskTemplate = {
						id: serverId,
						userId: serverTask.userId,
						title: serverTask.title,
						priority: serverTask.priority ?? 'none',
						emoji: serverTask.emoji ?? null,
						startDatetime: serverTask.startDatetime,
						reminderTime: serverTask.reminderTime ?? null,
						durationMinutes: serverTask.durationMinutes ?? null,
						isRecurring: serverTask.isRecurring ?? false,
						rrule: serverTask.rrule ?? null,
						timezone: serverTask.timezone ?? getCurrentTimezone(),
						isDeleted: serverTask.isDeleted ?? false,
						createdAt: serverTask.createdAt ?? new Date().toISOString(),
						updatedAt: serverTask.updatedAt ?? new Date().toISOString(),
					};
					await TaskTemplateRepository.update(serverId, tplData);

					if (serverTask.categories?.length) {
						await saveCategoriesToLocal(serverId, serverTask.categories);
					}
					break;
				}

				/* ── TEMPLATE UPDATE ──────────────────────── */
				case 'UPDATE:TASK_TEMPLATE': {
					const serverTask = await apiPatchTask(effectiveId, payload as Partial<TaskTemplate>);

					// Merge overrides (same logic: keep non-PENDING)
					if (serverTask.overrides) {
						for (const ov of serverTask.overrides) {
							await mergeOverride(effectiveId, ov as TaskOverride);
						}
					}

					// Update template
					const tplData: NewTaskTemplate = {
						id: effectiveId,
						userId: serverTask.userId,
						title: serverTask.title,
						priority: serverTask.priority ?? 'none',
						emoji: serverTask.emoji ?? null,
						startDatetime: serverTask.startDatetime,
						reminderTime: serverTask.reminderTime ?? null,
						durationMinutes: serverTask.durationMinutes ?? null,
						isRecurring: serverTask.isRecurring ?? false,
						rrule: serverTask.rrule ?? null,
						timezone: serverTask.timezone ?? getCurrentTimezone(),
						isDeleted: serverTask.isDeleted ?? false,
						createdAt: serverTask.createdAt ?? new Date().toISOString(),
						updatedAt: serverTask.updatedAt ?? new Date().toISOString(),
					};
					await TaskTemplateRepository.update(effectiveId, tplData);

					if (serverTask.categories?.length) {
						await saveCategoriesToLocal(effectiveId, serverTask.categories);
					}
					break;
				}

				/* ── TEMPLATE DELETE ──────────────────────── */
				case 'DELETE:TASK_TEMPLATE': {
					await apiDeleteTask(effectiveId);
					break;
				}

				/* ── OVERRIDE UPDATE ──────────────────────── */
				case 'UPDATE:TASK_OVERRIDE': {
					const tplId = idMap.get(payload.templateId) ?? payload.templateId;
					const ovId = idMap.get(effectiveId) ?? effectiveId;
					await apiPatchTaskOverride(
						tplId,
						ovId,
						{ status: payload.status, new_datetime: payload.new_datetime },
					);
					break;
				}

				default:
					console.warn('[sync] unknown queue item', item.operation, item.entityType);
			}

			await SyncQueueRepository.deleteById(item.id);
		} catch (error: any) {
			console.error(`[sync] queue item ${item.id} failed`, error);

			const db = await getDrizzleDb();
			const { syncQueue } = await import('../../DB/schema');
			await db
				.update(syncQueue)
				.set({
					retryCount: (item.retryCount ?? 0) + 1,
					lastError: error?.message ?? 'Unknown error',
				})
				.where(eq(syncQueue.id, item.id));
		}
	}

	return idMap;
};

/* ═══════════════════════════════════════════════════════════
   SYNC ENGINE — PULL (delta)
   ═══════════════════════════════════════════════════════════ */

/**
 * Pull tasks updated after lastSyncDate.
 * Template: last updatedAt wins.
 * Overrides: keep local if non-PENDING, else take server.
 */
export const pullFromServer = async (): Promise<void> => {
	const meta = await AppMetaRepository.get(LAST_SYNC_KEY);
	const lastSync = meta?.value ?? undefined;
	const syncStartedAt = new Date().toISOString();

	let page = 1;
	let hasMore = true;

	while (hasMore) {
		const request: getTasksRequest = {
			page,
			page_size: 100,
			...(lastSync ? { updated_after: lastSync } : {}),
		};

		const response: getTasksResponse<TaskTemplate> = await apiGetTasks(request);

		for (const task of response.results) {
			await mergeServerTaskToLocal(task);
		}

		hasMore = response.next !== null;
		page += 1;
	}

	await AppMetaRepository.set(LAST_SYNC_KEY, syncStartedAt);
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
export const fullSync = async (): Promise<void> => {
	if (!isOnline()) {
		console.log('[sync] offline — skipping');
		return;
	}

	console.log('[sync] starting full sync…');

	try {
		await processQueue();
		await pullFromServer();
		console.log('[sync] complete');
	} catch (error) {
		console.error('[sync] failed', error);
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
