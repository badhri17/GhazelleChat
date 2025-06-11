import { Lucia } from 'lucia'
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle'
import { db } from '../db'
import { sessions, users } from '../db/schema'

const adapter = new DrizzleSQLiteAdapter(db, sessions, users)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !import.meta.dev
    }
  },
  getUserAttributes: (attributes: { email: string; fullName: string }) => {
    return {
      email: attributes.email,
      fullName: attributes.fullName
    }
  }
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      email: string
      fullName: string
    }
  }
}

// Nitro plugin - this function will be called when the server starts
export default defineNitroPlugin(async (nitroApp) => {
  // Initialize Lucia auth
  console.log('🔐 Lucia auth initialized')
}) 