import { Box, Text, useApp, useInput, useStdout } from 'ink'
import { createElement as $, useEffect, useState } from 'react'
import {
  highlights,
  initialState,
  layout,
  reduce,
  treeSize,
  view,
  visibleMutations,
  windowed,
} from './state.ts'
import type { State, Tree, TreeLine } from './state.ts'
import { depName } from '@vltpkg/graph-diff'
import type {
  GraphDiff,
  Mutation,
  NodeInfo,
} from '@vltpkg/graph-diff'

/**
 * Ink listens for 'resize' but its handler only re-lays-out the existing
 * tree -- it never re-renders React -- so anything derived from
 * `stdout.rows` goes stale. This forces the render Ink does not do.
 *
 * Only rows: the root uses `width: '100%'`, which Ink re-resolves on its
 * own, so keeping columns in state would just add a value that rots.
 */
const useRows = () => {
  const { stdout } = useStdout()
  const [rows, setRows] = useState(stdout.rows || 24)
  useEffect(() => {
    const onResize = () => setRows(stdout.rows || 24)
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])
  return rows
}

const version = (n: NodeInfo) => n.version ?? n.type

/** The version tail of a DepID, for the edges that only carry ids. */
const atVersion = (id: string) => {
  const at = id.lastIndexOf('@')
  return at > 0 ? id.slice(at + 1) : id
}

/** Marker, colour, and one line about a mutation. */
const describe = (
  m: Mutation,
): { mark: string; color: string; text: string } => {
  switch (m.kind) {
    case 'node-added':
      return {
        mark: '+',
        color: 'green',
        text: `${m.node.name} ${version(m.node)}`,
      }
    case 'node-removed':
      return {
        mark: '-',
        color: 'red',
        text: `${m.node.name} ${version(m.node)}`,
      }
    case 'node-changed':
      return {
        mark: '~',
        color: 'yellow',
        text: `${m.to.name} ${version(m.to)}  ${m.fields.join(', ')}`,
      }
    case 'node-identity-changed':
      return {
        mark: '=',
        color: 'gray',
        text: `${m.to.name} ${version(m.to)}  ${m.reason}`,
      }
    case 'peer-variants-regrouped':
      return {
        mark: '=',
        color: 'gray',
        text: `${m.name}  ${m.from.length} peer variants -> ${m.to.length}`,
      }
    case 'package-resolved':
      return {
        // a major bump is the one a reader must not scroll past
        mark:
          m.severity === 'major' ? '▲'
          : m.direction === 'upgrade' ? '↑'
          : m.direction === 'downgrade' ? '↓'
          : '→',
        color:
          m.direction === 'downgrade' ? 'red'
          : m.severity === 'major' ? 'yellow'
          : 'cyan',
        text: `${m.name}  ${version(m.from)} → ${version(m.to)}`,
      }
    case 'edge-added':
      return {
        mark: '+',
        color: 'green',
        text: `${m.edge.name} ${m.edge.spec}`,
      }
    case 'edge-removed':
      return {
        mark: '-',
        color: 'red',
        text: `${m.edge.name} ${m.edge.spec}`,
      }
    case 'edge-retargeted':
      return {
        mark: '→',
        color: 'cyan',
        // several parents can retarget the same dependency, so name the
        // consumer too or the rows read as duplicates of each other
        text:
          `${m.to.name}  ${atVersion(m.from.to)} → ${atVersion(m.to.to)}` +
          `  for ${depName(m.to.from)}`,
      }
    case 'edge-respecified':
      return {
        mark: '~',
        color: 'yellow',
        text: `${m.to.name}  ${m.fields.join(', ')}`,
      }
    case 'options-changed':
      return {
        mark: '~',
        color: 'yellow',
        text: `lockfile options: ${m.fields.join(', ')}`,
      }
  }
}

/**
 * One list row. `height: 1` is the belt that stops a long value wrapping
 * and pushing the pane past its budget; `backgroundColor` on the Box
 * fills the full content width, so selection reads as a bar rather than
 * as inverted glyphs.
 */
const Row = ({
  selected,
  mark,
  color,
  text,
  note,
  bold,
  dim,
  indent = 0,
  prefix = '',
}: {
  selected: boolean
  mark: string
  color: string
  text: string
  note?: string
  bold?: boolean
  dim?: boolean
  indent?: number
  /** box-drawing run placing this row in a tree */
  prefix?: string
}) =>
  $(
    Box,
    {
      height: 1,
      width: '100%',
      ...(selected ? { backgroundColor: 'blue' } : {}),
    },
    // the marker indents with its row: left at column one it would float
    // away from the text it belongs to
    $(Text, { color: 'gray' }, `${' '.repeat(indent)}${prefix}`),
    $(Text, { color }, `${mark} `),
    $(Text, { wrap: 'truncate-end', bold, dimColor: dim }, text),
    note ? $(Text, { color: 'gray' }, `  ${note}`) : null,
  )

