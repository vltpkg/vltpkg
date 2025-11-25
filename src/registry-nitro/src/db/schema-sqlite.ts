import {
  sqliteTable,
  text,
  numeric,
  primaryKey,
  index,
} from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const packages = sqliteTable(
  'packages',
  {
    name: text('name').notNull(),
    packument: text('packument').$type<string>().notNull(),
    headers: text('headers', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: numeric('updated_at', { mode: 'number' }).notNull(),
    origin: text('origin').notNull(),
  },
  table => [primaryKey({ columns: [table.name, table.origin] })],
)

export const versions = sqliteTable(
  'versions',
  {
    name: text('name').notNull(),
    version: text('version').notNull(),
    manifest: text('manifest').$type<string>().notNull(),
    headers: text('headers', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: numeric('updated_at', { mode: 'number' }).notNull(),
    origin: text('origin').notNull(),
  },
  table => [
    primaryKey({
      columns: [table.name, table.version, table.origin],
    }),
    index('versions_name_origin_idx').on(table.name, table.origin),
  ],
)

export const tarballs = sqliteTable(
  'tarballs',
  {
    name: text('name').notNull(),
    version: text('version').notNull(),
    headers: text('headers', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: numeric('updated_at', { mode: 'number' }).notNull(),
    origin: text('origin').notNull(),
  },
  table => [
    primaryKey({
      columns: [table.name, table.version, table.origin],
    }),
  ],
)

export const packagesRelations = relations(packages, ({ many }) => ({
  versions: many(versions, {
    relationName: 'packageVersions',
  }),
}))

export const versionsRelations = relations(versions, ({ one }) => ({
  package: one(packages, {
    fields: [versions.name],
    references: [packages.name],
    relationName: 'packageVersions',
  }),
}))

export type Package = typeof packages.$inferSelect
export type Version = typeof versions.$inferSelect
export type Tarball = typeof tarballs.$inferSelect
