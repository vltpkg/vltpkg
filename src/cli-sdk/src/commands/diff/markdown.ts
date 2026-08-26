import {
  highlights,
  nameOf,
  treeLines,
  treesOf,
  workspacesFor,
  workspacesOf,
} from './state.ts'
import { depName } from '@vltpkg/graph-diff'
import type { Alert, GraphDiff, Mutation } from '@vltpkg/graph-diff'

/** The version tail of a DepID, for the places that only carry ids. */
const atVersion = (id: string) => {
  const at = id.lastIndexOf('@')
  return at > 0 ? id.slice(at + 1) : ''
}

export type MarkdownOptions = {
  /** how the two sides were named on the command line */
  base?: string
  head?: string
  /** show identity-only changes, which are hidden by default */
  identity?: boolean
  /** workspaces to expand; the rest are listed as a count */
  maxWorkspaces?: number
}

/** A cell that will not break the table it sits in. */
const cell = (s: string) => s.replace(/\|/g, '\\|')

// callers pass a name, a version or a CVE, never an empty string
const code = (s: string) => `\`${cell(s)}\``

// callers guard on having rows, so there is no empty-table case here
const table = (head: string[], rows: string[][]) => [
  `| ${head.join(' | ')} |`,
  `| ${head.map(() => '---').join(' | ')} |`,
  ...rows.map(r => `| ${r.join(' | ')} |`),
  '',
]

const delta = (n: number, label: string) =>
  `**${n > 0 ? '+' : ''}${n}** ${label}`

// a constant, not an inline literal: prettier splits `['', '']` across
// lines and a `c8 ignore next` then covers only the first of them
const NONE: [string, string] = ['', '']

/**
 * The two version cells for a highlight row. `highlights` only ever
 * yields resolutions and removals, and a removal has a `from` with
 * nothing on the other side.
 */
const versions = (m: Mutation): [string, string] =>
  m.kind === 'package-resolved' ?
    [
      code(m.from.version ?? m.from.type),
      code(m.to.version ?? m.to.type),
    ]
  : m.kind === 'node-removed' ?
    [code(m.node.version ?? m.node.type), '']
  : /* c8 ignore next - nothing else reaches a highlight table */ NONE

const reach = (diff: GraphDiff, m: Mutation) => {
  const names = workspacesFor(diff, [m])
  return names.length > 1 ?
      `${names.length} workspaces`
    : (names[0] ?? '')
}

const WORST: Alert['severity'][] = [
  'critical',
  'high',
  'medium',
  'low',
]

/**
 * The diff as a pull-request comment.
 *
 * A lockfile review happens in a PR, not in a terminal, so this is the
 * shape that matters: what could break at the top, the detail folded
 * away behind `<details>` so a 263-change diff does not bury the
 * conversation it is attached to.
 */
export const markdownDiffOutput = (
  diff: GraphDiff,
  options: MarkdownOptions = {},
) => {
  const { base, head, identity = false, maxWorkspaces = 8 } = options
  const { summary } = diff
  const { major, downgraded, removed } = highlights(diff)
  const out: string[] = ['## Lockfile diff', '']

  if (base && head) out.push(`\`${base}\` → \`${head}\``, '')

  if (!diff.mutations.length) {
    out.push('No changes to the dependency graph.', '')
    return out.join('\n')
  }

  out.push(
    [
      delta(summary.nodes.head - summary.nodes.base, 'packages'),
      delta(summary.edges.head - summary.edges.base, 'edges'),
      `${diff.mutations.length} changes`,
      `${summary.identityOnly} hidden`,
    ].join(' · '),
    '',
  )

  const alerts = Object.entries(diff.alerts ?? {}).flatMap(
    ([id, list]) => list.map(a => [id, a] as const),
  )
  if (alerts.length) {
    // sorted worst first, because the top row is the one that gets read
    alerts.sort(
      (a, z) =>
        WORST.indexOf(a[1].severity) - WORST.indexOf(z[1].severity),
    )
    out.push('### ⚠️ Security', '')
    out.push(
      ...table(
        ['Package', 'Alert', 'Severity', 'Reference'],
        alerts.map(([id, a]) => [
          // the name, not the raw id: nobody reads ~npm~@babel+traverse
          code(`${depName(id as never)}@${atVersion(id)}`),
          cell(a.type),
          a.severity,
          a.cve ? code(a.cve) : '',
        ]),
      ),
    )
  }

  const section = (title: string, ms: Mutation[]) =>
    ms.length ?
      [
        `### ${title}`,
        '',
        ...table(
          ['Package', 'From', 'To', 'Reaches'],
          ms.map(m => {
            const [from, to] = versions(m)
            return [code(nameOf(m)), from, to, cell(reach(diff, m))]
          }),
        ),
      ]
    : []

  out.push(
    ...section('Major versions', major),
    ...section('Downgraded', downgraded),
    ...section('Removed', removed),
  )

  const filters = { identity, directOnly: false }
  const workspaces = workspacesOf(diff, filters)
  out.push('### Workspaces', '')
  for (const ws of workspaces.slice(0, maxWorkspaces)) {
    const trees = treesOf(ws.changes)
    out.push(
      `<details><summary><b>${cell(ws.label)}</b> — ${ws.changes.length} changes in ${trees.length} trees</summary>`,
      '',
      '```',
    )
    for (const tree of trees) {
      for (const line of treeLines(tree)) {
        const m = line.mutation
        out.push(
          `${line.prefix}${m ? mark(m) : '·'} ${line.name}${
            m ? detail(m) : ''
          }`,
        )
      }
    }
    out.push('```', '', '</details>', '')
  }
  if (workspaces.length > maxWorkspaces) {
    out.push(
      `_…and ${workspaces.length - maxWorkspaces} more workspaces._`,
      '',
    )
  }

  return out.join('\n')
}

/** The same marks the terminal uses, so the two read alike. */
const mark = (m: Mutation) =>
  m.kind === 'node-added' || m.kind === 'edge-added' ? '+'
  : m.kind === 'node-removed' || m.kind === 'edge-removed' ? '-'
  : m.kind === 'package-resolved' ?
    // downgrade first: a major downgrade is still going backwards, and
    // checking severity first would draw it as an upgrade
    m.direction === 'downgrade' ? 'v'
    : m.severity === 'major' ? '^^'
    : '^'
  : (
    m.kind === 'node-identity-changed' ||
    m.kind === 'peer-variants-regrouped'
  ) ?
    '='
  : '~'

const detail = (m: Mutation) =>
  m.kind === 'package-resolved' ?
    `  ${m.from.version ?? '?'} → ${m.to.version ?? '?'}`
  : m.kind === 'node-added' || m.kind === 'node-removed' ?
    `  ${m.node.version ?? m.node.type}`
  : ''
