import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

export const client = createClient({
  url: process.env.DATABASE_URL || 'file:./db.sqlite'
})

export const db = drizzle(client, { schema })

// Export types
export type DB = typeof db 