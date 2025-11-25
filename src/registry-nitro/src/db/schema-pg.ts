import {
  pgTable,
  text,
  bigint,
  json,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const packages = pgTable(
  'packages',
  {
    name: text('name').notNull(),
    packument: text('packument').$type<string>().notNull(),
    headers: json('headers')
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    origin: text('origin').notNull(),
  },
  table => [primaryKey({ columns: [table.name, table.origin] })],
)

export const versions = pgTable(
  'versions',
  {
    name: text('name').notNull(),
    version: text('version').notNull(),
    manifest: text('manifest').$type<string>().notNull(),
    headers: json('headers')
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    origin: text('origin').notNull(),
  },
  table => [
    primaryKey({
      columns: [table.name, table.version, table.origin],
    }),
    index('versions_name_origin_idx').on(table.name, table.origin),
  ],
)

export const tarballs = pgTable(
  'tarballs',
  {
    name: text('name').notNull(),
    version: text('version').notNull(),
    headers: json('headers')
      .$type<Record<string, string>>()
      .notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
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
