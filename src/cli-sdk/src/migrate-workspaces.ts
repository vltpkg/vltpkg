import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { GraphModifier } from '@vltpkg/graph'
import type {
  AddImportersDependenciesMap,
  Dependency,
} from '@vltpkg/graph'
import { parse } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import { longDependencyTypes } from '@vltpkg/types'
import type { NormalizedManifest } from '@vltpkg/types'
import { save } from '@vltpkg/vlt-json'
import {
  migratableWSConfig,
  Monorepo,
  resolveWSConfig,
} from '@vltpkg/workspaces'
import type { WorkspaceConfigSource } from '@vltpkg/workspaces'
import type { LoadedConfig } from './config/index.ts'
import { stderr } from './output.ts'

export type MigratedWorkspaces = {
  source: WorkspaceConfigSource
  workspaces: string[]
}

// dep types whose workspace references get rewritten. peers are
// left out: `vlt pack` would publish them as an exact pin
const specTypes = {
  dependencies: 'prod',
  devDependencies: 'dev',
  optionalDependencies: 'optional',
} as const

export type MigratedSpec = {
  /** `.` for the project root, else the workspace path */
  importer: string
  name: string
  type: keyof typeof specTypes
  from: string
  to: 'workspace:*'
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

const importerID = (importer: string) =>
  importer === '.' ?
    joinDepIDTuple(['file', '.'])
  : joinDepIDTuple(['workspace', importer])

/**
 * Find the plain ranges and dist-tags in every importer that link a
 * workspace of the same name, to be saved as `workspace:*`, unless
 * `--no-migrate-workspaces`. Names that match a workspace but resolve
 * to the registry are kept, with a warning.
 */
export const findWorkspaceSpecs = (
  conf: LoadedConfig,
): MigratedSpec[] => {
  const { options } = conf
  const { loglevel } = conf.values
  const quiet = loglevel === 'silent' || loglevel === 'error'
  if (
    !options['migrate-workspaces'] ||
    options['frozen-lockfile'] ||
    options['expect-lockfile']
  ) {
    return []
  }
  const { projectRoot, packageJson, scurry } = options
  // the whole project, whatever --workspace selects
  const filtered =
    !!conf.values.workspace?.length ||
    !!conf.values['workspace-group']?.length
  const monorepo =
    filtered ?
      Monorepo.maybeLoad(projectRoot, { packageJson, scurry })
    : options.monorepo
  if (!monorepo) return []
  const modifiers = GraphModifier.maybeLoad(options)
  // named workspaces only, as in the graph
  modifiers?.expandWorkspaceNames(
    [...monorepo.values()].flatMap(ws => ws.manifest.name ?? []),
  )
  const importers: [string, NormalizedManifest][] = [
    ['.', packageJson.read(projectRoot)],
    ...[...monorepo.values()].map(
      ws => [ws.path, ws.manifest] as [string, NormalizedManifest],
    ),
  ]
  const specs: MigratedSpec[] = []
  for (const [importer, manifest] of importers) {
    for (const type of Object.keys(
      specTypes,
    ) as MigratedSpec['type'][]) {
      for (const [name, from] of Object.entries(
        manifest[type] ?? {},
      )) {
        const ws = monorepo.get(name)
        if (ws?.name !== name || ws.path === importer) continue
        let spec: Spec
        try {
          spec = Spec.parse(name, from, options)
        } catch {
          // the install reports it
          continue
        }
        // aliases, `workspace:`, `file:`, git, ...
        if (spec.type !== 'registry' || spec.subspec) continue
        // left to a modifier that removes it or points it elsewhere
        const mod = modifiers?.importerEdgeModifier(
          { importer: true, mainImporter: importer === '.' },
          spec,
        )
        if (
          mod &&
          !(mod.type === 'edge' && mod.spec.type === 'workspace')
        ) {
          continue
        }
        // same as satisfies() for a registry spec and a workspace id
        const version = parse(ws.manifest.version ?? '')
        if (spec.range && !(version && spec.range.test(version))) {
          if (!quiet) {
            stderr(
              `Warning: ${name}@${from} in ${importer} does not match workspace ${name} (${ws.manifest.version ?? 'no version'}), kept as is`,
            )
          }
          continue
        }
        // also a peer (or listed twice): saving one type drops the other
        if (
          [...longDependencyTypes].some(
            t => t !== type && manifest[t]?.[name] !== undefined,
          )
        ) {
          continue
        }
        specs.push({ importer, name, type, from, to: 'workspace:*' })
      }
    }
  }
  return specs
}

/**
 * Add the {@link MigratedSpec} entries to the install's `add` map, so
 * `package.json` and `vlt-lock.json` get them in the same install. A
 * name also given on the command line keeps that spec instead. Returns
 * the entries that were added.
 */
export const addWorkspaceSpecs = (
  add: AddImportersDependenciesMap,
  specs: MigratedSpec[],
  conf: LoadedConfig,
): MigratedSpec[] => {
  const added: MigratedSpec[] = []
  // positionals share one map between importers, never write to it
  const copies = new Map<DepID, Map<string, Dependency>>()
  for (const s of specs) {
    const id = importerID(s.importer)
    const explicit = add.get(id)
    if (explicit?.has(s.name)) continue
    let deps = copies.get(id)
    if (!deps) {
      deps = new Map(explicit)
      copies.set(id, deps)
      add.set(id, deps)
    }
    const dep: Dependency = {
      spec: Spec.parse(s.name, s.to, conf.options),
      type: specTypes[s.type],
    }
    deps.set(s.name, dep)
    add.modifiedDependencies = true
    added.push(s)
  }
  return added
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
