import { error } from '@vltpkg/error-cause'
import {
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { norm } from './mounts.ts'

/** Always a target when detecting: read by most agents. */
export const AGENTS_SKILLS = '.agents/skills'

/** Set (non-empty) inside Claude Code. */
export const CLAUDE_ENV = ['CLAUDECODE', 'CLAUDE_CODE'] as const

/**
 * Agent folder at the project root → its skills dir.
 */
// vercel-labs/skills v1.7.2 src/agents.ts: skillsDir per agent (line), dot roots only
export const AGENT_ROOTS: readonly (readonly [
  marker: string,
  dir: string,
])[] = [
  ['.adal', '.adal/skills'], // 813
  ['.aider-desk', '.aider-desk/skills'], // 84
  ['.augment', '.augment/skills'], // 140
  ['.autohand', '.autohand/skills'], // 131
  ['.bob', '.bob/skills'], // 149
  ['.claude', '.claude/skills'], // 158
  ['.codeartsdoer', '.codeartsdoer/skills'], // 191
  ['.codebuddy', '.codebuddy/skills'], // 200
  ['.codemaker', '.codemaker/skills'], // 209
  ['.codestudio', '.codestudio/skills'], // 218
  ['.commandcode', '.commandcode/skills'], // 236
  ['.continue', '.continue/skills'], // 245
  ['.cortex', '.cortex/skills'], // 254
  ['.crush', '.crush/skills'], // 263
  ['.devin', '.devin/skills'], // 291
  ['.forge', '.forge/skills'], // 345
  ['.goose', '.goose/skills'], // 382
  ['.grok', '.grok/skills'], // 391
  ['.hermes', '.hermes/skills'], // 400
  ['.iflow', '.iflow/skills'], // 436
  ['.inferencesh', '.inferencesh/skills'], // 409
  ['.jazz', '.jazz/skills'], // 418
  ['.junie', '.junie/skills'], // 427
  ['.kimchi', '.kimchi/skills'], // 456
  ['.kiro', '.kiro/skills'], // 474
  ['.kode', '.kode/skills'], // 483
  ['.lingma', '.lingma/skills'], // 492
  ['.mcpjam', '.mcpjam/skills'], // 511
  ['.minimax', '.minimax/skills'], // 520
  ['.moxby', '.moxby/skills'], // 538
  ['.mux', '.mux/skills'], // 547
  ['.neovate', '.neovate/skills'], // 782
  ['.ona', '.ona/skills'], // 574
  ['.openhands', '.openhands/skills'], // 565
  ['.pochi', '.pochi/skills'], // 791
  ['.posit/assistant', '.posit/assistant/skills'], // 595
  ['.qoder', '.qoder/skills'], // 604,613
  ['.qwen', '.qwen/skills'], // 622
  ['.reasonix', '.reasonix/skills'], // 641
  ['.roo', '.roo/skills'], // 659
  ['.rovodev', '.rovodev/skills'], // 650
  ['.tabnine', '.tabnine/agent/skills'], // 678
  ['.terramind', '.terramind/skills'], // 687
  ['.tinycloud', '.tinycloud/skills'], // 696
  ['.trae', '.trae/skills'], // 705,714
  ['.vibe', '.vibe/skills'], // 529
  ['.windsurf', '.windsurf/skills'], // 732
  ['.zcode', '.zcode/skills'], // 755
  ['.zencoder', '.zencoder/skills'], // 764,773
]

/**
 * An agent skills dir.
 */
export type SkillsDir = {
  /** `/`-separated, relative to projectRoot */
  dir: string
  /** realpath (a missing tail appended as is) */
  real: string
  /** `<dev>:<ino>` (no inode: the path); unset when missing */
  id?: string
}

/**
 * Result of {@link skillsDirs}.
 */
export type SkillsDirs = {
  /** dirs to link into */
  targets: SkillsDir[]
  /** existing dirs to look for vlt links in: targets first */
  scan: SkillsDir[]
  /** targets dropped: `<dir> (<reason>)` */
  skipped: string[]
}

/**
 * Options for {@link skillsDirs}.
 */
export type SkillsDirsOptions = {
  projectRoot: string
  /** `skills-dir`: replaces detection; `[]` none */
  configured?: string[]
  /** default `process.env` */
  env?: Record<string, string | undefined>
  /** create missing targets */
  create?: boolean
}

// strictly below root
const inside = (root: string, p: string) => {
  const r = relative(root, p)
  return (
    !!r && r !== '..' && !r.startsWith('..' + sep) && !isAbsolute(r)
  )
}

// a `node_modules` segment below root
const inNodeModules = (root: string, p: string) =>
  relative(root, p)
    .split(sep)
    .some(s => s.toLowerCase() === 'node_modules')

const isDir = (path: string) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * Throw EUSAGE unless each entry is a dir inside projectRoot, not in
 * `node_modules`.
 */
export const assertSkillsDirs = (
  projectRoot: string,
  list: string[] = [],
): void => {
  for (const e of list) {
    const p = resolve(projectRoot, e)
    if (
      e &&
      (!inside(projectRoot, p) || inNodeModules(projectRoot, p))
    ) {
      throw error(
        'Invalid --skills-dir: must be a dir inside the project, not in node_modules',
        { code: 'EUSAGE', found: e },
        assertSkillsDirs,
      )
    }
  }
}

// walk `dir` from the real root, one component at a time, so a
// symlink out of the project is caught before anything is made in it.
// A string is the reason it was skipped (fs errors: the code)
const walk = (
  realRoot: string,
  dir: string,
  create: boolean,
): SkillsDir | string => {
  const parts = dir.split('/')
  let real = realRoot
  try {
    for (const [i, part] of parts.entries()) {
      const next = join(real, part)
      let st = lstatSync(next, { throwIfNoEntry: false })
      if (!st) {
        if (!create)
          return { dir, real: join(real, ...parts.slice(i)) }
        try {
          mkdirSync(next)
        } catch (er) {
          if ((er as NodeJS.ErrnoException).code !== 'EEXIST')
            throw er
        }
        st = lstatSync(next)
      }
      if (st.isSymbolicLink()) {
        let r: string
        try {
          r = realpathSync(next)
        } catch {
          return 'not a directory'
        }
        if (!inside(realRoot, r)) return 'outside the project'
        if (inNodeModules(realRoot, r)) return 'inside node_modules'
        if (!isDir(r)) return 'not a directory'
        real = r
      } else if (st.isDirectory()) {
        real = next
      } else {
        return 'not a directory'
      }
    }
    const { dev, ino } = statSync(real, { bigint: true })
    // some filesystems report no inode: compare paths
    return { dir, real, id: ino ? `${dev}:${ino}` : norm(real) }
  } catch (er) {
    return String((er as NodeJS.ErrnoException).code)
  }
}

/**
 * The project's agent skill dirs. `configured` replaces detection:
 * `.agents/skills`, plus `<folder>/skills` for each agent folder at
 * the root, `.claude/skills` inside Claude Code, and existing
 * `.<name>/skills` dirs. Dirs must resolve inside projectRoot, not in
 * `node_modules`; the same dir is listed once.
 */
export const skillsDirs = ({
  projectRoot,
  configured,
  env = process.env,
  create = false,
}: SkillsDirsOptions): SkillsDirs => {
  const realRoot = realpathSync(projectRoot)
  const res: SkillsDirs = { targets: [], scan: [], skipped: [] }
  const dots = readdirSync(realRoot)
    .filter(e => e.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map(e => `${e}/skills`)
  let list: string[]
  if (configured) {
    assertSkillsDirs(projectRoot, configured)
    list = configured.filter(Boolean)
  } else {
    const found = new Set<string>()
    for (const [marker, d] of AGENT_ROOTS) {
      if (isDir(join(realRoot, marker))) found.add(d)
    }
    if (CLAUDE_ENV.some(k => env[k])) found.add('.claude/skills')
    for (const d of dots) {
      if (isDir(join(realRoot, d))) found.add(d)
    }
    list = [
      AGENTS_SKILLS,
      ...[...found].sort((a, b) => a.localeCompare(b, 'en')),
    ]
  }
  const dirs = new Set(
    list.map(e =>
      relative(projectRoot, resolve(projectRoot, e))
        .split(sep)
        .join('/'),
    ),
  )
  const seen = new Set<string>()
  for (const dir of dirs) {
    const d = walk(realRoot, dir, create)
    if (typeof d === 'string') {
      res.skipped.push(`${dir} (${d})`)
    } else if (!seen.has(d.id ?? d.real)) {
      seen.add(d.id ?? d.real)
      res.targets.push(d)
      if (d.id) res.scan.push(d)
    }
  }
  for (const dir of [
    AGENTS_SKILLS,
    ...AGENT_ROOTS.map(([, d]) => d),
    ...dots,
  ]) {
    const d = walk(realRoot, dir, false)
    if (typeof d !== 'string' && d.id && !seen.has(d.id)) {
      seen.add(d.id)
      res.scan.push(d)
    }
  }
  return res
}
