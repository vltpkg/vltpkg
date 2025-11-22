import type * as SQLite from './schema-sqlite.ts'
import type { Context as LibSQLContext } from './libsql.ts'
import type * as PG from './schema-pg.ts'
import type { Context as NeonContext } from './neon.ts'

export type Context = LibSQLContext | NeonContext

export type Package = SQLite.Package | PG.Package

export type Version = SQLite.Version | PG.Version

export type Tarball = SQLite.Tarball | PG.Tarball
