import type { DepID } from '@vltpkg/dep-id'
import type { QueryPartIds } from '../filter-nodes-by-query.ts'
import type { Graph } from '../graph.ts'

/**
 * A parsed package.json `skills` field: its `npm:` entries, and issues
 * as `<file> "skills": <msg>`.
 */
export type SkillsFieldParse = {
  /** dep name, skill names (unset: all) */
  npm: { name: string; skills?: string[] }[]
  notes: string[]
}

type Entry = { source: string; skills?: string[]; ref?: string }

const NPM = 'npm:'
// ./x, ../x, /x, \x, ~x, C:\x
const LOCAL_PATH = /^(?:\.{1,2}(?:[\\/]|$)|[\\/~]|[a-z]:[\\/])/i

const isEntry = (v: unknown): v is Entry => {
  if (!v || typeof v !== 'object') return false
  const { source, skills, ref } = v as Record<string, unknown>
  return (
    typeof source === 'string' &&
    !!source &&
    source !== NPM &&
    (skills === undefined ||
      (Array.isArray(skills) &&
        skills.every(s => typeof s === 'string'))) &&
    (ref === undefined || typeof ref === 'string')
  )
}

/**
 * Parse a package.json `skills` field (array of `"<source>"` or
 * `{ source, skills?, ref? }`); `file` labels notes. Only `npm:`
 * sources are kept.
 */
export const parseSkillsField = (
  value: unknown,
  file: string,
): SkillsFieldParse => {
  const res: SkillsFieldParse = { npm: [], notes: [] }
  const note = (msg: string) =>
    res.notes.push(`${file} "skills": ${msg}`)
  if (value === undefined) return res
  if (!Array.isArray(value)) {
    note('must be an array')
    return res
  }
  for (const raw of value as unknown[]) {
    const e = typeof raw === 'string' ? { source: raw } : raw
    if (!isEntry(e)) {
      note(`invalid entry ${JSON.stringify(raw)}`)
      continue
    }
    const { source, skills, ref } = e
    const src = JSON.stringify(source)
    if (source.startsWith(NPM)) {
      if (ref !== undefined) note(`${src} can't have a "ref"`)
      else {
        res.npm.push({
          name: source.slice(NPM.length),
          ...(skills?.length ? { skills } : {}),
        })
      }
    } else if (LOCAL_PATH.test(source)) {
      note(`${src} not linked, local paths are not allowed`)
    } else {
      note(`${src} not linked, only npm: sources are supported`)
    }
  }
  return res
}

/**
 * Query parts for the `npm:` entries of the selected importers'
 * package.json `skills` fields, one per entry: the importer's dep of
 * that name, its skill names as `:skill()` patterns. `secure`: the dep
 * must be `selected` too (else a note).
 */
export const fieldSkills = (
  graph: Graph,
  selected: Set<DepID>,
  secure: boolean,
): { parts: QueryPartIds[]; notes: string[] } => {
  const parts: QueryPartIds[] = []
  const notes: string[] = []
  for (const node of graph.importers) {
    if (!selected.has(node.id)) continue
    const file =
      node.mainImporter ? 'package.json' : (
        `${node.location.replace(/^\.\//, '')}/package.json`
      )
    const m = node.manifest
    const value = m && 'skills' in m ? m.skills : undefined
    // entry by entry: notes in field order
    const each =
      Array.isArray(value) ? value.map((e: unknown) => [e]) : [value]
    for (const v of each) {
      const { npm, notes: own } = parseSkillsField(v, file)
      notes.push(...own)
      for (const { name, skills } of npm) {
        const dep = node.edgesOut.get(name)?.to
        const no = (why: string) =>
          notes.push(
            `${file} "skills": ${JSON.stringify(NPM + name)} not linked, ${why}`,
          )
        if (!dep) no('not an installed dependency')
        else if (secure && !selected.has(dep.id)) {
          no('not selected by the query')
        } else {
          parts.push({
            ids: new Set([dep.id]),
            ...(skills ? { patterns: skills } : {}),
          })
        }
      }
    }
  }
  return { parts, notes }
}
