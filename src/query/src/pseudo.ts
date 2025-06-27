import { error } from '@vltpkg/error-cause'
import { removeDanglingEdges, removeNode } from './pseudo/helpers.ts'
import {
  asPostcssNodeWithChildren,
  asPseudoNode,
  isSelectorNode,
} from '@vltpkg/dss-parser'

// imported pseudo selectors
import { abandoned } from './pseudo/abandoned.ts'
import { attr } from './pseudo/attr.ts'
import { confused } from './pseudo/confused.ts'
import { cve } from './pseudo/cve.ts'
import { cwe } from './pseudo/cwe.ts'
import { debug } from './pseudo/debug.ts'
import { deprecated } from './pseudo/deprecated.ts'
import { dev } from './pseudo/dev.ts'
import { dynamic } from './pseudo/dynamic.ts'
import { empty } from './pseudo/empty.ts'
import { entropic } from './pseudo/entropic.ts'
import { env } from './pseudo/env.ts'
import { evalParser } from './pseudo/eval.ts'
import { fs } from './pseudo/fs.ts'
import { license } from './pseudo/license.ts'
import { link } from './pseudo/link.ts'
import { malware } from './pseudo/malware.ts'
import { minified } from './pseudo/minified.ts'
import { missing } from './pseudo/missing.ts'
import { nativeParser } from './pseudo/native.ts'
import { network } from './pseudo/network.ts'
import { obfuscated } from './pseudo/obfuscated.ts'
import { optional } from './pseudo/optional.ts'
import { outdated } from './pseudo/outdated.ts'
import { path } from './pseudo/path.ts'
import { peer } from './pseudo/peer.ts'
import { prerelease } from './pseudo/prerelease.ts'
import { published } from './pseudo/published.ts'
import { privateParser } from './pseudo/private.ts'
import { prod } from './pseudo/prod.ts'
import { root } from './pseudo/root.ts'
import { scanned } from './pseudo/scanned.ts'
import { score } from './pseudo/score.ts'
import { scripts } from './pseudo/scripts.ts'
import { shell } from './pseudo/shell.ts'
import { semverParser as semver } from './pseudo/semver.ts'
import { severity } from './pseudo/severity.ts'
import { shrinkwrap } from './pseudo/shrinkwrap.ts'
import { squat } from './pseudo/squat.ts'
import { suspicious } from './pseudo/suspicious.ts'
import { tracker } from './pseudo/tracker.ts'
import { trivial } from './pseudo/trivial.ts'
import { type } from './pseudo/type.ts'
import { undesirable } from './pseudo/undesirable.ts'
import { unknown } from './pseudo/unknown.ts'
import { unmaintained } from './pseudo/unmaintained.ts'
import { unpopular } from './pseudo/unpopular.ts'
import { unstable } from './pseudo/unstable.ts'
import { workspace } from './pseudo/workspace.ts'

import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import type { ParserFn, ParserState } from './types.ts'

/**
 * :has Pseudo-Selector, matches only nodes that have valid results
 * for its nested selector expressions.
 */
const has = async (state: ParserState) => {
  const top = asPostcssNodeWithChildren(state.current)
  const collectNodes = new Set<NodeLike>()
  const collectEdges = new Set<EdgeLike>()

  for (const node of top.nodes) {
    if (isSelectorNode(node)) {
      const nestedState = await state.walk({
        cancellable: state.cancellable,
        initial: {
          edges: new Set(state.initial.edges),
          nodes: new Set(state.initial.nodes),
        },
        current: node,
        walk: state.walk,
        collect: {
          edges: new Set(),
          nodes: new Set(),
        },
        partial: {
          edges: new Set(state.partial.edges),
          nodes: new Set(state.partial.nodes),
        },
        retries: state.retries,
        securityArchive: state.securityArchive,
        specOptions: state.specOptions,
        signal: state.signal,
        scopeIDs: state.scopeIDs,
        comment: state.comment,
        specificity: { ...state.specificity },
      })
      for (const n of nestedState.collect.nodes) {
        collectNodes.add(n)
      }
      for (const e of nestedState.partial.edges) {
        collectEdges.add(e)
      }
    }
  }

  // if the nested selector did not match anything, that means
  // no current node has any matches
  if (collectNodes.size === 0) {
    state.partial.edges.clear()
    state.partial.nodes.clear()
    return state
  }

  // handles transitive dependencies
  // compareNodes collects a list of all ancestor nodes
  // from the resulting nodes of the nested selector
  const compareNodes = new Set<NodeLike>()
  const traverse = new Set(collectNodes)
  for (const node of traverse) {
    for (const edge of node.edgesIn) {
      compareNodes.add(edge.from)
      if (edge.from.edgesIn.size) {
        traverse.add(edge.from)
      }
    }
  }

  // for each node in the current list checks to see if
  // it has a node in the resulting nested state that is
  // a transitive dependency / children.
  nodesLoop: for (const node of state.partial.nodes) {
    if (node.edgesOut.size === 0 || !compareNodes.has(node)) {
      removeNode(state, node)
      continue
    }

    for (const edge of node.edgesOut.values()) {
      if (collectEdges.has(edge)) {
        continue nodesLoop
      }
    }
    removeNode(state, node)
  }

  removeDanglingEdges(state)

  return state
}

