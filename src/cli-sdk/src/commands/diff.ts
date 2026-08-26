import { error } from '@vltpkg/error-cause'
import {
  diffLockfiles,
  hasChanges,
  humanDiffOutput,
} from '@vltpkg/graph-diff'
import { readSource } from '@vltpkg/graph-diff/sources'
import type { GraphDiff } from '@vltpkg/graph-diff'
import type { Source } from '@vltpkg/graph-diff/sources'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandUsageDefinition } from '../config/usage.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { validateCommitish } from '../query-diff-files.ts'
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
  human: (r: DiffResult, { colors }: { colors?: boolean }) =>
    humanDiffOutput(r.diff, { colors }),
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
  if (conf.get('exit-code') && hasChanges(diff)) {
    process.exitCode = 1
  }
  return { base, head, diff }
}
