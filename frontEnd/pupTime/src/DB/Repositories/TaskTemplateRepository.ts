import { eq, and, gte, lte, asc, desc, count } from 'drizzle-orm';

import { getDrizzleDb } from '../drizzleClient';
import {
  taskTemplates,
  taskOverrides,
  taskTemplateCategories,
  categories,
  type NewTaskTemplate,
  type TaskTemplate,
  type TaskOverride,
} from '../schema';

export interface GetOverridesParams {
  user_id: number;
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
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const TaskTemplateRepository = {
  async create(data: NewTaskTemplate): Promise<TaskTemplate> {
    const db = await getDrizzleDb();
    const [ row ] = await db
      .insert(taskTemplates)
      .values(data)
      .onConflictDoUpdate({
        target: taskTemplates.id,
        set: data,
      })
      .returning();
    return row;
  },

  async findById(id: string): Promise<TaskTemplate | undefined> {
    const db = await getDrizzleDb();
    const rows = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, id));
    return rows[ 0 ];
  },

  async listByUser(user_id: number): Promise<TaskTemplate[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.user_id, user_id));
  },

  async update(
    id: string,
    patch: Partial<NewTaskTemplate>
  ): Promise<TaskTemplate | undefined> {
    const db = await getDrizzleDb();
    const [ row ] = await db
      .update(taskTemplates)
      .set(patch)
      .where(eq(taskTemplates.id, id))
      .returning();
    return row;
  },

  async softDelete(id: string): Promise<void> {
    const db = await getDrizzleDb();
    await db
      .update(taskTemplates)
      .set({ is_deleted: true })
      .where(eq(taskTemplates.id, id));
  },

  async deleteByTemplateId(id: string): Promise<void> {
    const db = await getDrizzleDb();
    await db
      .delete(taskOverrides)
      .where(eq(taskOverrides.template_id, id));
  },

  async filter(options: GetOverridesParams): Promise<PaginatedResult<TaskTemplate>> {
    const db = await getDrizzleDb();
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.max(1, Math.min(options.page_size ?? 20, 100));
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(taskTemplates.user_id, options.user_id),
      eq(taskTemplates.is_deleted, false),
    ];

    if (options.priority) {
      conditions.push(eq(taskTemplates.priority, options.priority));
    }

    if (options.start_date) {
      conditions.push(gte(taskTemplates.start_datetime, options.start_date));
    }

    if (options.end_date) {
      conditions.push(lte(taskTemplates.start_datetime, options.end_date));
    }

    const whereExpr = and(...conditions);

    // Order logic
    const orderExpr = (() => {
      switch (options.ordering) {
        case 'start_datetime':
          return asc(taskTemplates.start_datetime);
        case '-start_datetime':
          return desc(taskTemplates.start_datetime);
        case 'created_at':
          return asc(taskTemplates.created_at);
        case '-created_at':
          return desc(taskTemplates.created_at);
        case 'title':
          return asc(taskTemplates.title);
        case '-title':
          return desc(taskTemplates.title);
        default:
          return desc(taskTemplates.created_at);
      }
    })();

    const [ { count: totalCount } ] = await db
      .select({ count: count() })
      .from(taskTemplates)
      .where(whereExpr);

    const total = totalCount ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    const data = await db
      .select()
      .from(taskTemplates)
      .where(whereExpr)
      .orderBy(orderExpr)
      .limit(pageSize)
      .offset(offset);

    return {
      data,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  },

  async getTaskOverrides(
    params: GetOverridesParams
  ): Promise<PaginatedResult<TaskTemplate & { overrides: TaskOverride[] }>> {
    const db = await getDrizzleDb();

    const {
      user_id,
      page = 1,
      page_size = 20,
      priority,
      category,
      start_date,
      end_date,
      ordering,
    } = params;

    const pageNum = Math.max(1, page);
    const pageSize = Math.max(1, page_size);
    const offset = (pageNum - 1) * pageSize;

    const conditions = [
      eq(taskTemplates.user_id, user_id),
      eq(taskTemplates.is_deleted, false),
    ];

    if (priority) {
      conditions.push(eq(taskTemplates.priority, priority));
    }

    if (start_date) {
      conditions.push(gte(taskOverrides.instance_datetime, start_date));
    }

    if (end_date) {
      conditions.push(lte(taskOverrides.instance_datetime, end_date));
    }

    if (category) {
      conditions.push(eq(taskTemplateCategories.category_id, Number(category)));
    }

    const whereExpr = and(...conditions);

    let query = db
      .select({
        override: taskOverrides,
        template: taskTemplates,
        category_id: categories.id,
        category_name: categories.name,
      })
      .from(taskOverrides)
      .innerJoin(taskTemplates, eq(taskOverrides.template_id, taskTemplates.id))
      .leftJoin(taskTemplateCategories, eq(taskTemplates.id, taskTemplateCategories.template_id))
      .leftJoin(categories, eq(taskTemplateCategories.category_id, categories.id))
      .$dynamic();

    query = query.where(whereExpr);

    const orderByClause = [];
    if (ordering) {
      switch (ordering) {
        case 'start_datetime':
          orderByClause.push(asc(taskOverrides.instance_datetime));
          break;
        case '-start_datetime':
          orderByClause.push(desc(taskOverrides.instance_datetime));
          break;
        case 'created_at':
          orderByClause.push(asc(taskOverrides.created_at));
          break;
        case '-created_at':
          orderByClause.push(desc(taskOverrides.created_at));
          break;
        case 'title':
          orderByClause.push(asc(taskTemplates.title));
          break;
        case '-title':
          orderByClause.push(desc(taskTemplates.title));
          break;
        default:
          orderByClause.push(desc(taskOverrides.instance_datetime));
      }
    } else {
      orderByClause.push(desc(taskOverrides.instance_datetime));
    }

    query = query.orderBy(...orderByClause);

    // 4. Execute Data Query & Transform
    const rawRows = await query.limit(pageSize).offset(offset);

    // Grouping Logic: Merge overrides + categories if they belong to the same template
    const groupedMap = new Map<string, TaskTemplate & { overrides: TaskOverride[]; categories: { id: number; name: string }[] }>();

    for (const row of rawRows) {
      const tId = row.template.id;
      if (!groupedMap.has(tId)) {
        // Initialize the template with empty overrides and categories arrays
        groupedMap.set(tId, { ...row.template, overrides: [], categories: [] });
      }
      const group = groupedMap.get(tId)!;

      // Add the override (deduplicate by id since left-join may produce duplicate rows)
      if (!group.overrides.some(o => o.id === row.override.id)) {
        group.overrides.push(row.override);
      }

      // Add category if present and not already added
      if (row.category_id != null && row.category_name != null) {
        if (!group.categories.some(c => c.id === row.category_id)) {
          group.categories.push({ id: row.category_id, name: row.category_name });
        }
      }
    }

    // Convert Map values to the specific return structure requested
    const formattedData = Array.from(groupedMap.values());

    // 5. Execute Count Query
    let countQuery = db
      .select({ count: count() })
      .from(taskOverrides)
      .innerJoin(taskTemplates, eq(taskOverrides.template_id, taskTemplates.id))
      .$dynamic();

    if (category) {
      countQuery = countQuery.innerJoin(
        taskTemplateCategories,
        eq(taskTemplates.id, taskTemplateCategories.template_id)
      );
    }

    const [ countResult ] = await countQuery.where(whereExpr);
    const total = countResult?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    // 6. Return Result
    return {
      data: formattedData,
      total,
      page: pageNum,
      page_size: pageSize,
      total_pages: totalPages,
    };
  },
};