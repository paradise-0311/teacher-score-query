import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(), title: text('title').notNull(), date: text('date').notNull(),
  maxScore: real('max_score').notNull(), scope: text('scope').notNull(), provisional: integer('provisional').notNull(),
  publication: text('publication').notNull(), updatedAt: text('updated_at').notNull(), publishedAt: text('published_at'),
});
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(), examId: text('exam_id').notNull().references(() => exams.id),
  name: text('name').notNull(), lookupName: text('lookup_name').notNull(), department: text('department').notNull(),
  subject: text('subject').notNull(), venue: text('venue').notNull(), status: text('status').notNull(), score: real('score'),
}, table => [index('participant_exam_name').on(table.examId, table.lookupName)]);
