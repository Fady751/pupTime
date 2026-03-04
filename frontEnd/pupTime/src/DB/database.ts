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
