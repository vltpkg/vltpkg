import { splitDepID } from '@vltpkg/dep-id/browser'
import { getOptions, gitHostWebsites } from '@vltpkg/spec/browser'
import { asPostcssNodeWithChildren } from '@vltpkg/dss-parser'
import { error } from '@vltpkg/error-cause'
import { removeDanglingEdges, removeNode } from './helpers.ts'
import { parseInternals } from './spec.ts'
import type { ParserState } from '../types.ts'

/**
 * Given a named git host (e.g. "github"), resolve its hostname
 * by looking up `gitHostWebsites` (e.g. "github.com"), or
 * falling back to the `git-hosts` template URL.
 */
const resolveGitHostname = (
  namedHost: string,
  gitHosts: Record<string, string>,
): string | undefined => {
  // Check gitHostWebsites first (e.g. github -> github.com)
  const website =
    gitHostWebsites[namedHost as keyof typeof gitHostWebsites]
  if (website) {
    try {
      return new URL(website).hostname
      /* c8 ignore next */
    } catch {}
  }

  // Fall back to parsing the git-hosts template URL
  const template = gitHosts[namedHost]
  if (template) {
    try {
      // Templates look like 'git+ssh://git@github.com:$1/$2.git'
      // Replace colons after the host with / for URL parsing
      const normalized = template
        .replace(/^git\+/, '')
        .replace(/:(\$)/, '/$1')
      return new URL(normalized).hostname
      /* c8 ignore next */
    } catch {}
  }
  /* c8 ignore next */
  return undefined
}

/**
 * Resolve the hostname for a git remote string.
 * Named hosts: "github:user/repo" -> extract "github" and look up.
 * Full URLs: "git+ssh://git@example.com/repo.git" -> parse URL.
 */
const getGitHostname = (
  gitRemote: string,
  gitHosts: Record<string, string>,
): string | undefined => {
  // Check if it's a named git host like "github:user/repo"
  const colonIdx = gitRemote.indexOf(':')
  if (colonIdx > 0) {
    const possibleHost = gitRemote.slice(0, colonIdx)
    // If this is a known named git host, resolve it
    if (possibleHost in gitHosts) {
      return resolveGitHostname(possibleHost, gitHosts)
    }
    // Could be a protocol URL like git+ssh://...
    try {
      const normalized = gitRemote
        .replace(/^git\+/, '')
        .replace(/^ssh:\/\/([^@]+@)?([^:/]+)[:/]/, 'ssh://$1$2/')
      return new URL(normalized).hostname
      /* c8 ignore next */
    } catch {}
  }
  /* c8 ignore start - git remotes always contain a colon */

  // Try parsing as a plain URL
  try {
    return new URL(gitRemote).hostname
  } catch {}

  return undefined
  /* c8 ignore stop */
}

/**
 * :hostname(str) Pseudo-Selector, matches only nodes whose
 * upstream hostname matches the provided domain string.
 *
 * Examples:
 * - :hostname("registry.npmjs.org") — default npm registry deps
 * - :hostname("github.com") — github git deps
 * - :hostname("example.com") — custom registry deps
 */
export const hostname = async (state: ParserState) => {
  let internals
  try {
    internals = parseInternals(
      asPostcssNodeWithChildren(state.current).nodes,
    )
  } catch (err) {
    throw error('Failed to parse :hostname selector', {
      cause: err,
    })
  }

  const targetHostname = internals.specValue

  for (const node of state.partial.nodes) {
    const tuple = splitDepID(node.id)
    const type = tuple[0]
    let nodeHostname: string | undefined

    switch (type) {
      case 'registry': {
        const registryName = tuple[1]
        const options = getOptions(node.options)
        // Look up the registry URL from registries map
        const registryUrl =
          options.registries[registryName] ?? options.registry
        if (registryUrl) {
          try {
            nodeHostname = new URL(registryUrl).hostname
            /* c8 ignore next */
          } catch {}
        }
        break
      }
      case 'git': {
        const gitRemote = tuple[1]
        const options = getOptions(node.options)
        nodeHostname = getGitHostname(gitRemote, options['git-hosts'])
        break
      }
      case 'remote': {
        const url = tuple[1]
        try {
          nodeHostname = new URL(url).hostname
          /* c8 ignore next */
        } catch {}
        break
      }
      // file and workspace deps are local — no hostname
      default: {
        nodeHostname = undefined
        break
      }
    }

    if (nodeHostname !== targetHostname) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