/**
 * :is Pseudo-selector, acts as a shortcut for writing more compact expressions
 * by allowing multiple nested selectors to match on the previous results.
 *
 * It also enables the loose parsing mode, skipping instead of erroring usage
 * of non-existing classes, identifiers, pseudo-classes, etc.
 */
const is = async (state: ParserState) => {
  const top = asPostcssNodeWithChildren(state.current)
  const collect = new Set()
  for (const node of top.nodes) {
    if (isSelectorNode(node)) {
      const nestedState = await state.walk({
        cancellable: state.cancellable,
        collect: {
          edges: new Set(),
          nodes: new Set(),
        },
        current: node,
        initial: state.initial,
        loose: true,
        partial: {
          nodes: new Set(state.partial.nodes),
          edges: new Set(state.partial.edges),
        },
        walk: state.walk,
        retries: state.retries,
        securityArchive: state.securityArchive,
        specOptions: state.specOptions,
        signal: state.signal,
        scopeIDs: state.scopeIDs,
        comment: state.comment,
        specificity: { ...state.specificity },
      })
      for (const n of nestedState.collect.nodes) {
        collect.add(n)
      }
    }
  }
  for (const node of state.partial.nodes) {
    if (!collect.has(node)) {
      removeNode(state, node)
    }
  }
  return state
}

/**
 * :not Pseudo-class, serves to create negate expressions, anything that
 * matches selectors declared inside the `:not()` expression is going to be
 * filtered out in the final result.
 */
const not = async (state: ParserState) => {
  const top = asPostcssNodeWithChildren(state.current)
  const collect = new Set()
  for (const node of top.nodes) {
    if (isSelectorNode(node)) {
      const nestedState = await state.walk({
        cancellable: state.cancellable,
        collect: {
          edges: new Set(),
          nodes: new Set(),
        },
        current: node,
        initial: state.initial,
        partial: {
          nodes: new Set(state.partial.nodes),
          edges: new Set(state.partial.edges),
        },
        walk: state.walk,
        retries: state.retries,
        securityArchive: state.securityArchive,
        specOptions: state.specOptions,
        signal: state.signal,
        scopeIDs: state.scopeIDs,
        comment: state.comment,
        specificity: { ...state.specificity },
      })
      for (const n of nestedState.collect.nodes) {
        collect.add(n)
      }
      /* c8 ignore start - should be impossible */
    } else {
      throw error('Error parsing :not() selectors', {
        wanted: { type: 'selector' },
        found: node,
      })
    }
    /* c8 ignore stop */
  }
  for (const node of state.partial.nodes) {
    if (collect.has(node)) {
      removeNode(state, node)
    }
  }
  return state
}

/**
 * :project Pseudo-Class, matches only graph importers (e.g: the
 * root node along with any configured workspace)
 */
const project = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    if (!node.importer) {
      removeNode(state, node)
    }
  }
  for (const edge of state.partial.edges) {
    if (!edge.to?.importer) {
      state.partial.edges.delete(edge)
    }
  }
  return state
}

/**
 * :scope Pseudo-Element, returns only the nodes that match the provided scopeIDs
 * from the Query.search method.
 */
const scope = async (state: ParserState) => {
  const scopeIDSet = new Set(state.scopeIDs)

  for (const node of state.partial.nodes) {
    if (!scopeIDSet.has(node.id)) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}

const pseudoSelectors = new Map<string, ParserFn>(
  Object.entries({
    abandoned,
    attr,
    confused,
    cve,
    cwe,
    debug,
    deprecated,
    dev,
    dynamic,
    eval: evalParser,
    empty,
    entropic,
    env,
    fs,
    has,
    is,
    license,
    link,
    malware,
    minified,
    missing,
    native: nativeParser,
    network,
    not,
    obfuscated,
    optional,
    outdated,
    path,
    peer,
    prerelease,
    published,
    // TODO: overridden
    private: privateParser,
    prod,
    project,
    root,
    scanned,
    scope,
    score,
    scripts,
    semver,
    sev: severity,
    severity,
    shell,
    shrinkwrap,
    squat,
    suspicious,
    tracker,
    trivial,
    type,
    undesirable,
    unknown,
    unmaintained,
    unpopular,
    unstable,
    v: semver,
    workspace,
  }),
)

/**
 * Parsers the `pseudo` node types.
 */
export const pseudo = async (state: ParserState) => {
  await state.cancellable()

  const curr = asPseudoNode(state.current)
  const parserFn =
    curr.value && pseudoSelectors.get(curr.value.slice(1))

  if (!parserFn) {
    if (state.loose) {
      state.partial.edges.clear()
      state.partial.nodes.clear()
      return state
    }

    throw error(`Unsupported pseudo-class: ${state.current.value}`, {
      found: state.current,
    })
  }

  const result = await parserFn(state)

  // Increment the commonCounter for specificity, except for
  // nesting selectors which don't contribute to specificity
  const pseudoValue = curr.value.slice(1)
  if (
    pseudoValue &&
    pseudoValue !== 'not' &&
    pseudoValue !== 'is' &&
    pseudoValue !== 'has'
  ) {
    result.specificity.commonCounter += 1
  }

  return result
}
