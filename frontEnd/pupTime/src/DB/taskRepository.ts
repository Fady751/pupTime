import { getDatabase } from './database';
import { Task, TaskRepetition } from '../types/task';
import { Category } from '../types/category';

export const createTask = async (task: Omit<Task, 'id'>): Promise<number> => {
  try {
    const db = await getDatabase();

    // Start transaction
    await db.execute('BEGIN TRANSACTION;');

    try {
      // Insert task
      const result = await db.execute(
        `INSERT INTO tasks 
        (user_id, title, status, reminderTime, startTime, endTime, priority, emoji) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          task.user_id,
          task.title,
          task.status,
          task.reminderTime,
          task.startTime.toISOString(),
          task.endTime ? task.endTime.toISOString() : null,
          task.priority,
          task.emoji,
        ]
      );

      const taskId = result.insertId!;

      // Insert categories
      if (task.Categorys && task.Categorys.length > 0) {
        for (const category of task.Categorys) {
          const categoryId = await ensureCategoryExists(category.name);

          await db.execute(
            'INSERT INTO task_categories (task_id, category_id) VALUES (?, ?);',
            [taskId, categoryId]
          );
        }
      }

      // Insert repetitions
      if (task.repetition && task.repetition.length > 0) {
        for (const rep of task.repetition) {
          await db.execute(
            'INSERT INTO task_repetitions (task_id, frequency, time) VALUES (?, ?, ?);',
            [taskId, rep.frequency, rep.time ? rep.time.toISOString() : null]
          );
        }
      }

      await db.execute('COMMIT;');

      return taskId;
    } catch (error) {
      await db.execute('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('[DB] Error creating task:', error);
    throw error;
  }
};

export const getTaskById = async (taskId: number): Promise<Task | null> => {
  try {
    const db = await getDatabase();

    // Get task
    const taskResult = await db.execute('SELECT * FROM tasks WHERE id = ?;', [taskId]);

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return null;
    }

    const taskRow = taskResult.rows[0];

    // Get categories
    const categoriesResult = await db.execute(
      `SELECT c.id, c.name 
       FROM categories c
       INNER JOIN task_categories tc ON c.id = tc.category_id
       WHERE tc.task_id = ?;`,
      [taskId]
    );

    const categories: Category[] = (categoriesResult.rows || []) as Category[];

    // Get repetitions
    const repetitionsResult = await db.execute(
      'SELECT frequency, time FROM task_repetitions WHERE task_id = ?;',
      [taskId]
    );

    const repetitions: TaskRepetition[] = (repetitionsResult.rows || []).map((rep: any) => ({
      frequency: rep.frequency,
      time: rep.time ? new Date(rep.time) : null,
    }));

    // Construct task object
    const task: Task = {
      id: taskRow.id as number,
      user_id: taskRow.user_id as number,
      title: taskRow.title as string,
      Categorys: categories,
      status: taskRow.status as 'pending' | 'completed',
      reminderTime: taskRow.reminderTime as number | null,
      startTime: new Date(taskRow.startTime as string),
      endTime: taskRow.endTime ? new Date(taskRow.endTime as string) : null,
      priority: taskRow.priority as 'low' | 'medium' | 'high' | 'none',
      repetition: repetitions,
      emoji: taskRow.emoji as string,
    };

    return task;
  } catch (error) {
    console.error('[DB] Error getting task by ID:', error);
    throw error;
  }
};

export const getTasksByUserId = async (userId: number): Promise<Task[]> => {
  try {
    const db = await getDatabase();

    const tasksResult = await db.execute(
      'SELECT id FROM tasks WHERE user_id = ? ORDER BY startTime DESC;',
      [userId]
    );

    const tasks: Task[] = [];
    const taskIds = tasksResult.rows || [];

    for (const row of taskIds) {
      const task = await getTaskById(row.id as number);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  } catch (error) {
    console.error('[DB] Error getting tasks by user ID:', error);
    throw error;
  }
};

export const getTasksByStatus = async (
  userId: number,
  status: 'pending' | 'completed'
): Promise<Task[]> => {
  try {
    const db = await getDatabase();

    const tasksResult = await db.execute(
      'SELECT id FROM tasks WHERE user_id = ? AND status = ? ORDER BY startTime DESC;',
      [userId, status]
    );

    const tasks: Task[] = [];
    const taskIds = tasksResult.rows || [];

    for (const row of taskIds) {
      const task = await getTaskById(row.id as number);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  } catch (error) {
    console.error('[DB] Error getting tasks by status:', error);
    throw error;
  }
};

export const updateTask = async (taskId: number, updates: Partial<Task>): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.execute('BEGIN TRANSACTION;');

    try {
      // Update basic task fields
      if (
        updates.title !== undefined ||
        updates.status !== undefined ||
        updates.reminderTime !== undefined ||
        updates.startTime !== undefined ||
        updates.endTime !== undefined ||
        updates.priority !== undefined ||
        updates.emoji !== undefined
      ) {
        const setClause: string[] = [];
        const values: any[] = [];

        if (updates.title !== undefined) {
          setClause.push('title = ?');
          values.push(updates.title);
        }
        if (updates.status !== undefined) {
          setClause.push('status = ?');
          values.push(updates.status);
        }
        if (updates.reminderTime !== undefined) {
          setClause.push('reminderTime = ?');
          values.push(updates.reminderTime);
        }
        if (updates.startTime !== undefined) {
          setClause.push('startTime = ?');
          values.push(updates.startTime.toISOString());
        }
        if (updates.endTime !== undefined) {
          setClause.push('endTime = ?');
          values.push(updates.endTime ? updates.endTime.toISOString() : null);
        }
        if (updates.priority !== undefined) {
          setClause.push('priority = ?');
          values.push(updates.priority);
        }
        if (updates.emoji !== undefined) {
          setClause.push('emoji = ?');
          values.push(updates.emoji);
        }

        setClause.push('updated_at = CURRENT_TIMESTAMP');
        values.push(taskId);

        await db.execute(`UPDATE tasks SET ${setClause.join(', ')} WHERE id = ?;`, values);
      }

      // Update categories
      if (updates.Categorys !== undefined) {
        await db.execute('DELETE FROM task_categories WHERE task_id = ?;', [taskId]);

        for (const category of updates.Categorys) {
          const categoryId = await ensureCategoryExists(category.name);
          await db.execute(
            'INSERT INTO task_categories (task_id, category_id) VALUES (?, ?);',
            [taskId, categoryId]
          );
        }
      }

      // Update repetitions
      if (updates.repetition !== undefined) {
        await db.execute('DELETE FROM task_repetitions WHERE task_id = ?;', [taskId]);

        for (const rep of updates.repetition) {
          await db.execute(
            'INSERT INTO task_repetitions (task_id, frequency, time) VALUES (?, ?, ?);',
            [taskId, rep.frequency, rep.time ? rep.time.toISOString() : null]
          );
        }
      }

      await db.execute('COMMIT;');
    } catch (error) {
      await db.execute('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('[DB] Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: number): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.execute('DELETE FROM tasks WHERE id = ?;', [taskId]);

  } catch (error) {
    console.error('[DB] Error deleting task:', error);
    throw error;
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const db = await getDatabase();

    const result = await db.execute('SELECT * FROM categories ORDER BY name;');

    return (result.rows || []) as Category[];
  } catch (error) {
    console.error('[DB] Error getting categories:', error);
    throw error;
  }
};

const ensureCategoryExists = async (categoryName: string): Promise<number> => {
  try {
    const db = await getDatabase();

    // Try to find existing category
    const result = await db.execute('SELECT id FROM categories WHERE name = ?;', [categoryName]);

    if (result.rows && result.rows.length > 0) {
      return result.rows[0].id as number;
    }

    // Create new category
    const insertResult = await db.execute('INSERT INTO categories (name) VALUES (?);', [categoryName]);

    return insertResult.insertId!;
  } catch (error) {
    console.error('[DB] Error ensuring category exists:', error);
    throw error;
  }
};

export const searchTasksByTitle = async (userId: number, searchQuery: string): Promise<Task[]> => {
  try {
    const db = await getDatabase();

    const tasksResult = await db.execute(
      'SELECT id FROM tasks WHERE user_id = ? AND title LIKE ? ORDER BY startTime DESC;',
      [userId, `%${searchQuery}%`]
    );

    const tasks: Task[] = [];
    const taskIds = tasksResult.rows || [];

    for (const row of taskIds) {
      const task = await getTaskById(row.id as number);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  } catch (error) {
    console.error('[DB] Error searching tasks:', error);
    throw error;
  }
};

export const getTasksByDateRange = async (
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<Task[]> => {
  try {
    const db = await getDatabase();

    const tasksResult = await db.execute(
      `SELECT id FROM tasks 
       WHERE user_id = ? 
       AND startTime >= ? 
       AND startTime <= ?
       ORDER BY startTime ASC;`,
      [userId, startDate.toISOString(), endDate.toISOString()]
    );

    const tasks: Task[] = [];
    const taskIds = tasksResult.rows || [];

    for (const row of taskIds) {
      const task = await getTaskById(row.id as number);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  } catch (error) {
    console.error('[DB] Error getting tasks by date range:', error);
    throw error;
  }
};
