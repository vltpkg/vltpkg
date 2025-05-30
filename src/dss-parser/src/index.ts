import postcssSelectorParser from 'postcss-selector-parser'
import type { Pseudo, Root } from 'postcss-selector-parser'
import {
  asSelectorNode,
  isCombinatorNode,
  isPseudoNode,
  isTagNode,
} from './types.ts'
import type { PostcssNode } from './types.ts'

export * from './types.ts'

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
  ':malware',
  ':severity',
  ':sev',
  ':squat',
  ':semver',
  ':v',
])

const hasParamsToEscape = (node: Pseudo) =>
  pseudoCleanUpNeeded.has(node.value)

/**
 * Parses a CSS selector string into an AST
 * Handles escaping of forward slashes in specific patterns
 */
export const parse = (query: string): Root => {
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
  return postcssSelectorParser(transformAst).astSync(escapedQuery)
}
