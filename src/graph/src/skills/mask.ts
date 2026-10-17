import type { QueryPartIds } from '../filter-nodes-by-query.ts'
import type { Skill } from './discover.ts'
import { packageKey } from './mounts.ts'

/**
 * A `:skill()` pattern that matched no skill of its selector's
 * packages.
 */
export type UnmatchedPattern = {
  pattern: string
  /** skills those packages ship, sorted; unset: no package selected */
  skills?: string[]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whole-name, case-insensitive; `*` = any run of characters (incl.
 * none).
 */
export const globRegExp = (pattern: string): RegExp =>
  new RegExp(`^${pattern.split('*').map(escape).join('.*')}$`, 'i')

const matches = (re: RegExp, s: Skill) =>
  re.test(s.skill) ||
  (!!s.frontmatterName && re.test(s.frontmatterName))

/**
 * Apply an `allow-skills` mask. A skill is picked when some part matched
 * its package (any version) and has no patterns, or one of its patterns
 * matches the skill (parts are a union). Also returns the patterns that
 * matched nothing.
 */
export const maskSkills = (
  skills: Skill[],
  parts: QueryPartIds[],
): { skills: Skill[]; unmatched: UnmatchedPattern[] } => {
  const compiled = parts.map(p => ({
    keys: new Set([...p.ids].map(packageKey)),
    patterns: p.patterns?.map(pattern => ({
      pattern,
      re: globRegExp(pattern),
    })),
  }))
  const picked = skills.filter(s =>
    compiled.some(
      p =>
        p.keys.has(packageKey(s.id)) &&
        (!p.patterns || p.patterns.some(({ re }) => matches(re, s))),
    ),
  )
  const unmatched: UnmatchedPattern[] = []
  for (const p of compiled) {
    if (!p.patterns) continue
    const own = skills.filter(s => p.keys.has(packageKey(s.id)))
    for (const { pattern, re } of p.patterns) {
      if (own.some(s => matches(re, s))) continue
      unmatched.push({
        pattern,
        ...(p.keys.size > 0 && {
          skills: [...new Set(own.map(s => s.skill))].sort((a, b) =>
            a.localeCompare(b, 'en'),
          ),
        }),
      })
    }
  }
  return { skills: picked, unmatched }
}
