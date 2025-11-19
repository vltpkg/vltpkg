import { sqliteTable, text, numeric } from 'drizzle-orm/sqlite-core'

export const packageResponses = sqliteTable('package_responses', {
  key: text('key').primaryKey().notNull(),
  value: text('value').$type<string>().notNull(),
  expires: numeric('expires').notNull(),
  mtime: numeric('mtime').notNull(),
  integrity: text('integrity').notNull(),
  package_name: text('package_name').notNull(),
  package_version: text('package_version'),
})

export const tarballResponses = sqliteTable('tarball_responses', {
  key: text('key').primaryKey().notNull(),
  value: text('value').$type<string>().notNull(),
  expires: numeric('expires').notNull(),
  mtime: numeric('mtime').notNull(),
  integrity: text('integrity').notNull(),
})

export const packages = sqliteTable('packages', {
  name: text('name').primaryKey().notNull(),
  packument: text('packument').$type<string>().notNull(),
})

export const versions = sqliteTable('versions', {
  spec: text('spec').primaryKey().notNull(),
  manifest: text('manifest').$type<string>().notNull(),
})

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
export type Token = typeof tokens.$inferSelect
export type LoginSession = typeof loginSessions.$inferSelect
