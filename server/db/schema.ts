import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
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
})

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  model: text('model'), 
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)

export const insertConversationSchema = createInsertSchema(conversations)
export const selectConversationSchema = createSelectSchema(conversations)

export const insertMessageSchema = createInsertSchema(messages)
export const selectMessageSchema = createSelectSchema(messages)

export type User = z.infer<typeof selectUserSchema>
export type Conversation = z.infer<typeof selectConversationSchema>
export type Message = z.infer<typeof selectMessageSchema> 