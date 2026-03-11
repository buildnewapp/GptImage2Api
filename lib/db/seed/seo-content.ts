import { loadEnvConfig } from '@next/env'
import 'dotenv/config'
import { and, asc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { posts, user } from '../schema'
import { seoContentSeedEntries } from './seo-content-data'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

async function resolveAuthorId(db: ReturnType<typeof drizzle>) {
  const preferredEmail = process.env.SEO_CONTENT_SEED_AUTHOR_EMAIL?.trim().toLowerCase()

  if (preferredEmail) {
    const [preferredAuthor] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, preferredEmail))
      .limit(1)

    if (!preferredAuthor) {
      throw new Error(
        `SEO_CONTENT_SEED_AUTHOR_EMAIL is set to "${preferredEmail}" but no matching user exists`,
      )
    }

    return preferredAuthor.id
  }

  const [adminAuthor] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.role, 'admin'))
    .orderBy(asc(user.createdAt))
    .limit(1)

  if (adminAuthor) {
    return adminAuthor.id
  }

  const [fallbackAuthor] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .orderBy(asc(user.createdAt))
    .limit(1)

  if (!fallbackAuthor) {
    throw new Error('Cannot seed SEO content because the user table is empty')
  }

  return fallbackAuthor.id
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  console.log('🌱 Seeding SEO content...\n')
  console.log(`📝 Found ${seoContentSeedEntries.length} SEO content entries`)

  const client = postgres(connectionString)
  const db = drizzle(client)

  try {
    const authorId = await resolveAuthorId(db)
    console.log(`👤 Using author ${authorId}`)

    for (const entry of seoContentSeedEntries) {
      await db
        .insert(posts)
        .values({
          language: entry.language,
          postType: entry.postType,
          authorId,
          title: entry.title,
          slug: entry.slug,
          content: entry.content,
          description: entry.description,
          metadataJsonb: entry.metadataJsonb,
          featuredImageUrl: entry.featuredImageUrl,
          isPinned: entry.isPinned,
          status: entry.status,
          visibility: entry.visibility,
          publishedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [posts.language, posts.slug, posts.postType],
          set: {
            authorId,
            title: entry.title,
            content: entry.content,
            description: entry.description,
            metadataJsonb: entry.metadataJsonb,
            featuredImageUrl: entry.featuredImageUrl,
            isPinned: entry.isPinned,
            status: entry.status,
            visibility: entry.visibility,
            publishedAt: new Date(),
            updatedAt: new Date(),
          },
        })

      console.log(`   ✓ ${entry.language} ${entry.postType} -> ${entry.slug}`)
    }

    const insertedEntries = await db
      .select({
        language: posts.language,
        postType: posts.postType,
        slug: posts.slug,
        status: posts.status,
        visibility: posts.visibility,
      })
      .from(posts)
      .where(
        and(
          eq(posts.status, 'published'),
          eq(posts.visibility, 'public'),
        ),
      )

    const seededSlugs = new Set(seoContentSeedEntries.map((entry) => entry.slug))
    const seededRows = insertedEntries.filter((entry) => seededSlugs.has(entry.slug))

    console.log(`\n✅ Upserted ${seededRows.length} SEO content rows`)
  } catch (error) {
    console.error('\n❌ An error occurred while seeding SEO content:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
