import { Box, Text, useApp, useInput, useStdout } from 'ink'
import { createElement as $, useEffect, useState } from 'react'
import {
  initialState,
  layout,
  reduce,
  triage,
  visibleMutations,
  visibleRegions,
  windowed,
} from './state.ts'
import type { State } from './state.ts'
import type {
  GraphDiff,
  Mutation,
  NodeInfo,
  Region,
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
        text: `${m.to.name} now resolves elsewhere`,
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
}: {
  selected: boolean
  mark: string
  color: string
  text: string
  note?: string
}) =>
  $(
    Box,
    {
      height: 1,
      width: '100%',
      ...(selected ? { backgroundColor: 'blue' } : {}),
    },
    $(Text, { color }, ` ${mark} `),
    $(Text, { wrap: 'truncate-end' }, text),
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

/** Areas on the left, that area's changes on the right. */
const BrowseScreen = ({
  diff,
  state,
  rows,
}: {
  diff: GraphDiff
  state: State
  rows: number
}) => {
  const { body, list } = layout(rows)
  const regions = visibleRegions(diff, state)
  const region = regions[state.regionIndex]
  const mutations = visibleMutations(diff, region, state)
  const areas = windowed(regions, state.regionIndex, list)
  const changes = windowed(mutations, state.mutationIndex, list)
  const focused = (pane: State['pane']) =>
    state.pane === pane ? 'cyan' : 'gray'

  return $(
    Box,
    { flexDirection: 'column', width: '100%', height: rows },
    $(
      Box,
      { height: 1, width: '100%' },
      $(
        Text,
        { bold: true, wrap: 'truncate-end' },
        `  ${region?.label ?? 'no changes'}`,
      ),
    ),
    $(
      Box,
      { height: body, width: '100%', flexDirection: 'row' },
      $(
        Box,
        {
          flexDirection: 'column',
          width: '32%',
          minWidth: 18,
          flexShrink: 0,
          borderStyle: 'round',
          borderColor: focused('areas'),
          overflow: 'hidden',
        },
        ...areas.slice.map((r: Region, i: number) =>
          $(Row, {
            key: r.id,
            selected:
              state.pane === 'areas' &&
              areas.start + i === state.regionIndex,
            mark: ' ',
            color: 'white',
            text: r.label,
            note: String(visibleMutations(diff, r, state).length),
          }),
        ),
      ),
      $(
        Box,
        {
          flexDirection: 'column',
          // flexBasis 0 stands in for the maxWidth ink does not have:
          // without it the pane's content width becomes its base size
          // and it pushes past the terminal
          flexGrow: 1,
          flexBasis: 0,
          minWidth: 0,
          borderStyle: 'round',
          borderColor: focused('changes'),
          overflow: 'hidden',
        },
        ...changes.slice.map((m: Mutation, i: number) => {
          const d = describe(m)
          return $(Row, {
            key: m.id,
            selected:
              state.pane === 'changes' &&
              changes.start + i === state.mutationIndex,
            mark: d.mark,
            color: d.color,
            text: d.text,
            note:
              m.alsoReachedBy ? `+${m.alsoReachedBy}`
              : m.directness === 'direct' ? 'direct'
              : undefined,
          })
        }),
      ),
    ),
    $(Footer, {
      keys:
        '↑↓ move   ←→ pane   ⏎ detail   esc back   q quit' +
        // the count rides in the footer: as its own row it would make
        // the frame one line taller than the terminal
        (changes.more ? `        ${changes.more} more below` : ''),
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
  const regions = visibleRegions(diff, state)
  const region = regions[state.regionIndex]
  const mutations = visibleMutations(diff, region, state)
  const m = mutations[state.mutationIndex]
  const budget = Math.max(1, rows - 3)
  const d = m && describe(m)
  const fields: [string, string][] =
    m ?
      [
        ...detailFields(m),
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
    $(Footer, {
      keys: `↑↓ next change (${state.mutationIndex + 1}/${mutations.length})   esc back   q quit`,
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
      : key.rightArrow ? 'NextPane'
      : key.leftArrow ? 'PreviousPane'
      : key.return ? 'Select'
      : key.escape ? 'Back'
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
