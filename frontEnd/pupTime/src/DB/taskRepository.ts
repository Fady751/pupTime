import { getDatabase } from './database';
import { Task, TaskRepetition, TaskCompletion, toLocalDateString } from '../types/task';
import { Category } from '../types/category';

export const createTask = async (task: Omit<Task, 'id'>): Promise<number> => {
  try {
    const db = await getDatabase();

    await db.execute('BEGIN TRANSACTION;');

    try {
      const result = await db.execute(
        `INSERT INTO tasks 
        (user_id, title, reminderTime, startTime, endTime, priority, emoji) 
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          task.user_id,
          task.title,
          task.reminderTime,
          task.startTime.toString(),
          task.endTime ? task.endTime.toString() : null,
          task.priority,
          task.emoji,
        ]
      );

      const taskId = result.insertId!;

      if (task.Categorys && task.Categorys.length > 0) {
        for (const category of task.Categorys) {
          const categoryId = await ensureCategoryExists(category.name, category.id);

          await db.execute(
            'INSERT INTO task_categories (task_id, category_id) VALUES (?, ?);',
            [taskId, categoryId]
          );
        }
      }

      if (task.repetition && task.repetition.length > 0) {
        for (const rep of task.repetition) {
          await db.execute(
            'INSERT INTO task_repetitions (task_id, frequency, time) VALUES (?, ?, ?);',
            [taskId, rep.frequency, rep.time ? rep.time.toString() : null]
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

export const getTaskById = async (taskId: string): Promise<Task | null> => {
  try {
    const db = await getDatabase();

    const taskResult = await db.execute('SELECT * FROM tasks WHERE id = ?;', [taskId]);

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return null;
    }

    const taskRow = taskResult.rows[0];

    const categoriesResult = await db.execute(
      `SELECT c.id, c.name 
       FROM categories c
       INNER JOIN task_categories tc ON c.id = tc.category_id
       WHERE tc.task_id = ?;`,
      [taskId]
    );

    const categories: Category[] = (categoriesResult.rows || []) as Category[];

    const repetitionsResult = await db.execute(
      'SELECT frequency, time FROM task_repetitions WHERE task_id = ?;',
      [taskId]
    );

    const repetitions: TaskRepetition[] = (repetitionsResult.rows || []).map((rep: any) => ({
      frequency: rep.frequency,
      time: rep.time ? new Date(rep.time) : null,
    }));

    // Fetch completions for this task
    const completionsResult = await db.execute(
      'SELECT id, task_id, completion_time, date FROM task_completions WHERE task_id = ? ORDER BY date ASC;',
      [taskId]
    );

    const completions: TaskCompletion[] = (completionsResult.rows || []).map((row: any) => ({
      id: row.id as string,
      task_id: row.task_id as string,
      completion_time: new Date(row.completion_time as string),
      date: new Date(row.date as string),
    }));

    const task = {
      id: taskRow.id,
      user_id: taskRow.user_id,
      title: taskRow.title,
      Categorys: categories,
      completions,
      reminderTime: taskRow.reminderTime,
      startTime: new Date(taskRow.startTime as string),
      endTime: taskRow.endTime? new Date(taskRow.endTime as string) : null,
      priority: taskRow.priority,
      repetition: repetitions,
      emoji: taskRow.emoji,
    } as Task;

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
      const task = await getTaskById(row.id as string);
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



export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.execute('BEGIN TRANSACTION;');

    try {
      if (
        updates.title !== undefined ||
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
        if (updates.reminderTime !== undefined) {
          setClause.push('reminderTime = ?');
          values.push(updates.reminderTime);
        }
        if (updates.startTime !== undefined) {
          setClause.push('startTime = ?');
          values.push(updates.startTime.toString());
        }
        if (updates.endTime !== undefined) {
          setClause.push('endTime = ?');
          values.push(updates.endTime ? updates.endTime.toString() : null);
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

      if (updates.Categorys !== undefined) {
        await db.execute('DELETE FROM task_categories WHERE task_id = ?;', [taskId]);

        for (const category of updates.Categorys) {
          const categoryId = await ensureCategoryExists(category.name, category.id);
          await db.execute(
            'INSERT INTO task_categories (task_id, category_id) VALUES (?, ?);',
            [taskId, categoryId]
          );
        }
      }

      if (updates.repetition !== undefined) {
        await db.execute('DELETE FROM task_repetitions WHERE task_id = ?;', [taskId]);

        for (const rep of updates.repetition) {
          await db.execute(
            'INSERT INTO task_repetitions (task_id, frequency, time) VALUES (?, ?, ?);',
            [taskId, rep.frequency, rep.time ? rep.time.toString() : null]
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

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.execute('DELETE FROM tasks WHERE id = ?;', [taskId]);

  } catch (error) {
    console.error('[DB] Error deleting task:', error);
    throw error;
  }
};

export const deleteTasksByUserId = async (userId: number): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.execute(
      'DELETE FROM task_completions WHERE task_id IN (SELECT id FROM tasks WHERE user_id = ?);',
      [userId]
    );
    await db.execute(
      'DELETE FROM task_categories WHERE task_id IN (SELECT id FROM tasks WHERE user_id = ?);',
      [userId]
    );
    await db.execute(
      'DELETE FROM task_repetitions WHERE task_id IN (SELECT id FROM tasks WHERE user_id = ?);',
      [userId]
    );
    await db.execute('DELETE FROM tasks WHERE user_id = ?;', [userId]);

  } catch (error) {
    console.error('[DB] Error deleting tasks by user ID:', error);
    throw error;
  }
};

export const clearAllTaskData = async (): Promise<void> => {
  try {
    const db = await getDatabase();

    await db.execute('DELETE FROM task_completions;');
    await db.execute('DELETE FROM task_repetitions;');
    await db.execute('DELETE FROM task_categories;');
    await db.execute('DELETE FROM tasks;');
    await db.execute('DELETE FROM categories;');

  } catch (error) {
    console.error('[DB] Error clearing all task data:', error);
    throw error;
  }
};

export const createTaskWithId = async (taskId: string, task: Omit<Task, 'id'>): Promise<void> => {
  try {
    const db = await getDatabase();

    // Start transaction
    await db.execute('BEGIN TRANSACTION;');

    try {
      // Insert task with specific ID
      await db.execute(
        `INSERT INTO tasks 
        (id, user_id, title, reminderTime, startTime, endTime, priority, emoji) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          taskId,
          task.user_id,
          task.title,
          task.reminderTime,
          task.startTime.toString(),
          task.endTime ? task.endTime.toString() : null,
          task.priority,
          task.emoji,
        ]
      );

      // Insert categories
      if (task.Categorys && task.Categorys.length > 0) {
        for (const category of task.Categorys) {
          const categoryId = await ensureCategoryExists(category.name, category.id);

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
            [taskId, rep.frequency, rep.time ? rep.time.toString() : null]
          );
        }
      }

      await db.execute('COMMIT;');
    } catch (error) {
      await db.execute('ROLLBACK;');
      throw error;
    }
  } catch (error) {
    console.error('[DB] Error creating task with ID:', error);
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

export const ensureCategoryExists = async (categoryName: string, categoryId: number): Promise<number> => {
  try {
    const db = await getDatabase();

    // Try to find existing category
    const result = await db.execute('SELECT id FROM categories WHERE name = ?;', [categoryName]);

    if (result.rows && result.rows.length > 0) {
      return result.rows[0].id as number;
    }

    // Create new category
    const insertResult = await db.execute('INSERT INTO categories (id, name) VALUES (?, ?);', [categoryId, categoryName]);

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
      const task = await getTaskById(row.id as string);
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
      [userId, startDate.toString(), endDate.toString()]
    );

    const tasks: Task[] = [];
    const taskIds = tasksResult.rows || [];

    for (const row of taskIds) {
      const task = await getTaskById(row.id as string);
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

// ── Task Completion CRUD ──────────────────────────────────

/**
 * Add a completion record for a task on a specific date.
 * Uses a local ID (string) so it can be created offline and later mapped to a backend ID.
 */
export const addTaskCompletion = async (
  completion: TaskCompletion,
): Promise<void> => {
  try {
    const db = await getDatabase();
    await db.execute(
      `INSERT OR REPLACE INTO task_completions (id, task_id, completion_time, date)
       VALUES (?, ?, ?, ?);`,
      [
        completion.id,
        completion.task_id,
        completion.completion_time.toISOString(),
        toLocalDateString(completion.date),
      ],
    );
  } catch (error) {
    console.error('[DB] Error adding task completion:', error);
    throw error;
  }
};

/**
 * Remove a completion record by its ID.
 */
export const removeTaskCompletionById = async (completionId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    await db.execute('DELETE FROM task_completions WHERE id = ?;', [completionId]);
  } catch (error) {
    console.error('[DB] Error removing task completion by ID:', error);
    throw error;
  }
};

/**
 * Remove a completion record for a task on a specific date.
 */
export const removeTaskCompletionByDate = async (
  taskId: string,
  date: Date,
): Promise<void> => {
  try {
    const db = await getDatabase();
    const dateStr = toLocalDateString(date);
    await db.execute(
      'DELETE FROM task_completions WHERE task_id = ? AND date = ?;',
      [taskId, dateStr],
    );
  } catch (error) {
    console.error('[DB] Error removing task completion by date:', error);
    throw error;
  }
};

/**
 * Get all completions for a task.
 */
export const getTaskCompletions = async (taskId: string): Promise<TaskCompletion[]> => {
  try {
    const db = await getDatabase();
    const result = await db.execute(
      'SELECT id, task_id, completion_time, date FROM task_completions WHERE task_id = ? ORDER BY date ASC;',
      [taskId],
    );
    return (result.rows || []).map((row: any) => ({
      id: row.id as string,
      task_id: row.task_id as string,
      completion_time: new Date(row.completion_time as string),
      date: new Date(row.date as string),
    }));
  } catch (error) {
    console.error('[DB] Error getting task completions:', error);
    throw error;
  }
};

/**
 * Remove all completions for a given task.
 */
export const clearTaskCompletions = async (taskId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    await db.execute('DELETE FROM task_completions WHERE task_id = ?;', [taskId]);
  } catch (error) {
    console.error('[DB] Error clearing task completions:', error);
    throw error;
  }
};
