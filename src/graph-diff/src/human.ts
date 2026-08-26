import { MISSING } from './types.ts'
import type {
  EdgeInfo,
  GraphDiff,
  Mutation,
  NodeInfo,
} from './types.ts'

export type HumanOptions = {
  colors?: boolean
  /** show the identity-only noise instead of collapsing it to a count */
  identity?: boolean
}

const paint = (on: boolean | undefined, code: number, s: string) =>
  on ? `[${code}m${s}[0m` : s

const ref = (node: NodeInfo) =>
  node.version ? `${node.name} ${node.version}` : node.name

const edgeRef = (e: EdgeInfo) =>
  `${e.name} ${e.spec}${e.to === MISSING ? ' -> MISSING' : ''}`

/**
 * Marker, text, and color for one mutation. Options changes are rendered
 * with the headline instead, so they never reach here.
 */
const line = (
  m: Exclude<Mutation, { kind: 'options-changed' }>,
): [string, string, number] => {
  switch (m.kind) {
    case 'node-added':
      return ['+', ref(m.node), 32]
    case 'node-removed':
      return ['-', ref(m.node), 31]
    case 'node-changed':
      return [
        '~',
        `${ref(m.to)}  changed: ${m.fields.join(', ')}`,
        33,
      ]
    case 'node-identity-changed':
      return [
        '=',
        `${ref(m.to)}  ${m.reason} ${m.from.peerSetHash ?? m.from.registry ?? ''} -> ${m.to.peerSetHash ?? m.to.registry ?? ''}`.trimEnd(),
        90,
      ]
    case 'peer-variants-regrouped':
      return [
        '=',
        `${m.name} ${m.version ?? ''}  ${m.from.length} peer variant(s) -> ${m.to.length}`.replace(
          '  ',
          ' ',
        ),
        90,
      ]
    case 'package-resolved':
      return [
        // a major bump and a downgrade are the two a reader must not
        // miss, so they get their own marker and colour
        m.severity === 'major' ? '^^'
        : m.direction === 'upgrade' ? '^'
        : m.direction === 'downgrade' ? 'v'
        : '>',
        `${m.name}  ${m.from.version ?? '?'} -> ${m.to.version ?? '?'}${
          m.severity === 'major' ? '  major' : ''
        }`,
        m.direction === 'downgrade' ? 31
        : m.severity === 'major' ? 33
        : 36,
      ]
    case 'edge-added':
      return ['+', `${m.edge.from} ${edgeRef(m.edge)}`, 32]
    case 'edge-removed':
      return ['-', `${m.edge.from} ${edgeRef(m.edge)}`, 31]
    case 'edge-retargeted':
      return [
        '>',
        `${m.to.from} ${m.to.name}  ${m.from.to} -> ${m.to.to}`,
        36,
      ]
    case 'edge-respecified':
      return [
        '~',
        `${m.to.from} ${m.to.name}  ${m.fields.join(', ')}`,
        33,
      ]
  }
}

/**
 * Static text rendering. Used for `--no-tui`, for CI, and whenever
 * stdout is not a terminal.
 */
export const humanDiffOutput = (
  diff: GraphDiff,
  options: HumanOptions = {},
) => {
  const { colors, identity } = options
  const { summary } = diff
  const dim = (s: string) => paint(colors, 90, s)
  const out: string[] = []
  const c = summary.counts

  out.push('LOCKFILE DIFF', '')
  out.push(
    `  ${summary.nodes.base} -> ${summary.nodes.head} packages` +
      `    ${summary.edges.base} -> ${summary.edges.head} edges`,
  )
  out.push(
    `  ${c['node-added'] ?? 0} added   ${c['node-removed'] ?? 0} removed` +
      `   ${c['package-resolved'] ?? 0} resolved   ${c['node-changed'] ?? 0} modified`,
  )
  if (summary.identityOnly && !identity) {
    out.push(
      dim(
        `  ${summary.identityOnly} identity-only (pass --identity-only to show)`,
      ),
    )
  }

  // a lockfile-level change belongs with the headline, not filed under
  // whichever region happens to hold nodeless mutations
  for (const m of diff.mutations) {
    if (m.kind === 'options-changed') {
      out.push(`  options changed: ${m.fields.join(', ')}`)
    }
  }

  const byId = new Map(diff.mutations.map(m => [m.id, m]))
  for (const region of diff.regions) {
    const shown = region.mutationIds
      .map(id => byId.get(id))
      .filter(
        (m): m is Exclude<Mutation, { kind: 'options-changed' }> =>
          !!m &&
          m.kind !== 'options-changed' &&
          (identity || !m.identityOnly),
      )
    if (!shown.length) continue
    out.push('', region.label)
    for (const m of shown) {
      const [marker, text, code] = line(m)
      const tag =
        (m.directness === 'direct' ? '' : dim('  transitive')) +
        (m.alsoReachedBy ?
          dim(`  +${m.alsoReachedBy} more workspaces`)
        : '')
      out.push(`  ${paint(colors, code, marker)} ${text}${tag}`)
    }
  }

  if (!diff.mutations.length) out.push('', '  No changes.')
  return out.join('\n') + '\n'
}
