import {
  pgTable,
  text,
  bigint,
  json,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const packages = pgTable('packages', {
  name: text('name').primaryKey().notNull(),
  packument: text('packument').$type<string>().notNull(),
  headers: json('headers').$type<Record<string, string>>().notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
})

export const versions = pgTable('versions', {
  spec: text('spec').primaryKey().notNull(),
  manifest: text('manifest').$type<string>().notNull(),
  headers: json('headers').$type<Record<string, string>>().notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
})

export const tarballs = pgTable(
  'tarballs',
  {
    name: text('name').notNull(),
    version: text('version'),
    filename: text('filename').notNull(),
    headers: json('headers')
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  table => [primaryKey({ columns: [table.name, table.filename] })],
)

export const tokens = pgTable('tokens', {
  token: text('token').primaryKey(),
  uuid: text('uuid').notNull(),
  scope: text('scope').$type<string>(),
  created: bigint('created', { mode: 'number' }).notNull(),
  expires: bigint('expires', { mode: 'number' }),
})

export const loginSessions = pgTable('login_sessions', {
  sessionId: text('session_id').primaryKey(),
  token: text('token'),
  clerkUserId: text('clerk_user_id'),
  doneUrl: text('done_url'),
  created: bigint('created', { mode: 'number' }).notNull(),
  expires: bigint('expires', { mode: 'number' }).notNull(),
})

export type Package = typeof packages.$inferSelect
export type Version = typeof versions.$inferSelect
export type Tarball = typeof tarballs.$inferSelect
export type Token = typeof tokens.$inferSelect
export type LoginSession = typeof loginSessions.$inferSelect
