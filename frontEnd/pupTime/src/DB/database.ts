import { open, type DB } from '@op-engineering/op-sqlite';
import { DATABASE_NAME } from '@env';

let databaseInstance: DB | null = null;

export const getDatabase = async (): Promise<DB> => {
	if (databaseInstance) {
		return databaseInstance;
	}

	try {
		const db = open({ name: DATABASE_NAME });
		databaseInstance = db;
		return db;
	} catch (error) {
		console.error('[DB] Error opening database:', error);
		throw error;
	}
};

export const closeDatabase = async (): Promise<void> => {
	if (!databaseInstance) {
		return;
	}

	try {
		databaseInstance.close();
	} catch (error) {
		console.error('[DB] Error closing database:', error);
		throw error;
	} finally {
		databaseInstance = null;
	}
};

export const dropAllTables = async (): Promise<void> => {
	const db = await getDatabase();

	await db.execute('DROP TABLE IF EXISTS task_overrides;');
	await db.execute('DROP TABLE IF EXISTS user_categories;');
	await db.execute('DROP TABLE IF EXISTS categories;');
	await db.execute('DROP TABLE IF EXISTS task_templates;');
	await db.execute('DROP TABLE IF EXISTS sync_queue;');
	await db.execute('DROP TABLE IF EXISTS app_meta;');
};

