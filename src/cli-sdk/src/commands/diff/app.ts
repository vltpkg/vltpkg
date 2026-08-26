import { Box, Text, useApp, useInput } from 'ink'
import { createElement as $, useState } from 'react'
import {
  initialState,
  reduce,
  visibleMutations,
  visibleRegions,
} from './state.ts'
import type { State } from './state.ts'
import type {
  GraphDiff,
  Mutation,
  NodeInfo,
} from '@vltpkg/graph-diff'

/** How many rows of a list to show before scrolling it. */
const WINDOW = 12

const version = (n: NodeInfo) => n.version ?? n.type

/** Marker, color, and one-line summary for a mutation. */
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
        mark:
          m.direction === 'upgrade' ? '^'
          : m.direction === 'downgrade' ? 'v'
          : '>',
        color: m.direction === 'downgrade' ? 'red' : 'cyan',
        text: `${m.name}  ${version(m.from)} -> ${version(m.to)}`,
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
        mark: '>',
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
 * A scrolling window over a list, keeping the cursor in view without
 * redrawing the whole diff on every keypress.
 */
const windowed = <T>(items: T[], index: number) => {
  const start = Math.max(
    0,
    Math.min(index - Math.floor(WINDOW / 2), items.length - WINDOW),
  )
  return {
    start,
    slice: items.slice(start, start + WINDOW),
    more: Math.max(0, items.length - start - WINDOW),
  }
}

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
    Text,
    { inverse: selected },
    ' ',
    $(Text, { color }, mark),
    ' ',
    text,
    note ? $(Text, { color: 'gray' }, `  ${note}`) : null,
  )

const Header = ({ diff }: { diff: GraphDiff }) => {
  const { summary } = diff
  const c = summary.counts
  return $(
    Box,
    { flexDirection: 'column', marginBottom: 1 },
    $(Text, { bold: true }, 'LOCKFILE DIFF'),
    $(
      Text,
      null,
      `  ${summary.nodes.base} -> ${summary.nodes.head} packages`,
      `    ${summary.edges.base} -> ${summary.edges.head} edges`,
    ),
    $(
      Text,
      null,
      `  ${c['node-added'] ?? 0} added   ${c['node-removed'] ?? 0} removed`,
      `   ${c['package-resolved'] ?? 0} resolved   ${c['node-changed'] ?? 0} modified`,
    ),
  )
}

const Footer = ({ keys }: { keys: string }) =>
  $(Box, { marginTop: 1 }, $(Text, { color: 'gray' }, keys))

const SummaryScreen = ({
  diff,
  state,
}: {
  diff: GraphDiff
  state: State
}) => {
  const regions = visibleRegions(diff, state.identity)
  const { start, slice, more } = windowed(regions, state.regionIndex)
  return $(
    Box,
    { flexDirection: 'column' },
    $(Header, { diff }),
    $(Text, { bold: true }, 'CHANGED AREAS'),
    ...slice.map((region, i) =>
      $(Row, {
        key: region.id,
        selected: start + i === state.regionIndex,
        mark: ' ',
        color: 'white',
        text: region.label.padEnd(28),
        note: `${visibleMutations(diff, region, state.identity).length} changed`,
      }),
    ),
    more ? $(Text, { color: 'gray' }, `  ... ${more} more`) : null,
    regions.length ? null : (
      $(Text, { color: 'gray' }, '  No changes.')
    ),
    $(Footer, {
      keys: `↑↓ move   ⏎ inspect   i identity-only (${state.identity ? 'on' : 'off'})   q quit`,
    }),
  )
}

const RegionScreen = ({
  diff,
  state,
}: {
  diff: GraphDiff
  state: State
}) => {
  const region = visibleRegions(diff, state.identity)[
    state.regionIndex
  ]
  const mutations = visibleMutations(diff, region, state.identity)
  const { start, slice, more } = windowed(
    mutations,
    state.mutationIndex,
  )
  return $(
    Box,
    { flexDirection: 'column' },
    $(Text, { bold: true }, region?.label ?? ''),
    $(
      Text,
      { color: 'gray' },
      `  ${mutations.length} changed${region?.importers.length ? '' : '  (no importer reaches these)'}`,
    ),
    $(Box, { marginTop: 1, flexDirection: 'column' }, [
      ...slice.map((m, i) => {
        const d = describe(m)
        return $(Row, {
          key: m.id,
          selected: start + i === state.mutationIndex,
          mark: d.mark,
          color: d.color,
          text: d.text,
          note: m.directness === 'direct' ? 'direct' : undefined,
        })
      }),
      more ?
        $(Text, { key: 'more', color: 'gray' }, `  ... ${more} more`)
      : null,
    ]),
    $(Footer, { keys: '↑↓ move   ⏎ details   ← back   q quit' }),
  )
}

