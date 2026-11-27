// Publishes the repo's agent skills into public/: each skill folder at
// /skills/<name>/, a .tar.gz of every skill with more than a SKILL.md,
// and an Agent Skills Discovery index (RFC 0.2.0,
// https://github.com/cloudflare/agent-skills-discovery-rfc) at
// /.well-known/agent-skills/index.json that lists them.
// scripts/skills.mts runs this at prebuild and predev.
import { createHash } from 'node:crypto'
import {
  cpSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { frontmatter } from 'fumadocs-core/content/md/frontmatter'
import { create } from 'tar'

export type SkillEntry = {
  name: string
  type: 'skill-md' | 'archive'
  description: string
  url: string
  digest: string
}

export type SkillIndex = {
  $schema: string
  skills: SkillEntry[]
}

export const indexPath = '.well-known/agent-skills/index.json'

const schema =
  'https://schemas.agentskills.io/discovery/0.2.0/schema.json'

// every archive entry gets this mtime, so an archive's bytes (and its
// digest) only change when the skill's files do
const mtime = new Date(0)

const sha256 = (file: string) =>
  'sha256:' +
  createHash('sha256').update(readFileSync(file)).digest('hex')

// Copies every folder in `from` that has its own SKILL.md into `to`,
// without its evals. Skips symlinks and scope folders, like the skill
// mounts #1540 plans to put in skills/. Returns the names, sorted.
export const copySkills = (from: string, to: string): string[] => {
  const names: string[] = []
  for (const d of readdirSync(from, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    const dir = resolve(from, d.name)
    const skillMd = lstatSync(resolve(dir, 'SKILL.md'), {
      throwIfNoEntry: false,
    })
    if (!skillMd?.isFile()) continue
    cpSync(dir, resolve(to, d.name), {
      recursive: true,
      filter: source => basename(source) !== 'evals',
    })
    names.push(d.name)
  }
  return names.sort()
}

// The files in `dir` as sorted `/`-separated paths relative to it.
// Only regular files go into an archive, so anything else is an error.
export const listFiles = (dir: string, prefix = ''): string[] => {
  const files: string[] = []
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const path = prefix + d.name
    if (d.isDirectory()) {
      files.push(...listFiles(join(dir, d.name), path + '/'))
    } else if (d.isFile()) {
      files.push(path)
    } else {
      throw new Error(
        `${join(dir, d.name)}: skills may only hold files and folders`,
      )
    }
  }
  return files.sort()
}

// The description from a SKILL.md's frontmatter
export const readDescription = (skillMd: string): string => {
  const { data } = frontmatter(readFileSync(skillMd, 'utf8'))
  const { description } = data as Record<string, unknown>
  if (typeof description !== 'string' || !description)
    throw new Error(`${skillMd}: frontmatter needs a description`)
  return description
}

// Writes `files` from `dir` to the gzipped tarball `file`, at its root.
// portable leaves out uid, gid, user names and the gzip header's
// timestamp; with a fixed mtime and sorted files, the same files always
// give the same bytes.
export const writeArchive = (
  dir: string,
  files: string[],
  file: string,
) => {
  create(
    { cwd: dir, file, gzip: true, portable: true, mtime, sync: true },
    files,
  )
}

// The index entry for the skill published at `<publicDir>/skills/<name>`.
// A skill that is only a SKILL.md is served as that file; any other is
// archived next to its folder, at /skills/<name>.tar.gz.
export const indexSkill = (
  publicDir: string,
  name: string,
): SkillEntry => {
  const dir = join(publicDir, 'skills', name)
  const description = readDescription(join(dir, 'SKILL.md'))
  const files = listFiles(dir)
  if (files.length === 1) {
    return {
      name,
      type: 'skill-md',
      description,
      url: `/skills/${name}/SKILL.md`,
      digest: sha256(join(dir, 'SKILL.md')),
    }
  }
  const archive = join(publicDir, 'skills', `${name}.tar.gz`)
  writeArchive(dir, files, archive)
  return {
    name,
    type: 'archive',
    description,
    url: `/skills/${name}.tar.gz`,
    digest: sha256(archive),
  }
}

// Replaces what an earlier run published in `publicDir` with the skills
// in `from`, their archives, and the index. Returns the index.
export const publishSkills = (
  from: string,
  publicDir: string,
): SkillIndex => {
  const to = join(publicDir, 'skills')
  const index = join(publicDir, indexPath)
  rmSync(to, { recursive: true, force: true })
  rmSync(index, { force: true })
  const names = copySkills(from, to)
  const result: SkillIndex = {
    $schema: schema,
    skills: names.map(name => indexSkill(publicDir, name)),
  }
  mkdirSync(join(index, '..'), { recursive: true })
  writeFileSync(index, JSON.stringify(result, null, 2) + '\n')
  return result
}
