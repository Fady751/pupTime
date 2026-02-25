import type { DB } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';

import { getDatabase } from './database';
import * as schema from './schema';
// Drizzle Kit (driver: 'expo') generates this file with bundled SQL migrations
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - migrations is a generated JS module
import migrations from '../../drizzle/migrations';

let drizzleDbPromise: Promise<ReturnType<typeof createDrizzleDb>> | null = null;

const createDrizzleDb = (db: DB) => drizzle(db, { schema });

export type DrizzleDb = Awaited<ReturnType<typeof getDrizzleDb>>;

export const getDrizzleDb = async (): Promise<ReturnType<typeof createDrizzleDb>> => {
	if (!drizzleDbPromise) {
		drizzleDbPromise = (async () => {
			const rawDb = await getDatabase();
			const drizzleDb = createDrizzleDb(rawDb);
			await migrate(drizzleDb, migrations);
			return drizzleDb;
		})();
	}

	return drizzleDbPromise;
};