const Field = ({ label, value }: { label: string; value: string }) =>
  $(
    Text,
    null,
    $(Text, { color: 'gray' }, `  ${label.padEnd(12)}`),
    value,
  )

const NodeScreen = ({
  diff,
  state,
}: {
  diff: GraphDiff
  state: State
}) => {
  const region = visibleRegions(diff, state.identity)[
    state.regionIndex
  ]
  const mutations = visibleMutations(diff, region, state.identity)
  const m = mutations[state.mutationIndex]
  if (!m) return $(Text, { color: 'gray' }, 'nothing selected')
  const d = describe(m)

  const fields: [string, string][] = [
    ['CHANGE', m.kind],
    ['WHERE', region?.label ?? ''],
    ['REACH', m.directness],
  ]
  if (m.kind === 'package-resolved') {
    fields.push(
      ['DIRECTION', m.direction],
      ['FROM', m.from.id],
      ['TO', m.to.id],
    )
  } else if (m.kind === 'node-identity-changed') {
    fields.push(
      ['REASON', m.reason],
      ['FROM', m.from.id],
      ['TO', m.to.id],
    )
  } else if (m.kind === 'node-changed') {
    fields.push(['FIELDS', m.fields.join(', ')], ['ID', m.to.id])
  } else if (m.kind === 'node-added' || m.kind === 'node-removed') {
    fields.push(['ID', m.node.id])
    if (m.node.integrity) fields.push(['INTEGRITY', m.node.integrity])
  } else if (m.kind === 'peer-variants-regrouped') {
    fields.push(
      ['FROM', m.from.map(n => n.id).join('\n              ')],
      ['TO', m.to.map(n => n.id).join('\n              ')],
    )
  } else if (m.kind === 'edge-added' || m.kind === 'edge-removed') {
    fields.push(
      ['SLOT', `${m.edge.from} -> ${m.edge.name}`],
      ['SPEC', `${m.edge.type} ${m.edge.spec}`],
      ['TARGET', m.edge.to],
    )
  } else if (
    m.kind === 'edge-retargeted' ||
    m.kind === 'edge-respecified'
  ) {
    fields.push(
      ['SLOT', `${m.to.from} -> ${m.to.name}`],
      ['FROM', `${m.from.type} ${m.from.spec} ${m.from.to}`],
      ['TO', `${m.to.type} ${m.to.spec} ${m.to.to}`],
    )
  } else {
    fields.push(['FIELDS', m.fields.join(', ')])
  }

  return $(
    Box,
    { flexDirection: 'column' },
    $(
      Text,
      { bold: true },
      $(Text, { color: d.color }, `${d.mark} `),
      d.text,
    ),
    $(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      ...fields.map(([label, value]) =>
        $(Field, { key: label, label, value }),
      ),
    ),
    $(Footer, {
      keys: `↑↓ next change (${state.mutationIndex + 1}/${mutations.length})   ← back   q quit`,
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
  const { exit } = useApp()

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) return exit()
    if (key.downArrow || input === 'j') {
      return setState(s => reduce(s, 'MoveNext', diff))
    }
    if (key.upArrow || input === 'k') {
      return setState(s => reduce(s, 'MovePrevious', diff))
    }
    if (key.return || key.rightArrow) {
      return setState(s => reduce(s, 'Select', diff))
    }
    if (key.leftArrow || key.escape) {
      return setState(s => reduce(s, 'Back', diff))
    }
    if (input === 'i') {
      return setState(s => reduce(s, 'ToggleIdentity', diff))
    }
  })

  return (
    state.screen === 'summary' ? $(SummaryScreen, { diff, state })
    : state.screen === 'region' ? $(RegionScreen, { diff, state })
    : $(NodeScreen, { diff, state })
  )
}