/** A section heading. The count leads, so it reads as a quantity. */
const Heading = ({
  label,
  count,
  color,
}: {
  label: string
  count?: number
  color?: string
}) =>
  $(
    Box,
    { height: 1, width: '100%' },
    count === undefined ? null : (
      $(Text, { color: 'gray' }, `  ${count} `)
    ),
    $(
      Text,
      { bold: true, color },
      count === undefined ? `  ${label}` : label,
    ),
  )

const Footer = ({ keys }: { keys: string }) =>
  $(
    Box,
    { height: 1, width: '100%' },
    $(Text, { color: 'gray', wrap: 'truncate-end' }, `  ${keys}`),
  )

/** `118/245 CHANGED` -- the number leads, left aligned. */
const Title = ({
  at,
  of,
  label,
  trailing,
}: {
  at?: number
  of?: number
  label: string
  trailing?: string
}) =>
  $(
    Box,
    { height: 1, width: '100%', justifyContent: 'space-between' },
    $(
      Text,
      { wrap: 'truncate-end' },
      at === undefined ? null : (
        $(Text, { bold: true }, `  ${at}/${of} `)
      ),
      $(
        Text,
        { bold: at === undefined },
        at === undefined ? `  ${label}` : label,
      ),
    ),
    trailing ? $(Text, { color: 'gray' }, `${trailing}  `) : null,
  )

const where = (diff: GraphDiff, m: Mutation) =>
  diff.regions.find(r => r.mutationIds.includes(m.id))?.label ?? ''

/** What every symbol on the other screens means. */
const LEGEND: [string, string, string][] = [
  ['▲', 'yellow', 'major version bump'],
  ['↑', 'cyan', 'minor or patch upgrade'],
  ['↓', 'red', 'downgrade'],
  ['→', 'cyan', 'now resolves to a different version'],
  ['+', 'green', 'added to the graph'],
  ['-', 'red', 'gone from the graph'],
  ['~', 'yellow', 'same version, changed metadata'],
  ['=', 'gray', 'identity only: same package, different id'],
  ['·', 'gray', 'unchanged, shown for context'],
  ['+41', 'gray', 'also reached by 41 more workspaces'],
  ['direct', 'gray', 'an importer depends on this itself'],
]

const LegendScreen = ({ rows }: { rows: number }) =>
  $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(Title, { label: 'LEGEND' }),
    $(
      Box,
      {
        height: Math.max(1, rows - 2),
        width: '100%',
        flexDirection: 'column',
      },
      ...LEGEND.slice(0, Math.max(1, rows - 2)).map(
        ([mark, color, text]) =>
          $(
            Box,
            { key: mark, height: 1, width: '100%' },
            // 12, not 10: `    direct` is exactly 10 wide and ink trims
            // trailing space, so a tight column runs into the text
            $(
              Box,
              { width: 12, flexShrink: 0 },
              $(Text, { color }, `    ${mark}`),
            ),
            $(Text, { wrap: 'truncate-end' }, text),
          ),
      ),
    ),
    $(Footer, { keys: '? close   q quit' }),
  )

/**
 * The whole diff at a glance: the numbers, then the changes that are not
 * a routine bump, then the workspaces to drill into. Each highlight
 * section names exactly what it holds, so there is no heading to decode.
 */
const SummaryScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const { major, downgraded, removed } = highlights(diff)
  const { regions } = view(diff, state)
  const { summary } = diff
  const c = summary.counts
  const budget = Math.max(1, rows - 4)

  const line = (m: Mutation) => {
    const d = describe(m)
    return $(Row, {
      key: m.id,
      selected: false,
      mark: d.mark,
      color: d.color,
      text: d.text,
      indent: 2,
      note: where(diff, m),
    })
  }

  const section = (label: string, ms: Mutation[], color: string) =>
    ms.length ?
      [
        $(Heading, { key: label, label, count: ms.length, color }),
        ...ms.slice(0, 6).map(line),
        $(Box, { key: `${label}gap`, height: 1 }),
      ]
    : []

  const head = [
    ...section('MAJOR VERSIONS', major, 'yellow'),
    ...section('DOWNGRADED', downgraded, 'red'),
    ...section('REMOVED', removed, 'red'),
  ]

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(
      Box,
      { height: 3, width: '100%', flexDirection: 'column' },
      $(Text, { bold: true }, '  LOCKFILE DIFF'),
      $(
        Text,
        { color: 'gray' },
        `  ${summary.nodes.base} → ${summary.nodes.head} packages` +
          `    ${summary.edges.base} → ${summary.edges.head} edges`,
      ),
      $(
        Text,
        { color: 'gray' },
        `  ${diff.mutations.length} changes` +
          `   ${c['package-resolved'] ?? 0} resolved` +
          `   ${c['node-added'] ?? 0} added` +
          `   ${summary.identityOnly} identity-only`,
      ),
    ),
    $(
      Box,
      { height: budget, width: '100%', flexDirection: 'column' },
      ...head.slice(0, Math.max(0, budget - 2)),
      $(Heading, { label: 'WORKSPACES', count: regions.length }),
      ...windowed(
        regions,
        state.workspaceIndex,
        Math.max(
          1,
          budget - head.slice(0, Math.max(0, budget - 2)).length - 1,
        ),
      ).slice.map(r =>
        $(Row, {
          key: r.id,
          selected: regions.indexOf(r) === state.workspaceIndex,
          mark: ' ',
          color: 'white',
          text: r.label,
          indent: 2,
          note: `${visibleMutations(diff, r, state).length}`,
        }),
      ),
    ),
    $(Footer, {
      keys: `⏎ open   d direct (${state.directOnly ? 'on' : 'off'})   i identity (${state.identity ? 'on' : 'off'})   ? legend   q quit`,
    }),
  )
}

