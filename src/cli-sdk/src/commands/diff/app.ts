import { Box, Text, useApp, useInput, useStdout } from 'ink'
import { createElement as $, useEffect, useState } from 'react'
import {
  flatten,
  initialState,
  layout,
  reduce,
  selected as selectedChange,
  triage,
  windowed,
} from './state.ts'
import type { State, TreeRow } from './state.ts'
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
}: {
  selected: boolean
  mark: string
  color: string
  text: string
  note?: string
  bold?: boolean
  dim?: boolean
  indent?: number
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
    $(Text, { color }, `${' '.repeat(indent)} ${mark} `),
    $(Text, { wrap: 'truncate-end', bold, dimColor: dim }, text),
    note ? $(Text, { color: 'gray' }, `  ${note}`) : null,
  )

/** A section heading with its count pushed to the right. */
const Heading = ({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color?: string
}) =>
  $(
    Box,
    { height: 1, width: '100%', justifyContent: 'space-between' },
    $(Text, { bold: true, color }, `  ${label}`),
    $(Text, { color: 'gray' }, `${count}  `),
  )

const Footer = ({ keys }: { keys: string }) =>
  $(
    Box,
    { height: 1, width: '100%' },
    $(Text, { color: 'gray', wrap: 'truncate-end' }, `  ${keys}`),
  )

const where = (diff: GraphDiff, m: Mutation) =>
  diff.regions.find(r => r.mutationIds.includes(m.id))?.label ?? ''

/**
 * Triage. A real lockfile diff is overwhelmingly routine, so this leads
 * with what could break and what the reader actually asked for, and
 * collapses the rest to counts.
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
  const { risky, yours, routine } = triage(diff)
  const { summary } = diff
  // 2 header + body + 1 routine + 1 footer === rows. Overshoot and yoga
  // squeezes the chrome out rather than scrolling, so this has to be exact.
  const budget = Math.max(1, rows - 4)

  // the two headings and the blank spacer come out of the same budget
  // the lists are drawn from
  const spare = Math.max(2, budget - 3)
  const riskyRows = Math.min(
    Math.max(risky.length, 1),
    Math.ceil(spare / 2),
  )
  const yoursRows = Math.max(1, spare - riskyRows)

  const line = (m: Mutation) => {
    const d = describe(m)
    return $(Row, {
      key: m.id,
      selected: false,
      mark: d.mark,
      color: d.color,
      text: d.text,
      note: where(diff, m),
    })
  }

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(
      Box,
      { height: 2, width: '100%', flexDirection: 'column' },
      $(Text, { bold: true }, '  LOCKFILE DIFF'),
      $(
        Text,
        { color: 'gray' },
        `  ${summary.nodes.base} → ${summary.nodes.head} packages` +
          `    ${summary.edges.base} → ${summary.edges.head} edges`,
      ),
    ),
    $(
      Box,
      { height: budget, width: '100%', flexDirection: 'column' },
      $(Heading, {
        label: 'NEEDS A LOOK',
        count: risky.length,
        color: risky.length ? 'yellow' : 'gray',
      }),
      ...(risky.length ?
        risky.slice(0, riskyRows).map(line)
      : [
          $(Row, {
            key: 'none',
            selected: false,
            mark: ' ',
            color: 'gray',
            text: '  nothing risky',
          }),
        ]),
      $(Box, { key: 'gap', height: 1 }),
      $(Heading, {
        label: 'YOURS · direct dependencies',
        count: yours.length,
      }),
      ...yours.slice(0, yoursRows).map(line),
    ),
    $(
      Box,
      { height: 1, width: '100%' },
      $(
        Text,
        { color: 'gray', wrap: 'truncate-end' },
        `  ROUTINE  ${routine.map(([k, n]) => `${n} ${k}`).join('   ')}`,
      ),
    ),
    $(Footer, {
      keys:
        `⏎ browse   d direct only (${state.directOnly ? 'on' : 'off'})` +
        `   i identity (${state.identity ? 'on' : 'off'})   q quit`,
    }),
  )
}

/**
 * The whole diff as one tree: area, then the direct dependency, then
 * what it dragged in. One column -- two panes made the changes read as
 * a separate thing from the area they belong to.
 */
const BrowseScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const all = flatten(diff, state)
  const { body } = layout(rows)
  const view = windowed(all, state.cursor, body)

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(
      Box,
      { height: 1, width: '100%', justifyContent: 'space-between' },
      $(Text, { bold: true }, '  CHANGES'),
      $(
        Text,
        { color: 'gray' },
        `${state.cursor + 1}/${all.length}  `,
      ),
    ),
    $(
      Box,
      { height: body, width: '100%', flexDirection: 'column' },
      ...view.slice.map((row: TreeRow, i: number) => {
        const selected = view.start + i === state.cursor
        if (row.kind === 'area') {
          return $(Row, {
            key: row.key,
            selected,
            mark: ' ',
            color: 'white',
            text: row.label,
            bold: true,
            note: `${row.count}`,
          })
        }
        if (row.kind === 'group') {
          return $(Row, {
            key: row.key,
            selected,
            mark: '·',
            color: 'gray',
            // no change of its own, so it is context for its children
            text: row.label,
            dim: true,
            indent: 2,
            note: `${row.count}`,
          })
        }
        const m = row.mutation
        const d = describe(m)
        return $(Row, {
          key: row.key,
          selected,
          mark: d.mark,
          color: d.color,
          text: d.text,
          indent: row.depth ? 5 : 2,
          note:
            m.alsoReachedBy ? `+${m.alsoReachedBy}`
            : m.directness === 'direct' ? 'direct'
            : undefined,
        })
      }),
    ),
    $(Footer, {
      keys:
        '↑↓ move   ⏎ detail   ← back   d direct   i identity   q quit' +
        // the count rides in the footer: as its own row it would make
        // the frame one line taller than the terminal
        (view.more ? `      ${view.more} below` : ''),
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

const DetailScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const all = flatten(diff, state)
  const m = selectedChange(all, state.cursor)
  const region = diff.regions.find(r =>
    m ? r.mutationIds.includes(m.id) : false,
  )
  const budget = Math.max(1, rows - 3)
  const d = m && describe(m)
  const fields: [string, string][] =
    m ?
      [
        ...detailFields(m),
        ...optional('VIA', m.via && `${m.via.name}  ${m.via.id}`),
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
      : undefined
    if (event) setState(s => reduce(s, event, diff))
  })

  // below this there is no room for chrome plus a row of content
  if (rows < 6) {
    return $(Text, { color: 'gray' }, 'terminal too small')
  }

  return (
    state.screen === 'summary' ?
      $(SummaryScreen, { diff, state, rows })
    : state.screen === 'browse' ?
      $(BrowseScreen, { diff, state, rows })
    : $(DetailScreen, { diff, state, rows })
  )
}
