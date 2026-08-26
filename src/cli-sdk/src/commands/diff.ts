import { error } from '@vltpkg/error-cause'
import { diffLockfiles, hasChanges } from '@vltpkg/graph-diff'
import { markdownDiffOutput } from './diff/markdown.ts'
import type {
  Alert,
  GraphDiff,
  LockfileData,
  NodeInfo,
} from '@vltpkg/graph-diff'
import {
  describeSource,
  readSource,
} from '@vltpkg/graph-diff/sources'
import type { Source } from '@vltpkg/graph-diff/sources'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandUsageDefinition } from '../config/usage.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { validateCommitish } from '../query-diff-files.ts'
import { lazyView } from '../view.ts'
import type { Views } from '../view.ts'

export type DiffResult = {
  base: Source
  head: Source
  diff: GraphDiff
}

const usageDef = {
  command: 'diff',
  usage: '<command> [flags]',
  description: `Show what changed between two states of a project.

                Only the \`lockfile\` subcommand is implemented. Bare
                \`vlt diff\`, along with the npm-compatible
                \`--diff=<spec>\` grammar for diffing package contents,
                is reserved and not yet available.`,

  subcommands: {
    lockfile: {
      usage: '[<ref>] [<ref>]',
      description: `Diff the dependency graph recorded in vlt-lock.json
                    between two git refs, or between a ref and the working
                    tree. Either ref may instead be a path ending in
                    \`.json\`, to diff against a lockfile on disk.

                    With no refs, compares the working tree against HEAD.
                    With one, compares the working tree against it. With
                    two, compares them to each other; \`a..b\` means the
                    same as \`a b\`.`,
    },
  },

  // keys are the arguments only; the builder prepends `vlt diff`
  examples: {
    lockfile: {
      description: 'Compare the working tree lockfile against HEAD',
    },
    'lockfile main': {
      description: 'Compare the working tree against main',
    },
    'lockfile main feat/x': {
      description: 'Compare two refs; `main..feat/x` means the same',
    },
    'lockfile --base=./old/vlt-lock.json': {
      description:
        'Compare a lockfile on disk against the working tree',
    },
    'lockfile origin/main --view=json': {
      description: `Print the diff as JSON. This is the stable contract
                    other tools should build against.`,
    },
    'lockfile origin/main --exit-code': {
      description: 'Exit 1 when anything changed, for use in CI',
    },
  },
} as const satisfies CommandUsageDefinition

export const usage: CommandUsage = () => commandUsage(usageDef)

export const views = {
  json: (r: DiffResult) => r.diff,
  markdown: (r: DiffResult) =>
    markdownDiffOutput(r.diff, {
      base: describeSource(r.base),
      head: describeSource(r.head),
    }),
  // lazy so ink and react stay off the load path unless the human view
  // is actually the one selected
  human: lazyView(
    async () => (await import('./diff/viewer.ts')).DiffViewer,
  ),
} as const satisfies Views<DiffResult>

/**
 * A `.json` suffix is the only thing that distinguishes a path from a
 * ref: git refs may contain dots and slashes, but a ref named
 * `something.json` would be perverse.
 */
export const classify = (value: string, flag: string): Source =>
  value.endsWith('.json') ?
    { kind: 'file', path: value }
  : { kind: 'git', ref: validateCommitish(value, flag) }

const pick = (
  positional: string | undefined,
  flag: string | undefined,
  name: 'base' | 'head',
) => {
  if (positional && flag && positional !== flag) {
    throw error(
      `Conflicting ${name} given as both a positional and --${name}`,
      { code: 'EUSAGE', found: positional, wanted: flag },
    )
  }
  return flag ?? positional
}

/**
 * ```
 * []        base = HEAD, head = working tree
 * [a]       base = a,    head = working tree
 * [a, b]    base = a,    head = b
 * [a..b]    base = a,    head = b
 * ```
 */
export const resolveRefs = (
  positionals: string[],
  conf: LoadedConfig,
) => {
  const [first, second, ...extra] = positionals
  if (extra.length) {
    throw error('Too many arguments for `vlt diff lockfile`', {
      code: 'EUSAGE',
      found: positionals,
      wanted: '[<ref>] [<ref>]',
    })
  }

  const [left, right] =
    first?.includes('..') && !second ?
      (first.split('..', 2) as [string, string])
    : [first, second]

  const baseValue = pick(left, conf.get('base'), 'base')
  const headValue = pick(right, conf.get('head'), 'head')

  return {
    base:
      baseValue ?
        classify(baseValue, '--base')
        // with nothing to go on, HEAD is what "since my last commit" means
      : ({ kind: 'git', ref: 'HEAD' } as Source),
    head:
      headValue ?
        classify(headValue, '--head')
      : ({ kind: 'worktree' } as Source),
  }
}

