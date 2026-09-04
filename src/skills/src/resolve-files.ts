import { existsSync, readFileSync } from 'node:fs'
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'
import { error } from '@vltpkg/error-cause'
import type { Skill } from './types.ts'

/** Matches `[label](target)`, capturing the raw target (and any title). */
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g

/**
 * Follow relative markdown links from `SKILL.md` to find every file
 * the skill actually needs, recursing into linked `.md` files. Paths
 * are relative to `skill.dir`.
 */
export const resolveSkillFiles = (skill: Skill): string[] => {
  const visited = new Set<string>()
  const queue: string[] = ['SKILL.md']

  let rel: string | undefined
  while ((rel = queue.shift()) !== undefined) {
    if (visited.has(rel)) continue
    visited.add(rel)
    if (!rel.endsWith('.md')) continue

    const abs = join(skill.dir, rel)
    if (!existsSync(abs)) {
      throw error(`${skill.name}: linked file not found: ${rel}`, {
        name: skill.name,
        path: rel,
      })
    }
    const content = readFileSync(abs, 'utf8')

    for (const match of content.matchAll(LINK_RE)) {
      // match[1] is always defined here: the capturing group above is
      // mandatory, so a successful match always populates it. Its
      // first whitespace-separated word always exists too, since
      // String#split never returns an empty array.
      /* c8 ignore next */
      const target = (match[1] ?? '').trim().split(/\s+/)[0] ?? ''
      if (target === '') continue
      if (target.startsWith('#')) continue
      if (/^https?:\/\//i.test(target)) continue

      // pathPart can't be empty here: target is non-empty and doesn't
      // start with '#' (checked above), so splitting on '#' always
      // leaves a non-empty first segment.
      /* c8 ignore next */
      const pathPart = target.split('#')[0] ?? ''
      /* c8 ignore next */
      if (!pathPart) continue

      const resolvedAbs = resolve(dirname(abs), pathPart)
      const relFromSkillRoot = relative(skill.dir, resolvedAbs)
      if (
        relFromSkillRoot.startsWith('..') ||
        isAbsolute(relFromSkillRoot)
      ) {
        throw error(
          `${skill.name}: link in ${rel} escapes the skill directory: ${target}`,
          { name: skill.name, path: target },
        )
      }
      queue.push(relFromSkillRoot)
    }
  }

  return [...visited]
}
