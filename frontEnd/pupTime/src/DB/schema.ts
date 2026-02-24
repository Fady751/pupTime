import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const taskTemplates = sqliteTable('task_templates', {
  id: text('id').primaryKey(),
  userId: integer('user_id'),
  title: text('title').notNull(),
  priority: text('priority').default('none'),
  emoji: text('emoji'),
  startDatetime: text('start_datetime'),
  reminderTime: integer('reminder_time'),
  durationMinutes: integer('duration_minutes'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  rrule: text('rrule'),
  timezone: text('timezone').default('UTC'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
}, (table) => ({
  userIdIdx: index('idx_templates_user_id').on(table.userId),
  priorityIdx: index('idx_templates_priority').on(table.priority),
}));

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const userCategories = sqliteTable('user_categories', {
  userId: integer('user_id').notNull(),
  categoryId: integer('category_id').notNull(),
});

export const taskTemplateCategories = sqliteTable('task_template_categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	templateId: text('template_id').notNull(),
	categoryId: integer('category_id').notNull(),
}, (table) => ({
    templateIdIdx: index('idx_cat_template_id').on(table.templateId),
    categoryIdIdx: index('idx_cat_category_id').on(table.categoryId),
}));

export const taskOverrides = sqliteTable('task_overrides', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull(),
  instanceDatetime: text('instance_datetime').notNull(),
  status: text('status').default('PENDING'),
  newDatetime: text('new_datetime'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
}, (table) => ({
  templateIdIdx: index('idx_overrides_template_id').on(table.templateId),
  
  instanceTimeIdx: index('idx_overrides_instance_time').on(table.instanceDatetime),
  
  templateTimeIdx: index('idx_overrides_template_time').on(table.templateId, table.instanceDatetime),
}));

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  operation: text('operation').notNull(),
  entityType: text('entity_type').notNull(),
  localId: text('local_id').notNull(),
  payload: text('payload').notNull(),
  retryCount: integer('retry_count').default(0),
  lastError: text('last_error'),
  createdAt: text('created_at'),
});

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
});

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;

export type TaskOverride = typeof taskOverrides.$inferSelect;
export type NewTaskOverride = typeof taskOverrides.$inferInsert;

export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type NewSyncQueueItem = typeof syncQueue.$inferInsert;

export type AppMetaItem = typeof appMeta.$inferSelect;
export type NewAppMetaItem = typeof appMeta.$inferInsert;

export type TaskTemplateCategory = typeof taskTemplateCategories.$inferSelect;
export type NewTaskTemplateCategory = typeof taskTemplateCategories.$inferInsert;
