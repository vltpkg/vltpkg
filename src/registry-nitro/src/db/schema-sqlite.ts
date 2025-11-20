import {
  sqliteTable,
  text,
  numeric,
  primaryKey,
} from 'drizzle-orm/sqlite-core'

export const packages = sqliteTable('packages', {
  name: text('name').primaryKey().notNull(),
  packument: text('packument').$type<string>().notNull(),
  headers: text('headers', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull(),
  updatedAt: numeric('updated_at').notNull(),
})

export const versions = sqliteTable('versions', {
  spec: text('spec').primaryKey().notNull(),
  manifest: text('manifest').$type<string>().notNull(),
  headers: text('headers', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull(),
  updatedAt: numeric('updated_at').notNull(),
})

export const tarballs = sqliteTable(
  'tarballs',
  {
    name: text('name').notNull(),
    version: text('version'),
    filename: text('filename').notNull(),
    headers: text('headers', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: numeric('updated_at').notNull(),
  },
  table => [primaryKey({ columns: [table.name, table.filename] })],
)

export const tokens = sqliteTable('tokens', {
  token: text('token').primaryKey(),
  uuid: text('uuid').notNull(),
  scope: text('scope').$type<string>(),
  created: numeric('created').notNull(),
  expires: numeric('expires'),
})

export const loginSessions = sqliteTable('login_sessions', {
  sessionId: text('session_id').primaryKey(),
  token: text('token'),
  clerkUserId: text('clerk_user_id'),
  doneUrl: text('done_url'),
  created: numeric('created').notNull(),
  expires: numeric('expires').notNull(),
})

export type Package = typeof packages.$inferSelect
export type Version = typeof versions.$inferSelect
export type Tarball = typeof tarballs.$inferSelect
export type Token = typeof tokens.$inferSelect
export type LoginSession = typeof loginSessions.$inferSelect
