import { getUser } from '@vltpkg/git'
import { PackageJson } from '@vltpkg/package-json'
import type { JSONObj } from '@vltpkg/registry-client'
import type { NormalizedManifest } from '@vltpkg/types'
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { basename, resolve } from 'node:path'
import { getAuthorFromGitUser } from './get-author-from-git-user.ts'
import { asError, normalizeManifest } from '@vltpkg/types'
export { getAuthorFromGitUser }

// eslint-disable-next-line no-console
const stderr: (...a: unknown[]) => void = console.error

export type InitOptions = {
  cwd?: string
  author?: string
  logger?: (...a: unknown[]) => void
}

export type CustomizableInitOptions = {
  name: string
  author: string
}

const template = ({ name, author }: CustomizableInitOptions) =>
  normalizeManifest({
    name,
    version: '1.0.0',
    description: '',
    main: 'index.js',
    ...(author ? { author } : undefined),
  })

export type JSONFileInfo<T extends JSONObj = JSONObj> = {
  path: string
  data: T
}

export type GitignoreFileInfo = {
  path: string
}

export type InitFileResults = {
  manifest?: JSONFileInfo<NormalizedManifest>
  gitignore?: GitignoreFileInfo
}

const GITIGNORE_ENTRY = 'node_modules'

/**
 * Create or update a `.gitignore` file ensuring `node_modules` is listed.
 * Returns `{ path }` of the file that was written, or `undefined` if the
 * file already contained the entry and no changes were needed.
 */
export const ensureGitignore = (
  cwd: string,
): GitignoreFileInfo | undefined => {
  const gitignorePath = resolve(cwd, '.gitignore')
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `${GITIGNORE_ENTRY}\n`, 'utf8')
    return { path: gitignorePath }
  }
  const content = readFileSync(gitignorePath, 'utf8')
  const lines = content.split('\n').map(l => l.trim())
  if (!lines.includes(GITIGNORE_ENTRY)) {
    // Append with a leading newline to avoid joining onto an existing last line
    const prefix = content.endsWith('\n') ? '' : '\n'
    appendFileSync(
      gitignorePath,
      `${prefix}${GITIGNORE_ENTRY}\n`,
      'utf8',
    )
    return { path: gitignorePath }
  }
  return undefined
}

export const init = async ({
  cwd = process.cwd(),
  author,
  logger = stderr,
}: InitOptions = {}): Promise<InitFileResults> => {
  const packageJson = new PackageJson()
  const path = resolve(cwd, 'package.json')
  let existingData: NormalizedManifest | undefined

  try {
    existingData = packageJson.read(cwd)
    logger('package.json already exists')
  } catch (err) {
    if (asError(err).message !== 'Could not read package.json file') {
      throw err
    }
  }

  const name = basename(cwd)
  const templateData = template({
    name,
    author:
      author ??
      getAuthorFromGitUser(await getUser().catch(() => undefined)),
  })

  // Merge template with existing data, preserving existing properties
  const data: NormalizedManifest =
    existingData ? { ...templateData, ...existingData } : templateData

  const indent = 2
  packageJson.write(cwd, data, indent)

  const gitignore = ensureGitignore(cwd)

  return {
    manifest: { path, data },
    ...(gitignore ? { gitignore } : undefined),
  }
}
