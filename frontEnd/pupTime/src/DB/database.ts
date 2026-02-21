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

    await initializeTables(db);

    return db;
  } catch (error) {
    console.error('[DB] Error opening database:', error);
    throw error;
  }
};

const initializeTables = async (db: DB): Promise<void> => {
  try {
    // Create Categories table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `);

    // Create Tasks table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        reminderTime INTEGER,
        startTime TEXT NOT NULL,
        endTime TEXT,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'none')) DEFAULT 'none',
        emoji TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create TaskCategories junction table (many-to-many relationship)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS task_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(task_id, category_id)
      );
    `);

    // Create TaskRepetitions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS task_repetitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN (
          'once', 'daily', 'weekly', 'monthly', 'yearly',
          'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
        )),
        time TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);

    // Create TaskCompletions table (sparse: only dates actually completed)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        completion_time TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for better query performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_task_categories_task_id ON task_categories(task_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_task_repetitions_task_id ON task_repetitions(task_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_task_completions_date ON task_completions(date);
    `);

    // Create Sync Queue table for offline operations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('create', 'update', 'delete', 'complete', 'uncomplete')),
        task_id TEXT,
        data TEXT,
        timestamp INTEGER NOT NULL,
        retries INTEGER NOT NULL DEFAULT 0
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_task_id ON sync_queue(task_id);
    `);

  } catch (error) {
    console.error('[DB] Error creating tables:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (databaseInstance) {
    try {
      databaseInstance.close();
      databaseInstance = null;
    } catch (error) {
      console.error('[DB] Error closing database:', error);
      throw error;
    }
  }
};

export const dropAllTables = async (): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.execute('DROP TABLE IF EXISTS task_completions;');
    await db.execute('DROP TABLE IF EXISTS task_repetitions;');
    await db.execute('DROP TABLE IF EXISTS task_categories;');
    await db.execute('DROP TABLE IF EXISTS categories;');
    await db.execute('DROP TABLE IF EXISTS tasks;');
    await db.execute('DROP TABLE IF EXISTS sync_queue;');

    // Reinitialize tables
    await initializeTables(db);
  } catch (error) {
    console.error('[DB] Error dropping tables:', error);
    throw error;
  }
};

// export const getDatabaseStats = async (): Promise<{
//   tasksCount: number;
//   categoriesCount: number;
// }> => {
//   try {
//     const db = await getDatabase();

//     const tasksResult = await db.execute('SELECT COUNT(*) as count FROM tasks;');
//     const categoriesResult = await db.execute('SELECT COUNT(*) as count FROM categories;');

//     return {
//       tasksCount: (tasksResult.rows[0]?.count as number) || 0,
//       categoriesCount: (categoriesResult.rows[0]?.count as number) || 0,
//     };
//   } catch (error) {
//     console.error('[DB] Error getting database stats:', error);
//     throw error;
//   }
// };
