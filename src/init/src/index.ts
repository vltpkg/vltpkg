import { getUser } from '@vltpkg/git'
import { PackageJson } from '@vltpkg/package-json'
import type { JSONObj } from '@vltpkg/registry-client'
import type { NormalizedManifest } from '@vltpkg/types'
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

export type InitFileResults = {
  manifest?: JSONFileInfo<NormalizedManifest>
  // TODO: enable these if/when we do more than just the manifest
  // Eg:
  // workspaces?: JSONFileInfo
  // config?: JSONFileInfo
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
  return { manifest: { path, data } }
}
