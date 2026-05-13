import { loadEnvConfig } from '@next/env'
import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { hashPassword } from 'better-auth/crypto'
import postgres from 'postgres'
import { account, user } from '../schema'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const ADMIN_PASSWORD = 'Jj123456'

async function main() {
  const connectionString = process.env.DATABASE_URL
  const adminEmail = process.env.ADMIN_EMAIL?.trim()
  const adminName = process.env.ADMIN_NAME?.trim()

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL environment variable is not set')
  }

  if (!adminName) {
    throw new Error('ADMIN_NAME environment variable is not set')
  }

  const client = postgres(connectionString)
  const db = drizzle(client)

  try {
    const passwordHash = await hashPassword(ADMIN_PASSWORD)
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1)

    let userId = existingUser[0]?.id

    if (userId) {
      await db
        .update(user)
        .set({
          name: adminName,
          role: 'admin',
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
    } else {
      const insertedUser = await db
        .insert(user)
        .values({
          email: adminEmail,
          name: adminName,
          role: 'admin',
          emailVerified: true,
        })
        .returning({ id: user.id })

      userId = insertedUser[0]?.id
    }

    if (!userId) {
      throw new Error('Failed to create admin user')
    }

    const existingAccount = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
      .limit(1)

    if (existingAccount[0]) {
      await db
        .update(account)
        .set({
          accountId: userId,
          providerId: 'credential',
          password: passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(account.id, existingAccount[0].id))
    } else {
      await db.insert(account).values({
        userId,
        accountId: userId,
        providerId: 'credential',
        password: passwordHash,
      })
    }

    console.log(`Admin user initialized: ${adminEmail}`)
  } catch (error) {
    console.error('Failed to initialize admin user:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
