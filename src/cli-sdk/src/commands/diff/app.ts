import { Box, Text, useApp, useInput, useStdout } from 'ink'
import { createElement as $, useEffect, useState } from 'react'
import {
  alertCount,
  alertsFor,
  highlights,
  nodeIdOf,
  initialState,
  layout,
  reduce,
  treeSize,
  view,
  windowed,
  workspacesFor,
} from './state.ts'
import type { State, Tree, TreeLine, Workspace } from './state.ts'
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

/**
 * Marker, colour, and text for a mutation.
 *
 * The palette is keyed on meaning, not on kind: green adds, red
 * destroys, yellow wants attention, magenta is merely odd, cyan is
 * routine movement, and grey is noise. `name`/`detail` split the text
 * for the screens that lay it out as columns.
 */
const describe = (
  m: Mutation,
): {
  mark: string
  color: string
  text: string
  name?: string
  detail?: string
} => {
  switch (m.kind) {
    case 'node-added':
      return {
        mark: '+',
        color: 'green',
        text: `${m.node.name} ${version(m.node)}`,
        name: m.node.name,
        detail: version(m.node),
      }
    case 'node-removed':
      return {
        mark: '-',
        color: 'red',
        text: `${m.node.name} ${version(m.node)}`,
        name: m.node.name,
        detail: version(m.node),
      }
    case 'node-changed':
      return {
        mark: '~',
        color: 'gray',
        text: `${m.to.name} ${version(m.to)}  ${m.fields.join(', ')}`,
        name: m.to.name,
        detail: `${version(m.to)}  ${m.fields.join(', ')}`,
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
          : m.direction === 'downgrade' ? '↓'
          : m.direction === 'upgrade' ? '↑'
          : '→',
        color:
          // magenta, not red: going backwards is odd, but nothing was
          // destroyed, and red is what removal means everywhere else
          m.direction === 'downgrade' ? 'magenta'
          : m.severity === 'major' ? 'yellow'
          : 'cyan',
        text: `${m.name}  ${version(m.from)} → ${version(m.to)}`,
        name: m.name,
        detail: `${version(m.from)} → ${version(m.to)}`,
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
        color: 'blue',
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
  alert = '',
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
  /** the rightmost column, and only ever an alert */
  alert?: string
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
    $(
      Box,
      { flexGrow: 1, flexBasis: 0, minWidth: 0 },
      $(Text, { wrap: 'truncate-end', bold, dimColor: dim }, text),
    ),
    // right edge, so the notes make a column of their own down the tree
    note ? $(Text, { dimColor: true }, `${note}  `) : null,
    // and the alert sits outboard of even that, always the last column
    $(
      Box,
      { width: 5, flexShrink: 0 },
      $(Text, { color: 'red' }, alert),
    ),
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
  ['!', 'red', 'a security alert; a number means how many'],
  ['direct', 'gray', 'a workspace depends on this itself'],
  [
    'hidden',
    'gray',
    'same package and version, only its id moved (peer set or',
  ],
  ['', 'gray', 'registry) -- press i to show them'],
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

/** A cell in an aligned row. A fixed-width Box, since ink trims text. */
const Cell = ({
  text,
  width,
  color,
  dim,
  bold,
}: {
  text: string
  width?: number
  color?: string
  dim?: boolean
  bold?: boolean
}) =>
  width === undefined ?
    $(
      Text,
      { color, dimColor: dim, bold, wrap: 'truncate-end' },
      text,
    )
  : $(
      Box,
      { width, flexShrink: 0 },
      $(
        Text,
        { color, dimColor: dim, bold, wrap: 'truncate-end' },
        text,
      ),
    )

/**
 * The rightmost column of any row, and only ever an alert.
 *
 * A spacer pushes it to the true right edge rather than to wherever the
 * previous column happened to end, so a scan down that edge finds every
 * flagged package and nothing else competes for the position.
 */
const Flag = ({ n }: { n?: number }) => [
  $(Box, { key: 'gap', flexGrow: 1, flexBasis: 0, minWidth: 0 }),
  $(
    Box,
    { key: 'flag', width: 5, flexShrink: 0 },
    $(Text, { color: 'red' }, n ? `${n === 1 ? '' : n}!` : ''),
  ),
]

/** `+50 packages` rather than `1324 → 1374 packages`. */
const Delta = ({ n, label }: { n: number; label: string }) =>
  $(
    Text,
    {
      color:
        n > 0 ? 'green'
        : n < 0 ? 'red'
        : 'gray',
    },
    `${n > 0 ? '+' : ''}${n} ${label}`,
  )

/**
 * The whole diff at a glance: the deltas, then the changes that are not
 * a routine bump, then the workspaces to open. Each highlight section
 * names exactly what it holds, so there is no heading to decode, and an
 * empty one is dropped rather than shown as a zero.
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
  const { workspaces } = view(diff, state)
  const alerts = Object.values(diff.alerts ?? {}).length
  const { summary } = diff
  const budget = Math.max(1, rows - 4)

  // one column width across all three sections, so the eye tracks a
  // single set of columns down the whole screen rather than three
  const listed = [...major, ...downgraded, ...removed]
  const nameWidth = Math.min(
    34,
    Math.max(
      12,
      ...listed.map(m => (describe(m).name ?? '').length + 2),
      ...workspaces.map(w => w.label.length + 2),
    ),
  )
  const detailWidth = Math.min(
    26,
    Math.max(
      10,
      ...listed.map(m => (describe(m).detail ?? '').length + 2),
    ),
  )

  const row = (m: Mutation) => {
    const d = describe(m)
    const region = diff.regions.find(r =>
      r.mutationIds.includes(m.id),
    )
    const reach = region?.importers.length ?? 0
    return $(
      Box,
      { key: m.id, height: 1, width: '100%' },
      $(Cell, { text: `    ${d.mark}`, width: 7, color: d.color }),
      $(Cell, { text: d.name ?? d.text, width: nameWidth }),
      $(Cell, {
        text: d.detail ?? '',
        width: detailWidth,
        color: d.color,
      }),
      $(Cell, {
        text:
          reach === 1 ? depName(region?.importers[0] as never)
          : reach ? `${reach} workspaces`
          : '',
        dim: true,
      }),
      ...Flag({ n: alertsFor(diff, nodeIdOf(m)).length }),
    )
  }

  const section = (label: string, ms: Mutation[], color: string) =>
    ms.length ?
      [
        $(Heading, { key: label, label, count: ms.length, color }),
        ...ms.slice(0, 5).map(row),
        $(Box, { key: `${label}gap`, height: 1 }),
      ]
    : []

  const head = [
    ...section('MAJOR VERSIONS', major, 'yellow'),
    ...section('DOWNGRADED', downgraded, 'magenta'),
    ...section('REMOVED', removed, 'red'),
  ].slice(0, Math.max(0, budget - 3))

  const room = Math.max(1, budget - head.length - 1)
  const win = windowed(workspaces, state.workspaceIndex, room)

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(
      Box,
      { height: 3, width: '100%', flexDirection: 'column' },
      $(
        Box,
        { height: 1, width: '100%', justifyContent: 'space-between' },
        $(Text, { bold: true }, '  LOCKFILE DIFF'),
        $(
          Text,
          { dimColor: true },
          `${diff.mutations.length} changes  `,
        ),
      ),
      $(
        Box,
        { height: 1, width: '100%' },
        $(Text, null, '  '),
        $(Delta, {
          n: summary.nodes.head - summary.nodes.base,
          label: 'packages',
        }),
        $(Text, null, '    '),
        $(Delta, {
          n: summary.edges.head - summary.edges.base,
          label: 'edges',
        }),
        alerts ?
          $(Text, { color: 'red' }, `    ${alerts} alerts`)
        : null,
        // "identity-only" meant nothing to anyone who had not read the
        // model; what the reader needs to know is that they are hidden
        // and which key shows them
        $(
          Text,
          { dimColor: true },
          `    ${summary.identityOnly} hidden`,
        ),
      ),
      $(Box, { height: 1 }),
    ),
    $(
      Box,
      { height: budget, width: '100%', flexDirection: 'column' },
      ...head,
      $(Heading, { label: 'WORKSPACES', count: workspaces.length }),
      ...win.slice.map((w: Workspace, i: number) =>
        $(
          Box,
          {
            key: w.id,
            height: 1,
            width: '100%',
            ...(win.start + i === state.workspaceIndex ?
              { backgroundColor: 'blue' }
            : {}),
          },
          // the same four columns the highlight rows use, so the counts
          // land under the workspace names above them
          $(Cell, { text: '', width: 7 }),
          $(Cell, { text: w.label, width: nameWidth }),
          $(Cell, { text: '', width: detailWidth }),
          $(Cell, {
            text: `${w.changes.length}`,
            width: 8,
            dim: true,
          }),
          ...Flag({ n: alertCount(diff, w.changes) }),
        ),
      ),
    ),
    $(Footer, {
      keys: `⏎ open   d direct (${state.directOnly ? 'on' : 'off'})   i hidden (${state.identity ? 'on' : 'off'})   ? legend   q quit`,
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
  const { workspace, trees } = view(diff, state)
  const { body } = layout(rows)
  const win = windowed(trees, state.treeIndex, body)
  const nameWidth = Math.min(
    36,
    Math.max(
      14,
      ...trees.map(
        t =>
          (t.root ? (describe(t.root).name ?? t.name) : t.name)
            .length + 2,
      ),
    ),
  )

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(Title, {
      at: Math.min(state.treeIndex + 1, trees.length),
      of: trees.length,
      label: `TREES IN ${workspace?.label ?? ''}`,
      trailing: `${workspace?.changes.length ?? 0} changes`,
    }),
    $(
      Box,
      { height: body, width: '100%', flexDirection: 'column' },
      ...win.slice.map((t: Tree, i: number) => {
        const d = t.root && describe(t.root)
        return $(
          Box,
          {
            key: t.key,
            height: 1,
            width: '100%',
            ...(win.start + i === state.treeIndex ?
              { backgroundColor: 'blue' }
            : {}),
          },
          // a tree whose own root never changed is still worth opening:
          // it is what pulled everything under it in
          $(Cell, {
            text: `    ${d?.mark ?? '·'}`,
            width: 7,
            color: d?.color ?? 'gray',
          }),
          $(Cell, {
            text: d?.name ?? t.name,
            width: nameWidth,
            dim: !d,
          }),
          $(Cell, {
            text: d?.detail ?? '',
            width: 22,
            color: d?.color ?? 'gray',
          }),
          $(Cell, { text: `${treeSize(t)}`, width: 8, dim: true }),
          // a tree lives in one workspace but its packages are usually
          // shared; this is what says how far the blast radius goes
          $(Cell, {
            text: (() => {
              const n = workspacesFor(diff, t.changes).length
              return n > 1 ? `${n} workspaces` : ''
            })(),
            dim: true,
          }),
          ...Flag({ n: alertCount(diff, t.changes) }),
        )
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
  const { workspace, tree, lines } = view(diff, state)
  const { body } = layout(rows)
  const win = windowed(lines, state.depIndex, body)

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(Title, {
      at: Math.min(state.depIndex + 1, lines.length),
      of: lines.length,
      label: tree?.name ?? '',
      trailing: workspace?.label,
    }),
    $(
      Box,
      { height: body, width: '100%', flexDirection: 'column' },
      ...win.slice.map((row: TreeLine, i: number) => {
        const d = row.mutation && describe(row.mutation)
        const flagged = alertsFor(diff, nodeIdOf(row.mutation))
        return $(Row, {
          key: row.key,
          selected: win.start + i === state.depIndex,
          mark: d?.mark ?? '·',
          color: d?.color ?? 'gray',
          text: d ? d.text : row.name,
          dim: !d,
          prefix: row.prefix,
          indent: 2,
          alert: flagged.length ? '!' : '',
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
        '↑↓ move   ⏎ details   n/p tree   w workspaces   ← back   q quit' +
        (win.more ? `      ${win.more} below` : ''),
    }),
  )
}

/** Which workspaces the focused tree actually lands on. */
const ReachScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const { tree } = view(diff, state)
  const names = tree ? workspacesFor(diff, tree.changes) : []
  const { body } = layout(rows)
  // two columns, so a long list of workspaces stays on one screen
  const half = Math.ceil(names.length / 2)
  const left = names.slice(0, half)
  const right = names.slice(half)

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(Title, {
      // a count, not a cursor position: nothing here is walked
      label: `WORKSPACES REACHED BY ${tree?.name ?? ''}`,
      trailing: `${names.length} of them`,
    }),
    $(
      Box,
      { height: body, width: '100%', flexDirection: 'row' },
      $(
        Box,
        { width: '50%', flexDirection: 'column' },
        ...left
          .slice(0, body)
          .map(n =>
            $(
              Box,
              { key: n, height: 1, width: '100%' },
              $(Text, { wrap: 'truncate-end' }, `    ${n}`),
            ),
          ),
      ),
      $(
        Box,
        {
          flexGrow: 1,
          flexBasis: 0,
          minWidth: 0,
          flexDirection: 'column',
        },
        ...right
          .slice(0, body)
          .map(n =>
            $(
              Box,
              { key: n, height: 1, width: '100%' },
              $(Text, { wrap: 'truncate-end' }, `  ${n}`),
            ),
          ),
      ),
    ),
    $(Footer, { keys: '← back   q quit' }),
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
  const { workspace, lines } = view(diff, state)
  const m = lines[state.depIndex]?.mutation
  const budget = Math.max(1, rows - 3)
  const d = m && describe(m)
  const fields: [string, string][] =
    m ?
      [
        ...detailFields(m),
        ...alertsFor(diff, nodeIdOf(m)).map((x): [string, string] => [
          'ALERT',
          `${x.severity}  ${x.type}${x.cve ? `  ${x.cve}` : ''}`,
        ]),
        ...optional(
          'PATH',
          m.path?.length ?
            m.path.map(p => p.name).join(' › ')
          : undefined,
        ),
        ['WHERE', workspace?.label ?? ''],
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
    $(Footer, {
      keys: '↑↓ next   n/p tree   w workspaces   ← back   q quit',
    }),
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
      : input === 'n' ? 'NextTree'
      : input === 'p' ? 'PreviousTree'
      : input === 'w' ? 'ShowReach'
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
    : state.screen === 'reach' ? $(ReachScreen, { diff, state, rows })
    : $(DepScreen, { diff, state, rows })
  )
}
