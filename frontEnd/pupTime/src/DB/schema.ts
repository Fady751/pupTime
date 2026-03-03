import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const taskTemplates = sqliteTable('task_templates', {
  id: text('id').primaryKey(),
  user_id: integer('user_id'),
  title: text('title').notNull(),
  priority: text('priority').default('none'),
  emoji: text('emoji'),
  start_datetime: text('start_datetime'),
  reminder_time: integer('reminder_time'),
  duration_minutes: integer('duration_minutes'),
  is_recurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  rrule: text('rrule'),
  timezone: text('timezone').default('UTC'),
  is_deleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
}, (table) => ({
  user_id_idx: index('idx_templates_user_id').on(table.user_id),
  priority_idx: index('idx_templates_priority').on(table.priority),
}));

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const userCategories = sqliteTable('user_categories', {
  user_id: integer('user_id').notNull(),
  category_id: integer('category_id').notNull(),
});

export const taskTemplateCategories = sqliteTable('task_template_categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	template_id: text('template_id').notNull(),
	category_id: integer('category_id').notNull(),
}, (table) => ({
    template_id_idx: index('idx_cat_template_id').on(table.template_id),
    category_id_idx: index('idx_cat_category_id').on(table.category_id),
}));

export const taskOverrides = sqliteTable('task_overrides', {
  id: text('id').primaryKey(),
  template_id: text('template_id').notNull(),
  instance_datetime: text('instance_datetime').notNull(),
  status: text('status').default('PENDING'),
  new_datetime: text('new_datetime'),
  is_deleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
}, (table) => ({
  template_id_idx: index('idx_overrides_template_id').on(table.template_id),
  
  instance_time_idx: index('idx_overrides_instance_time').on(table.instance_datetime),
  
  template_time_unique: uniqueIndex('uq_overrides_template_time').on(table.template_id, table.instance_datetime),
}));

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  operation: text('operation').notNull(),
  entity_type: text('entity_type').notNull(),
  local_id: text('local_id').notNull(),
  payload: text('payload').notNull(),
  retry_count: integer('retry_count').default(0),
  last_error: text('last_error'),
  created_at: text('created_at'),
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
