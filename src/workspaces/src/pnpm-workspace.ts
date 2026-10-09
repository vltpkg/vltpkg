import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// a quote opens a scalar, or `#` a comment, only after a separator
const sep = (prev: string, flow: boolean): boolean =>
  !prev || (flow ? /[\s[,]/ : /\s/).test(prev)

// end of the quoted scalar opening at `i`, or -1 if not closed
const skipQuoted = (s: string, i: number): number => {
  const q = s.charAt(i)
  for (let j = i + 1; j < s.length && s.charAt(j) !== '\n'; j++) {
    const c = s.charAt(j)
    if (q === '"' && c === '\\') j++
    else if (c === q) {
      if (q === "'" && s.charAt(j + 1) === "'") j++
      else return j + 1
    }
  }
  return -1
}

const isQuote = (c: string) => c === "'" || c === '"'

const stripComment = (line: string, flow: boolean): string => {
  for (let i = 0; i < line.length; i++) {
    const c = line.charAt(i)
    const prev = line.charAt(i - 1)
    if (isQuote(c) && sep(prev, flow)) {
      const end = skipQuoted(line, i)
      if (end < 0) break
      i = end - 1
    } else if (c === '#' && sep(prev, false)) {
      return line.slice(0, i).trimEnd()
    }
  }
  return line.trimEnd()
}

// raw items of a `[a, 'b']` flow sequence that may span lines
const splitFlow = (s: string): string[] | undefined => {
  const items: string[] = []
  let start = 1
  for (let i = 1; i < s.length; i++) {
    const c = s.charAt(i)
    if (isQuote(c) && sep(s.charAt(i - 1), true)) {
      const end = skipQuoted(s, i)
      if (end < 0) return undefined
      i = end - 1
    } else if (c === '[' || c === '{') {
      return undefined
    } else if (c === ',' || c === ']') {
      const item = s.slice(start, i).trim()
      if (item) items.push(item)
      else if (c === ',') return undefined
      if (c === ']') {
        return /^(?:\n|$)/.test(s.slice(i + 1)) ? items : undefined
      }
      start = i + 1
    }
  }
  return undefined
}

// raw items of a `- a` block sequence, up to the next top-level key
const splitBlock = (lines: string[]): string[] | undefined => {
  const items: string[] = []
  let indent: number | undefined
  for (const line of lines) {
    const l = stripComment(line, false)
    if (!l.trim()) continue
    const m = /^ *- +(?=\S)/.exec(l)
    if (!m) {
      if (/^\S/.test(l) && l !== '-') break
      return undefined
    }
    const i = l.indexOf('-')
    indent ??= i
    if (i !== indent) return undefined
    items.push(l.slice(m[0].length))
  }
  return items
}

const scalar = (s: string, flow: boolean): string | undefined => {
  if (/^'(?:[^']|'')*'$/.test(s)) {
    return s.slice(1, -1).replace(/''/g, "'")
  }
  if (s.startsWith('"')) {
    try {
      // starts with `"`, so a string if it parses at all
      return JSON.parse(s) as string
    } catch {
      return undefined
    }
  }
  return (
      /^[-?:,[\]{}#&*!|>'"%@`]/.test(s) ||
        /: |:$|\s['"]/.test(s) ||
        (flow && /[{}\n]/.test(s))
    ) ?
      undefined
    : s
}

/**
 * The `packages` globs of a `pnpm-workspace.yaml` file. Only a plain
 * block or flow list of strings is read; anything else, or a list
 * without positive globs (after dropping `.` root entries), gives
 * `undefined`. Never throws.
 */
export const parsePnpmWorkspacePackages = (
  yaml: string,
): string[] | undefined => {
  const lines = yaml.replace(/^\uFEFF/, '').split(/\r?\n/)
  const keys = lines.flatMap((l, i) => {
    const m = /^(['"]?)packages\1[ \t]*:(?=[ \t]|$)/.exec(l)
    return m ? [{ i, value: l.slice(m[0].length) }] : []
  })
  const [key, dup] = keys
  if (!key || dup) return undefined
  const flow = key.value.trimStart().startsWith('[')
  const rest = stripComment(key.value, flow).trim()
  const after = lines.slice(key.i + 1)
  const raw =
    flow ?
      splitFlow(
        [rest, ...after.map(l => stripComment(l, true))].join('\n'),
      )
    : rest ? undefined
    : splitBlock(after)
  const out = raw?.map(r => scalar(r, flow))
  if (!out?.every(v => v !== undefined)) return undefined
  // root is always the main importer, never a workspace
  const globs = out.filter(v => v !== '.' && v !== './')
  return globs.some(g => !g.startsWith('!')) ? globs : undefined
}

/**
 * Read the `packages` globs from `pnpm-workspace.yaml` in the project
 * root, or `undefined` if missing or not parseable.
 */
export const readPnpmWorkspacePackages = (
  projectRoot: string,
): string[] | undefined => {
  let yaml: string
  try {
    yaml = readFileSync(
      resolve(projectRoot, 'pnpm-workspace.yaml'),
      'utf8',
    )
  } catch {
    return undefined
  }
  return parsePnpmWorkspacePackages(yaml)
}
