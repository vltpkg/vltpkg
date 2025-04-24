#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { relative, sep } from 'node:path'
import {
  getWorkspaces,
  ignoreCatalog,
  CatalogDepTypes,
} from './utils.ts'
import type { CatalogDepType, Workspace } from './utils.ts'

const main = async () => {
  const workspaces = getWorkspaces()

  const deps = new Map<
    string,
    {
      type: CatalogDepType
      version: string
      workspace: Workspace
    }[]
  >()

  for (const ws of workspaces) {
    for (const type of CatalogDepTypes) {
      if (ignoreCatalog.workspaces({ name: ws.pj.name, type })) {
        continue
      }

      const pjDeps = ws.pj[type] ?? {}
      for (const [name, version] of Object.entries(pjDeps)) {
        if (
          typeof version !== 'string' ||
          version.startsWith('workspace:') ||
          version.startsWith('catalog:') ||
          ignoreCatalog.packages({ name, ws: ws.pj.name, type })
        ) {
          continue
        }

        const values = deps.get(name) ?? []
        values.push({
          type,
          version,
          workspace: ws,
        } as const)
        deps.set(name, values)
      }
    }
  }

  for (const [name, values] of deps.entries()) {
    if (values.length > 1) {
      console.log(name)
      for (const v of values) {
        console.log(
          `  ${v.workspace.pj.name}(${v.type === 'dependencies' ? 'prod' : 'dev'}) ${v.version}`,
        )
        const line =
          JSON.stringify(v.workspace.pj, null, 2)
            .split('\n')
            .findIndex(line =>
              new RegExp(`^\\s*"${name}"\\s*:\\s*`).exec(line),
            ) + 1
        console.log(
          `    .${sep}${relative(process.cwd(), v.workspace.pkgPath)}:${line}`,
        )
      }
      console.log('-'.repeat(40))
    }
  }
}

/**
 * Run this script to find dependencies that are not cataloged but could be.
 * This is not run automatically because it could have false positive that are
 * not worth blocking CI but it is helpful to run periodically.
 *
 * In the future this could be part of linting with
 * https://npmjs.com/package/eslint-plugin-pnpm but it is currently not
 * customizable enough to allow us to ignore the workspaces and packages we have
 * configured now.
 */
await main()
