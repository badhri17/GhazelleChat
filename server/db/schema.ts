import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  hashedPassword: text('hashed_password').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}))

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdUpdatedAtIdx: index('conversations_user_id_updated_at_idx').on(table.userId, table.updatedAt),
}))

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  model: text('model'), 
  status: text('status', { enum: ['complete', 'incomplete', 'streaming'] }).default('complete'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  conversationIdCreatedAtIdx: index('messages_conversation_id_created_at_idx').on(table.conversationId, table.createdAt),
  statusIdx: index('messages_status_idx').on(table.status),
}))
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  messageIdIdx: index('attachments_message_id_idx').on(table.messageId),
}))

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export const insertConversationSchema = createInsertSchema(conversations)
export const selectConversationSchema = createSelectSchema(conversations)

export const insertMessageSchema = createInsertSchema(messages)
export const selectMessageSchema = createSelectSchema(messages)

// Zod schemas for attachments
export const insertAttachmentSchema = createInsertSchema(attachments)
export const selectAttachmentSchema = createSelectSchema(attachments)

export type User = z.infer<typeof selectUserSchema>
export type Conversation = z.infer<typeof selectConversationSchema>
export type Message = z.infer<typeof selectMessageSchema>
export type Attachment = z.infer<typeof selectAttachmentSchema> 