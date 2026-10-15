/**
 * Lint agent skills: every docs.vlt.sh link must hit a page and
 * heading, SKILL.md frontmatter must follow the Agent Skills spec.
 *
 * Usage: vlr lint:skills [skill dirs...]
 * With no arguments, checks .claude-plugin/plugin.json skills + skills/*.
 */

import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { createProcessor } from '@mdx-js/mdx'
import { frontmatter } from 'fumadocs-core/content/md/frontmatter'
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm'
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading'

const docsRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(docsRoot, '../..')
const contentRoot = join(docsRoot, 'content')
const appRoot = join(docsRoot, 'src/app')
const publicRoot = join(docsRoot, 'public')
const host = 'https://docs.vlt.sh'

// html links OK: its answers hand them to users
const htmlLinks = new Set([
  resolve(repoRoot, 'src/query/skills/dss-query/SKILL.md'),
])

type Problem = { file: string; line: number; message: string }

const rel = (path: string) => relative(repoRoot, path)

const isFile = (path: string) =>
  !!lstatSync(path, { throwIfNoEntry: false })?.isFile()

const isDir = (path: string) =>
  !!lstatSync(path, { throwIfNoEntry: false })?.isDirectory()

// plugin.json skills + skills/<name>/ folders with their own SKILL.md
const findSkills = (): string[] => {
  const plugin = JSON.parse(
    readFileSync(
      join(repoRoot, '.claude-plugin/plugin.json'),
      'utf8',
    ),
  ) as { skills?: string[] }
  const skillsDir = join(repoRoot, 'skills')
  const local = readdirSync(skillsDir, { withFileTypes: true })
    .filter(
      d =>
        d.isDirectory() &&
        isFile(join(skillsDir, d.name, 'SKILL.md')),
    )
    .map(d => join(skillsDir, d.name))
  return [
    ...new Set([
      ...(plugin.skills ?? []).map(s => resolve(repoRoot, s)),
      ...local,
    ]),
  ]
}

// *.md files, not following symlinks
const collectMd = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const path = join(dir, d.name)
    return (
      d.isDirectory() ? collectMd(path)
      : d.isFile() && d.name.endsWith('.md') ? [path]
      : []
    )
  })

const checkFrontmatter = (
  dir: string,
  file: string,
  raw: string,
): Problem[] => {
  const problem = (message: string) => ({
    file: rel(file),
    line: 1,
    message,
  })
  let data: unknown
  try {
    data = frontmatter(raw).data
  } catch (e) {
    return [problem(`bad frontmatter: ${(e as Error).message}`)]
  }
  const { name, description } = (
    data && typeof data === 'object' ?
      data
    : {}) as Record<string, unknown>
  const problems: Problem[] = []
  const folder = basename(dir)
  if (
    typeof name !== 'string' ||
    name.length > 64 ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)
  ) {
    problems.push(
      problem('name: 1-64 chars, a-z 0-9 and single inner hyphens'),
    )
  } else if (name !== folder) {
    problems.push(problem(`name ${name} must match folder ${folder}`))
  }
  const desc =
    typeof description === 'string' ? description.trim() : ''
  if (!desc || desc.length > 1024) {
    problems.push(problem('description: 1-1024 chars'))
  }
  return problems
}

// mirrors the docs' mdx preset (applyMdxPreset: remarkGfm + remarkHeading)
const processor = createProcessor({
  remarkPlugins: [remarkGfm, remarkHeading],
})
const idCache = new Map<string, Promise<Set<string>>>()
const headingIds = (file: string) => {
  let ids = idCache.get(file)
  if (!ids) {
    const { content } = frontmatter(readFileSync(file, 'utf8'))
    ids = processor
      .process(content)
      .then(
        ({ data }) =>
          new Set((data.toc ?? []).map(t => t.url.slice(1))),
      )
    idCache.set(file, ids)
  }
  return ids
}

