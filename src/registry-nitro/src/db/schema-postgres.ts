import { pgTable, text, bigint } from 'drizzle-orm/pg-core'

export const packageResponses = pgTable('package_responses', {
  key: text('key').primaryKey().notNull(),
  value: text('value').$type<string>().notNull(),
  expires: bigint('expires', { mode: 'number' }).notNull(),
  mtime: bigint('mtime', { mode: 'number' }).notNull(),
  integrity: text('integrity').notNull(),
  package_name: text('package_name').notNull(),
  package_version: text('package_version'),
})

export const tarballResponses = pgTable('tarball_responses', {
  key: text('key').primaryKey().notNull(),
  value: text('value').$type<string>().notNull(),
  expires: bigint('expires', { mode: 'number' }).notNull(),
  mtime: bigint('mtime', { mode: 'number' }).notNull(),
  integrity: text('integrity').notNull(),
})

export const packages = pgTable('packages', {
  name: text('name').primaryKey().notNull(),
  packument: text('packument').$type<string>().notNull(),
})

export const versions = pgTable('versions', {
  spec: text('spec').primaryKey().notNull(),
  manifest: text('manifest').$type<string>().notNull(),
})

export const tokens = pgTable('tokens', {
  token: text('token').primaryKey(),
  uuid: text('uuid').notNull(),
  scope: text('scope').$type<string>(),
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
