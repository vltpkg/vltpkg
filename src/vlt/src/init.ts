import { basename, resolve } from 'node:path'
import { PackageJson } from '@vltpkg/package-json'
import { getUser } from '@vltpkg/git'
import type { Manifest } from '@vltpkg/types'
import { getAuthorFromGitUser } from './get-author-from-git-user.ts'

export type InitOptions = {
  cwd?: string
  author?: string
}

export type CustomizableInitOptions = {
  name: string
  author: string
}

export type InitResult =
  | `Wrote to ${string}`
  | 'package.json already exists'

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

export const init = async ({
  cwd = process.cwd(),
  author,
}: InitOptions = {}): Promise<InitResult> => {
  const packageJson = new PackageJson()
  try {
    packageJson.read(cwd)
    // will only return here in case the package.json file does not exist
    return 'package.json already exists'
  } catch (err) {
    if (
      (err as Error).message === 'Could not read package.json file'
    ) {
      const name = basename(cwd)
      const value = template({
        name,
        author:
          author ??
          getAuthorFromGitUser(
            await getUser().catch(() => undefined),
          ),
      })
      const indent = 2
      packageJson.write(cwd, value, indent)
      return `Wrote to ${resolve(cwd, 'package.json')}:

${JSON.stringify(value, null, indent)}

Modify & add package.json properties using \`vlt pkg\`, e.g:

  vlt pkg set "description=My new project"\n`
    } else {
      throw err
    }
  }
}
