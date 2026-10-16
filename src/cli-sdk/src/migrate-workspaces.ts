import { save } from '@vltpkg/vlt-json'
import {
  migratableWSConfig,
  resolveWSConfig,
} from '@vltpkg/workspaces'
import type { WorkspaceConfigSource } from '@vltpkg/workspaces'
import type { LoadedConfig } from './config/index.ts'
import { stderr } from './output.ts'

export type MigratedWorkspaces = {
  source: WorkspaceConfigSource
  workspaces: string[]
}

// workspaces declared outside vlt.json, if any
const found = (
  conf: LoadedConfig,
): MigratedWorkspaces | undefined => {
  const resolved = resolveWSConfig(
    conf.options.projectRoot,
    conf.options.packageJson,
    false,
  )
  const workspaces = migratableWSConfig(resolved)
  const { source } = resolved
  if (!workspaces?.length || !source) return
  return { source, workspaces }
}

/**
 * Save workspaces read from `package.json` or `pnpm-workspace.yaml` to
 * the project `vlt.json`, unless `--no-migrate-workspaces`.
 */
export const migrateWorkspaces = (
  conf: LoadedConfig,
): MigratedWorkspaces | undefined => {
  if (!conf.options['migrate-workspaces']) return
  const migrated = found(conf)
  if (migrated) save('workspaces', migrated.workspaces)
  return migrated
}

/**
 * Warn when workspaces are declared only outside `vlt.json`, which
 * `vlt ci` ignores.
 */
export const warnIgnoredWorkspaces = (conf: LoadedConfig): void => {
  const { loglevel } = conf.values
  if (loglevel === 'silent' || loglevel === 'error') return
  let migrated: MigratedWorkspaces | undefined
  try {
    migrated = found(conf)
  } catch {
    // invalid workspaces config: nothing to suggest
    return
  }
  if (!migrated) return
  stderr(
    `Warning: vlt ci reads workspaces from vlt.json only; ignoring ${migrated.source}, its workspaces are not installed. Run \`vlt install\` to save them to vlt.json, or add them there.`,
  )
}