export const command: CommandFn<DiffResult> = async conf => {
  const [sub, ...args] = conf.positionals
  if (sub !== 'lockfile') {
    throw error('Unrecognized diff command', {
      code: 'EUSAGE',
      found: sub,
      validOptions: Object.keys(usageDef.subcommands),
    })
  }

  const { base, head } = resolveRefs(args, conf)
  const { projectRoot } = conf.options
  const [baseData, headData] = await Promise.all([
    readSource(base, projectRoot),
    readSource(head, projectRoot),
  ])

  const diff = diffLockfiles(baseData, headData)

  // opt-in, because it is the only part of this command that touches the
  // network; everything else reads two files
  if (conf.get('security')) {
    const alerts = await lookUpAlerts(diff, headData.options)
    if (Object.keys(alerts).length) diff.alerts = alerts
  }

  if (conf.get('exit-code') && hasChanges(diff)) {
    process.exitCode = 1
  }
  return { base, head, diff }
}

/**
 * Advisories against the packages this diff *introduces*.
 *
 * Only the head side, and only what arrived or moved: a package that was
 * already there and did not change is not news, however alarming, and
 * asking about all 1374 of them would be a much slower question.
 */
const lookUpAlerts = async (
  diff: GraphDiff,
  // the archive only asks about packages from the public npm registry,
  // and works that out from the same options the ids were resolved
  // against -- so they have to come from the lockfile, not the CLI
  options: LockfileData['options'],
) => {
  const nodes = new Map<string, NodeInfo>()
  for (const m of diff.mutations) {
    const node =
      m.kind === 'node-added' ? m.node
      : m.kind === 'package-resolved' ? m.to
      : undefined
    // the archive keys on name@version, so anything without one -- a
    // workspace, a file, a git ref -- has nothing to ask about
    if (node?.version) nodes.set(node.id, node)
  }
  if (!nodes.size) return {}

  const { SecurityArchive } = await import('@vltpkg/security-archive')
  const archive = await SecurityArchive.start({
    nodes: [...nodes.values()].map(n => ({ ...n, options })) as never,
  })
  const out: Record<string, Alert[]> = {}
  for (const id of nodes.keys()) {
    const alerts = actionable(archive.get(id as never)?.alerts ?? [])
    if (alerts.length) out[id] = alerts
  }
  return out
}

/**
 * The alerts a reviewer would do something about.
 *
 * The archive is thorough rather than selective: on one real commit it
 * returns 398 alerts across 41 packages, every one of them low or
 * middle, mostly `envVars` and `networkAccess` on packages that have
 * always had them. Reporting all of it would rebuild the noise problem
 * this command exists to solve, so this keeps the kinds that change a
 * decision -- code that runs, code that shells out, a licence that
 * constrains, a known vulnerability -- and anything graded high or
 * worse whatever its kind. The same commit then yields six rows.
 */
const ACTIONABLE = new Set([
  'malware',
  'gptMalware',
  'installScripts',
  'shellAccess',
  'copyleftLicense',
  'nonpermissiveLicense',
  'unmaintained',
  'deprecated',
  'potentialVulnerability',
])

const actionable = (
  found: {
    type: string
    severity: string
    props?: { cveId?: string }
  }[],
) => {
  const seen = new Set<string>()
  const out: Alert[] = []
  for (const a of found) {
    const severity = normalize(a.severity)
    const worth =
      ACTIONABLE.has(a.type) ||
      severity === 'critical' ||
      severity === 'high' ||
      !!a.props?.cveId
    // one row per kind: the archive reports a capability once per call
    // site, which for undici runs to 45 rows saying the same thing
    if (!worth || seen.has(a.type)) continue
    seen.add(a.type)
    out.push({
      type: a.type,
      severity,
      ...(a.props?.cveId ? { cve: a.props.cveId } : {}),
    })
  }
  return out
}

/** The API grades things `middle`; the published type says `medium`. */
const normalize = (s: string): Alert['severity'] =>
  s === 'middle' ? 'medium'
  : s === 'critical' || s === 'high' || s === 'medium' ? s
  : 'low'
