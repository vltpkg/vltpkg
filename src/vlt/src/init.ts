import { getUser } from '@vltpkg/git'
import { PackageJson } from '@vltpkg/package-json'
import { type JSONObj } from '@vltpkg/registry-client'
import { type Manifest } from '@vltpkg/types'
import { basename, resolve } from 'node:path'
import { getAuthorFromGitUser } from './get-author-from-git-user.ts'
import { stderr } from './output.ts'

export type InitOptions = {
  cwd?: string
  author?: string
  logger?: (...a: unknown[]) => void
}

export type CustomizableInitOptions = {
  name: string
  author: string
}

const template = ({
  name,
  author,
}: CustomizableInitOptions): Manifest => ({
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
  manifest?: JSONFileInfo<Manifest>
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
  try {
    packageJson.read(cwd)
    // will only return here in case the package.json file does not exist
    logger('package.json already exists')
    return {}
  } catch (e) {
    const err = e as Error
    if (!!e && err.message !== 'Could not read package.json file') {
      throw err
    }

    const name = basename(cwd)
    const data = template({
      name,
      author:
        author ??
        getAuthorFromGitUser(await getUser().catch(() => undefined)),
    })
    const indent = 2
    packageJson.write(cwd, data, indent)
    return { manifest: { path, data } }
  }
}
