import { asPseudoNode } from '@vltpkg/dss-parser'
import { queryError } from '../error.ts'
import { removeQuotes } from './helpers.ts'
import type { ParserState } from '../types.ts'

/**
 * `:skill(<pattern>, ...)`: picks agent skills of the packages its
 * selector matched. Never filters nodes: the walker stores the
 * patterns in the selector's `parts` entry. Opt-in only.
 */
export const skill = async (state: ParserState) => {
  const curr = asPseudoNode(state.current)
  const sel = curr.parent
  const fail = (message: string) => queryError(message, state.current)
  if (
    sel?.parent?.type !== 'root' ||
    sel.nodes
      .slice(sel.index(curr) + 1)
      .some(n => n.type !== 'comment')
  ) {
    throw fail(':skill() must end a top-level selector')
  }
  if (!state.partSelectors?.has('skill')) {
    throw fail(
      ':skill() only applies to --allow-skills and vlt skills',
    )
  }
  if (!curr.nodes.length) throw fail('Missing skill name in :skill()')
  const patterns = curr.nodes.map(arg => {
    let pattern = ''
    for (const n of arg.nodes) {
      if (n.type === 'comment') continue
      // `a|b` is tag `b` in namespace `a`: never drop the `a`
      if (
        (n.type === 'tag' || n.type === 'universal') &&
        !String(n).includes('|')
      ) {
        pattern += n.value
      } else if (n.type === 'string') {
        if (n.value.startsWith("'")) {
          throw fail(
            'Invalid skill name in :skill(), use double quotes',
          )
        }
        pattern += removeQuotes(n.value)
      } else {
        throw fail(
          n.type === 'combinator' ?
            'Invalid skill name in :skill(), quote names with spaces'
          : 'Invalid skill name in :skill()',
        )
      }
    }
    if (!pattern) throw fail('Missing skill name in :skill()')
    return pattern
  })
  state.part = { name: 'skill', patterns }
  return state
}
