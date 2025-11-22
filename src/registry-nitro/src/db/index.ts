import type { Context as LibSQLContext } from './libsql.ts'
import type { Context as NeonContext } from './neon.ts'
import type * as SQLite from './schema-sqlite.ts'
import type * as PG from './schema-pg.ts'
import { useRuntimeConfig } from 'nitro/runtime-config'
import createNeon from './neon.ts'
import createLibsql from './libsql.ts'

export type Context = LibSQLContext | NeonContext

export type Package = SQLite.Package | PG.Package

export type Version = SQLite.Version | PG.Version

export type Tarball = SQLite.Tarball | PG.Tarball

export const neon = createNeon

export const libsql = createLibsql

export const getDb = () => {
  const config = useRuntimeConfig()

  if (config.database === 'neon') {
    return createNeon(process.env.NEON_DATABASE_URL!)
  }
  if (config.database === 'sqlite') {
    return createLibsql(process.env.SQLITE_DATABASE_FILE_NAME!)
  }

  throw new Error(`Invalid database type: ${config.db}`)
}
