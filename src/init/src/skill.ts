import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import { minimatch } from 'minimatch'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * A valid agent skill `name` (https://agentskills.io/specification):
 * 1-64 lowercase letters, digits and single hyphens, no leading or
 * trailing hyphen. Shared with skill discovery.
 */
export const isSkillName = (name: string): boolean =>
  name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)

export type InitSkillOptions = {
  /** the package dir, default `process.cwd()` */
  cwd?: string
  /** unset: a root `SKILL.md` named after the package */
  name?: string
}

export type InitSkillResult = {
  /** the skill name and its `SKILL.md` path */
  skill: { name: string; path: string }
  /** the `package.json` name */
  package?: string
  /** `SKILL.md` was already there: nothing changed */
  exists?: true
  /** the `package.json` and the `files` entry added to it */
  manifest?: { path: string; added: string }
}

const template = (name: string) => `---
name: ${name}
description: What this skill does and when to use it. Name the tasks and keywords an agent should match on.
---

# ${name}

Instructions the agent follows once this skill is activated.

## When to use

Describe the situations and requests this skill is for.

## Instructions

1. First step
2. Second step
`

// a `files` entry covers `rel`
const ships = (files: unknown[], rel: string) =>
  files.some(f => {
    if (typeof f !== 'string' || f.startsWith('!')) return false
    const p = f.replace(/\/$/, '')
    return (
      minimatch(rel, p, { dot: true }) ||
      minimatch(rel, `${p}/**`, { dot: true })
    )
  })

/**
 * Create a starter `skills/<name>/SKILL.md` in the package at `cwd`, or a
 * root `SKILL.md` named after the package when no `name` is given. Never
 * overwrites. Adds the skill to `package.json` `files` if it has one that
 * doesn't cover it.
 */
export const initSkill = ({
  cwd = process.cwd(),
  name,
}: InitSkillOptions = {}): InitSkillResult => {
  if (name !== undefined && !isSkillName(name)) {
    throw error(
      'Invalid skill name: use 1-64 lowercase letters, digits and single hyphens, no leading or trailing hyphen',
      { code: 'EUSAGE', found: name },
    )
  }
  const pj = new PackageJson()
  const manifestPath = resolve(cwd, 'package.json')
  const manifest = existsSync(manifestPath) ? pj.read(cwd) : undefined
  const pkg = manifest?.name
  let skill = name
  if (skill === undefined) {
    if (!pkg) {
      throw error(
        'No package name to name the skill after: pass a <name>',
        { code: 'EUSAGE' },
      )
    }
    skill = pkg.slice(pkg.lastIndexOf('/') + 1)
    if (!isSkillName(skill)) {
      throw error(
        'Package name is not a valid skill name: pass a <name>',
        { code: 'EUSAGE', found: pkg },
      )
    }
  }
  const rel = name ? `skills/${name}/SKILL.md` : 'SKILL.md'
  const path = resolve(cwd, ...rel.split('/'))
  // discovery doesn't follow symlinked dirs
  if (name) {
    for (const dir of [resolve(cwd, 'skills'), dirname(path)]) {
      if (
        lstatSync(dir, { throwIfNoEntry: false })?.isDirectory() ===
        false
      ) {
        throw error(
          'Cannot create skill: not a directory (symlinks are not followed)',
          { code: 'EUSAGE', found: dir },
        )
      }
    }
  }
  const res: InitSkillResult = {
    skill: { name: skill, path },
    ...(pkg && { package: pkg }),
  }
  if (lstatSync(path, { throwIfNoEntry: false })) {
    return { ...res, exists: true }
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, template(skill), { flag: 'wx' })
  const files: unknown =
    manifest && 'files' in manifest ? manifest.files : undefined
  if (manifest && Array.isArray(files) && !ships(files, rel)) {
    const added = name ? 'skills' : 'SKILL.md'
    files.push(added)
    pj.write(cwd, manifest)
    res.manifest = { path: manifestPath, added }
  }
  return res
}