const findPage = (page: string) =>
  [
    join(contentRoot, `${page}.mdx`),
    join(contentRoot, page, 'index.mdx'),
  ].find(isFile)

let linkCount = 0

const checkLink = async (
  file: string,
  line: number,
  link: string,
): Promise<Problem[]> => {
  linkCount++
  const problems: Problem[] = []
  const problem = (message: string) =>
    problems.push({
      file: rel(file),
      line,
      message: `${link}: ${message}`,
    })
  let url: URL
  let path: string
  let anchor: string
  try {
    url = new URL(link)
    path = decodeURIComponent(url.pathname).slice(1)
    anchor = decodeURIComponent(url.hash.slice(1))
  } catch {
    problem('bad url')
    return problems
  }
  if (url.origin !== host) problem(`use ${host}`)
  // home, non-page routes, static files (llms.txt, openapi.json, skills)
  if (
    !path ||
    isFile(join(appRoot, path, 'route.ts')) ||
    (/^(sitemap\.xml|robots\.txt)$/.test(path) &&
      isFile(join(appRoot, path.replace(/\.\w+$/, '.ts')))) ||
    isFile(
      path.startsWith('skills/') ?
        join(repoRoot, path)
      : join(publicRoot, path),
    )
  ) {
    return problems
  }
  const trimmed = path.replace(/\/+$/, '')
  const md = trimmed.endsWith('.md')
  const page = md ? trimmed.slice(0, -3) : trimmed
  if (!md && !htmlLinks.has(file)) problem(`use ${host}/${page}.md`)
  else if (trimmed !== path) problem('drop trailing /')
  // site drops index from slugs: …/client/index.md is a 404
  if (basename(page) === 'index') {
    problem('drop /index')
    return problems
  }
  const pageFile = findPage(page)
  if (!pageFile) {
    problem(`no page content/${page}.mdx`)
    return problems
  }
  if (!anchor) return problems
  try {
    if (!(await headingIds(pageFile)).has(anchor)) {
      problem(`no heading #${anchor} in ${rel(pageFile)}`)
    }
  } catch (e) {
    problem(`can't parse ${rel(pageFile)}: ${(e as Error).message}`)
  }
  return problems
}

const LINK = /https?:\/\/docs\.vlt\.(?:sh|io)[^\s)<>\]`'"]*/g

const checkFile = async (file: string): Promise<Problem[]> => {
  const raw = readFileSync(file, 'utf8')
  const checks: Promise<Problem[]>[] = []
  for (const m of raw.matchAll(LINK)) {
    // placeholder, e.g. https://docs.vlt.sh/<page>.md
    if (raw[m.index + m[0].length] === '<') continue
    // trailing chars GFM leaves out of autolinks (incl. emphasis)
    const link = m[0].replace(/[.,;:!?*_~]+$/, '')
    const line = raw.slice(0, m.index).split('\n').length
    checks.push(checkLink(file, line, link))
  }
  return (await Promise.all(checks)).flat()
}

const checkSkill = async (dir: string): Promise<Problem[]> => {
  const skillMd = join(dir, 'SKILL.md')
  if (!isDir(dir) || !isFile(skillMd)) {
    return [
      { file: rel(skillMd), line: 1, message: 'missing SKILL.md' },
    ]
  }
  const problems = checkFrontmatter(
    dir,
    skillMd,
    readFileSync(skillMd, 'utf8'),
  )
  for (const file of collectMd(dir)) {
    problems.push(...(await checkFile(file)))
  }
  return problems
}

const args = process.argv.slice(2).map(arg => resolve(arg))
const skills = args.length ? args : findSkills()
const problems: Problem[] = []
for (const dir of skills) problems.push(...(await checkSkill(dir)))

for (const { file, line, message } of problems) {
  console.error(`${file}:${line} ${message}`)
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s) found.`)
  process.exit(1)
}
console.log(
  `lint-skills: ${skills.length} skills, ${linkCount} docs links OK`,
)