/** The dependency trees that changed inside one workspace. */
const WorkspaceScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const { region, trees } = view(diff, state)
  const { body } = layout(rows)
  const win = windowed(trees, state.treeIndex, body)

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(Title, {
      at: Math.min(state.treeIndex + 1, trees.length),
      of: trees.length,
      label: `TREES CHANGED IN ${region?.label ?? ''}`,
      trailing: `${visibleMutations(diff, region, state).length} changes`,
    }),
    $(
      Box,
      { height: body, width: '100%', flexDirection: 'column' },
      ...win.slice.map((t: Tree, i: number) => {
        const d = t.root && describe(t.root)
        return $(Row, {
          key: t.key,
          selected: win.start + i === state.treeIndex,
          // a tree whose own root never changed is still worth opening:
          // it is what pulled everything under it in
          mark: d?.mark ?? '·',
          color: d?.color ?? 'gray',
          text: d ? d.text : t.name,
          dim: !d,
          indent: 2,
          note: `${treeSize(t)}`,
        })
      }),
    ),
    $(Footer, {
      keys:
        '↑↓ move   ⏎ open tree   ← back   ? legend   q quit' +
        (win.more ? `      ${win.more} below` : ''),
    }),
  )
}

/** One tree, drawn as one. */
const TreeScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const { region, tree, lines } = view(diff, state)
  const { body } = layout(rows)
  const win = windowed(lines, state.depIndex, body)

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(Title, {
      at: Math.min(state.depIndex + 1, lines.length),
      of: lines.length,
      label: tree?.name ?? '',
      trailing: region?.label,
    }),
    $(
      Box,
      { height: body, width: '100%', flexDirection: 'column' },
      ...win.slice.map((row: TreeLine, i: number) => {
        const d = row.mutation && describe(row.mutation)
        return $(Row, {
          key: row.key,
          selected: win.start + i === state.depIndex,
          mark: d?.mark ?? '·',
          color: d?.color ?? 'gray',
          text: d ? d.text : row.name,
          dim: !d,
          prefix: row.prefix,
          indent: 2,
          note:
            row.mutation?.alsoReachedBy ?
              `+${row.mutation.alsoReachedBy}`
            : row.mutation?.directness === 'direct' ? 'direct'
            : undefined,
        })
      }),
    ),
    $(Footer, {
      keys:
        '↑↓ move   ⏎ details   ← back   ? legend   q quit' +
        (win.more ? `      ${win.more} below` : ''),
    }),
  )
}

const Field = ({ label, value }: { label: string; value: string }) =>
  $(
    Box,
    { height: 1, width: '100%' },
    // a fixed-width Box, not padEnd: ink trims trailing whitespace off a
    // Text, so padding inside one collapses and the gutter goes ragged
    $(
      Box,
      { width: 14, flexShrink: 0 },
      $(Text, { color: 'gray' }, `  ${label}`),
    ),
    $(Text, { wrap: 'truncate-end' }, value),
  )

/** A field row, or none at all when the model does not carry it. */
const optional = (
  label: string,
  value: string | undefined,
): [string, string][] => (value ? [[label, value]] : [])

const nodeFields = (n: NodeInfo): [string, string][] => [
  ['ID', n.id],
  [
    'KIND',
    [n.type, n.dev ? 'dev' : 'prod', n.optional ? 'optional' : '']
      .filter(Boolean)
      .join(' · '),
  ],
  ...optional('REGISTRY', n.registry),
  ...optional('RESOLVED', n.resolved),
  ...optional('INTEGRITY', n.integrity),
]

