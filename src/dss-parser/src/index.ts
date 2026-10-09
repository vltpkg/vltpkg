import postcssSelectorParser from 'postcss-selector-parser'
import { syntaxError } from '@vltpkg/error-cause'
import type { Pseudo, Root, Selector } from 'postcss-selector-parser'
import {
  attributeOperatorNames,
  combinatorNames,
  pseudoClassNames,
} from './grammar.ts'
import {
  asSelectorNode,
  isAttributeNode,
  isCombinatorNode,
  isPseudoNode,
  isStringNode,
  isTagNode,
} from './types.ts'
import type { PostcssNode } from './types.ts'

export * from './types.ts'
export * from './grammar.ts'

/**
 * Escapes forward slashes in specific patterns matching @scoped/name paths
 * This will allow usage of unescaped forward slashes necessary for scoped
 * package names in the id selector.
 */
export const escapeScopedNamesSlashes = (query: string): string =>
  query.replace(
    /(#@(\w|-|\.)+)\//gm,
    (_, scope: string) => `${scope}\\/`,
  )

export const escapeDots = (query: string): string =>
  query.replaceAll('.', '\\.')

export const unescapeDots = (query: string): string =>
  query.replaceAll('\\.', '.')

const pseudoCleanUpNeeded = new Set([
  ':published',
  ':score',
  ':severity',
  ':sev',
  ':squat',
  ':semver',
  ':v',
  ':vuln',
  ':vulnerable',
])

const hasParamsToEscape = (node: Pseudo) =>
  pseudoCleanUpNeeded.has(node.value)

const pseudoClasses = new Set<string>(pseudoClassNames)
const combinators = new Set<string>(combinatorNames)
const attributeOperators = new Set<string>(attributeOperatorNames)
// pseudo-classes taking selector args, all others take strings
const selectorPseudos = new Set(['has', 'is', 'not'])

const invalid = (message: string, found: string) =>
  syntaxError(message, { code: 'EQUERY', found })

/**
 * Checks a parsed selector against the DSS grammar.
 * `forgiving`: inside `:is()`, only bare words / strings / empty
 * `#` `[]` are rejected.
 */
const validate = (
  selector: Selector,
  query: string,
  forgiving = false,
): void => {
  const nodes = selector.nodes.filter(n => n.type !== 'comment')
  if (!nodes.length && !forgiving) {
    throw invalid('Empty selector', query)
  }
  nodes.forEach((node, i) => {
    // `#` / `[]`: nothing to match
    if (
      (node.type === 'id' && !node.value) ||
      (node.type === 'attribute' && !node.attribute)
    ) {
      throw invalid(
        'Unsupported selector',
        node.type === 'id' ? '#' : '[]',
      )
    }
    if (isCombinatorNode(node)) {
      if (forgiving) return
      if (!combinators.has(node.value)) {
        throw syntaxError(`Unsupported combinator: ${node.value}`, {
          code: 'EQUERY',
          found: node.value,
          validOptions: combinatorNames,
        })
      }
      const next = nodes[i + 1]
      if (!next || isCombinatorNode(next)) {
        throw invalid('Dangling combinator', query)
      }
    } else if (isPseudoNode(node)) {
      const name = node.value.slice(1)
      if (!pseudoClasses.has(name)) {
        if (forgiving) return
        throw invalid(
          `Unsupported pseudo-class: ${node.value}`,
          node.value,
        )
      }
      if (selectorPseudos.has(name)) {
        for (const n of node.nodes) {
          validate(
            asSelectorNode(n),
            query,
            forgiving || name === 'is',
          )
        }
      }
    } else if (isAttributeNode(node)) {
      if (
        !forgiving &&
        node.operator &&
        !attributeOperators.has(node.operator)
      ) {
        throw invalid(
          `Unsupported attribute operator: ${node.operator}`,
          node.operator,
        )
      }
    } else if (
      (isTagNode(node) && node.value !== '{' && node.value !== '}') ||
      isStringNode(node)
    ) {
      // `{` / `}` tags are a noop in the query engine
      throw invalid('Unsupported selector', node.value)
    }
  })
}

export type ParseOptions = {
  /** skip DSS grammar checks, malformed syntax still throws */
  loose?: boolean
}

/**
 * Parses a DSS query string into an AST
 * Handles escaping of forward slashes in specific patterns
 * Throws an `EQUERY` SyntaxError on invalid DSS
 */
export const parse = (
  query: string,
  { loose = false }: ParseOptions = {},
): Root => {
  if (!loose && !query.trim()) throw invalid('Empty query', query)
  const escapedQuery = escapeDots(escapeScopedNamesSlashes(query))
  const transformAst = (root: Root) => {
    root.walk((node: PostcssNode) => {
      // clean up the escaped dots
      if (node.value && typeof node.value === 'string') {
        node.value = unescapeDots(node.value)
      }
      if (isPseudoNode(node) && hasParamsToEscape(node)) {
        // these are pseudo nodes that should only take strings as
        // parameters, so in this preparse step we clean up anything
        // that was recognized as a postcss node and transform that
        // into something that can be most likely parsed as a string
        for (const n of node.nodes) {
          // the parameters have a selector node that wraps them up
          const selector = asSelectorNode(n)
          if (!selector.nodes.length) continue
          selector.nodes.forEach((currentNode, index, arr) => {
            // get the next node, we'll update it later
            const nextNode = arr[index + 1]
            // if the current node is a combinator node, we'll need to
            // escape it, we do so by removing the node entirely and
            // updating the contents of the next node with its value
            if (
              isCombinatorNode(currentNode) &&
              isTagNode(nextNode)
            ) {
              nextNode.value = `${currentNode.spaces.before}${currentNode.value}${currentNode.spaces.after}${nextNode.value}`
              // make sure to also update the source position
              // references, those are used by the syntax highlighter
              if (
                nextNode.source?.start?.line &&
                currentNode.source?.start?.line
              ) {
                nextNode.source.start.line =
                  currentNode.source.start.line
              }
              if (
                nextNode.source?.start?.column &&
                currentNode.source?.start?.column
              ) {
                nextNode.source.start.column =
                  currentNode.source.start.column
              }
              // removes the current node from the selector node
              arr.splice(index, 1)
            }
          })
          // after removing combinator nodes, if we end up with multiple
          // tags in the selector node, we need to smush them together
          selector.nodes.reduce((acc, currentNode) => {
            if (currentNode === acc) return acc
            acc.value = `${acc.value}${currentNode.spaces.before}${currentNode.value}${currentNode.spaces.after}`
            // make sure to also update the source position refs
            if (
              currentNode.source?.end?.line &&
              acc.source?.end?.line
            ) {
              acc.source.end.line = currentNode.source.end.line
            }
            if (
              currentNode.source?.end?.column &&
              acc.source?.end?.column
            ) {
              acc.source.end.column = currentNode.source.end.column
            }
            return acc
          }, selector.first)
          // the selector wrapper node should have a single node
          selector.nodes.length = 1
        }
      }
    })
  }
  let ast: Root
  try {
    ast = postcssSelectorParser(transformAst).astSync(escapedQuery)
  } catch (err) {
    // postcss crashes with a TypeError when input ends after `(`
    const reason =
      err instanceof TypeError ?
        'unexpected end of input'
      : (err as Error).message
    throw syntaxError(`Invalid query syntax: ${reason}`, {
      code: 'EQUERY',
      found: query,
      cause: err,
    })
  }
  if (!loose) {
    // postcss silently drops a trailing top-level comma
    if (/(^|[^\\])(\\\\)*,\s*$/.test(query)) {
      throw invalid('Empty selector', query)
    }
    for (const s of ast.nodes) validate(s, query)
  }
  return ast
}
