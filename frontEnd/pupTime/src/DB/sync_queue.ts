import { getDatabase } from './database';

export type SyncQueueType = 'create' | 'update' | 'delete' | 'complete' | 'uncomplete';

export type SyncQueueItem = {
	id: number;
	type: SyncQueueType;
	task_id: string | null;
	data: any | null;
	timestamp: number;
	retries: number;
};

type RawSyncQueueRow = {
	id: number;
	type: SyncQueueType;
	task_id: string | null;
	data: string | null;
	timestamp: number;
	retries: number;
};

const mapRowToItem = (row: RawSyncQueueRow): SyncQueueItem => {
	let parsedData: any | null = null;

	if (row.data != null) {
		try {
			parsedData = JSON.parse(row.data);
		} catch (error) {
            console.error(`[DB] Error parsing sync_queue data for item ID ${row.id}:`, error);
			parsedData = row.data;
		}
	}

	return {
		id: row.id,
		type: row.type,
		task_id: row.task_id,
		data: parsedData,
		timestamp: row.timestamp,
		retries: row.retries,
	};
};

export const addToSyncQueue = async (params: {
	type: SyncQueueType;
	taskId?: string | null;
	data?: unknown;
}): Promise<number> => {
	const { type, taskId = null, data } = params;

	try {
		const db = await getDatabase();
		const timestamp = Date.now();
		const serializedData = data != null ? JSON.stringify(data) : null;

		const result = await db.execute(
			`INSERT INTO sync_queue (type, task_id, data, timestamp, retries)
			 VALUES (?, ?, ?, ?, 0);`,
			[type, taskId, serializedData, timestamp]
		);

		return result.insertId!;
	} catch (error) {
		console.error('[DB] Error adding to sync_queue:', error);
		throw error;
	}
};

export const queueCreateTask = async (
	taskId: string,
	payload: unknown
): Promise<number> => {
	return addToSyncQueue({ type: 'create', taskId, data: payload });
};

export const queueUpdateTask = async (
	taskId: string,
	payload: unknown
): Promise<number> => {
	return addToSyncQueue({ type: 'update', taskId, data: payload });
};

export const queueDeleteTask = async (taskId: string): Promise<number> => {
	return addToSyncQueue({ type: 'delete', taskId });
};

export const queueCompleteTask = async (
	taskId: string,
	payload: { completion_time: string; date: string },
): Promise<number> => {
	console.log(`[Sync] Queueing completion for task ${taskId} with payload:`, payload);
	return addToSyncQueue({ type: 'complete', taskId, data: payload });
};

export const queueUncompleteTask = async (
	taskId: string,
	payload: { date: string },
): Promise<number> => {
	return addToSyncQueue({ type: 'uncomplete', taskId, data: payload });
};

export const getPendingSyncItems = async (
	limit?: number
): Promise<SyncQueueItem[]> => {
	try {
		const db = await getDatabase();

		const queryBase =
			'SELECT id, type, task_id, data, timestamp, retries FROM sync_queue ORDER BY timestamp ASC';

		const result = limit
			? await db.execute(`${queryBase} LIMIT ?;`, [limit])
			: await db.execute(`${queryBase};`);

		const rows = (result.rows || []) as RawSyncQueueRow[];

		return rows.map(mapRowToItem);
	} catch (error) {
		console.error('[DB] Error getting pending sync items:', error);
		throw error;
	}
};

export const removeSyncItem = async (id: number): Promise<void> => {
	try {
		const db = await getDatabase();
		await db.execute('DELETE FROM sync_queue WHERE id = ?;', [id]);
	} catch (error) {
		console.error('[DB] Error removing sync item:', error);
		throw error;
	}
};

export const clearSyncQueue = async (): Promise<void> => {
	try {
		const db = await getDatabase();
		await db.execute('DELETE FROM sync_queue;');
	} catch (error) {
		console.error('[DB] Error clearing sync_queue:', error);
		throw error;
	}
};

export const incrementSyncItemRetries = async (id: number): Promise<void> => {
	try {
		const db = await getDatabase();
		await db.execute('UPDATE sync_queue SET retries = retries + 1 WHERE id = ?;', [id]);
	} catch (error) {
		console.error('[DB] Error incrementing sync item retries:', error);
		throw error;
	}
};

export const deleteSyncItemsForTask = async (taskId: string): Promise<void> => {
	try {
		const db = await getDatabase();
		await db.execute('DELETE FROM sync_queue WHERE task_id = ?;', [taskId]);
	} catch (error) {
		console.error('[DB] Error deleting sync items for task:', error);
		throw error;
	}
};