const detailFields = (m: Mutation): [string, string][] => {
  switch (m.kind) {
    case 'package-resolved':
      return [
        ['CHANGE', `${m.severity} ${m.direction}`],
        ['FROM', `${m.from.version ?? '?'}  ${m.from.id}`],
        ['TO', `${m.to.version ?? '?'}  ${m.to.id}`],
        ...nodeFields(m.to).slice(1),
      ]
    case 'node-added':
    case 'node-removed':
      return [
        ['CHANGE', m.kind === 'node-added' ? 'added' : 'removed'],
        ...nodeFields(m.node),
      ]
    case 'node-changed':
      return [
        ['CHANGE', `fields: ${m.fields.join(', ')}`],
        ...nodeFields(m.to),
      ]
    case 'node-identity-changed':
      return [
        ['CHANGE', `identity: ${m.reason}`],
        ['FROM', m.from.id],
        ['TO', m.to.id],
      ]
    case 'peer-variants-regrouped':
      return [
        ['CHANGE', `${m.from.length} peer variants → ${m.to.length}`],
        ['VERSION', m.version ?? '?'],
        ...m.from.map((id): [string, string] => ['FROM', id]),
        ...m.to.map((id): [string, string] => ['TO', id]),
      ]
    case 'edge-added':
    case 'edge-removed':
      return [
        ['CHANGE', m.kind === 'edge-added' ? 'added' : 'removed'],
        ['SLOT', `${m.edge.from} → ${m.edge.name}`],
        ['SPEC', `${m.edge.type} ${m.edge.spec}`],
        ['TARGET', m.edge.to],
      ]
    case 'edge-retargeted':
    case 'edge-respecified':
      return [
        ['CHANGE', m.kind.replace('edge-', '')],
        ['SLOT', `${m.to.from} → ${m.to.name}`],
        ['FROM', `${m.from.type} ${m.from.spec} ${m.from.to}`],
        ['TO', `${m.to.type} ${m.to.spec} ${m.to.to}`],
      ]
    case 'options-changed':
      return [['CHANGE', `lockfile options: ${m.fields.join(', ')}`]]
  }
}

const DepScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const { region, lines } = view(diff, state)
  const m = lines[state.depIndex]?.mutation
  const budget = Math.max(1, rows - 3)
  const d = m && describe(m)
  const fields: [string, string][] =
    m ?
      [
        ...detailFields(m),
        ...optional(
          'PATH',
          m.path?.length ?
            m.path.map(p => p.name).join(' › ')
          : undefined,
        ),
        ['WHERE', region?.label ?? ''],
        [
          'REACH',
          m.directness +
            (m.alsoReachedBy ?
              `, and ${m.alsoReachedBy} more workspaces`
            : ''),
        ],
      ]
    : []

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(
      Box,
      { height: 2, width: '100%', flexDirection: 'column' },
      $(
        Text,
        { bold: true, wrap: 'truncate-end' },
        d ? `  ${d.mark} ${d.text}` : '  nothing selected',
      ),
      $(Text, null, ''),
    ),
    $(
      Box,
      { height: budget, width: '100%', flexDirection: 'column' },
      ...fields
        .slice(0, budget)
        .map(([label, value], i) =>
          $(Field, { key: `${label}${i}`, label, value }),
        ),
    ),
    $(Footer, { keys: '↑↓ next   ← back   q quit' }),
  )
}

export const App = ({
  diff,
  identity = false,
}: {
  diff: GraphDiff
  identity?: boolean
}) => {
  const [state, setState] = useState({ ...initialState, identity })
  const rows = useRows()
  const { exit } = useApp()

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) return exit()
    const event =
      key.downArrow || input === 'j' ? 'MoveNext'
      : key.upArrow || input === 'k' ? 'MovePrevious'
      : key.return || key.rightArrow ? 'Select'
      : key.leftArrow || key.escape ? 'Back'
      : input === 'i' ? 'ToggleIdentity'
      : input === 'd' ? 'ToggleDirect'
      : input === '?' ? 'ToggleLegend'
      : undefined
    if (event) setState(s => reduce(s, event, diff))
  })

  // below this there is no room for chrome plus a row of content
  if (rows < 6) {
    return $(Text, { color: 'gray' }, 'terminal too small')
  }

  if (state.legend) return $(LegendScreen, { rows })
  return (
    state.screen === 'summary' ?
      $(SummaryScreen, { diff, state, rows })
    : state.screen === 'workspace' ?
      $(WorkspaceScreen, { diff, state, rows })
    : state.screen === 'tree' ? $(TreeScreen, { diff, state, rows })
    : $(DepScreen, { diff, state, rows })
  )
}
