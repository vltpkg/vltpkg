import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Define the packages table
export const packages = sqliteTable('packages', {
  name: text('name').primaryKey(),
  tags: text('tags').$type<string>(), // JSON stored as string
  lastUpdated: text('last_updated'), // Timestamp for when this package was last updated
  origin: text('origin').notNull().default('local'), // 'local' or 'upstream'
  upstream: text('upstream'), // Name of upstream registry (null for local packages)
  cachedAt: text('cached_at'), // When this package was cached from upstream
})

// Define the tokens table
export const tokens = sqliteTable('tokens', {
  token: text('token').primaryKey(),
  uuid: text('uuid').notNull(),
  scope: text('scope').$type<string>(), // JSON stored as string
})

// Define the versions table
export const versions = sqliteTable('versions', {
  spec: text('spec').primaryKey(),
  manifest: text('manifest').$type<string>(), // JSON stored as string
  publishedAt: text('published_at'),
  origin: text('origin').notNull().default('local'), // 'local' or 'upstream'
  upstream: text('upstream'), // Name of upstream registry (null for local packages)
  cachedAt: text('cached_at'), // When this version was cached from upstream
})

export type Package = typeof packages.$inferSelect
export type Version = typeof versions.$inferSelect
export type Token = typeof tokens.$inferSelect

// // Default admin token
// export const defaultAdminToken = {
//   token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
//   uuid: 'admin',
//   scope: JSON.stringify([
//     {
//       values: ['*'],
//       types: {
//         pkg: { read: true, write: true },
//         user: { read: true, write: true },
//       },
//     },
//   ]),
// } as const
