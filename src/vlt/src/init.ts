import { basename, resolve } from 'node:path'
import { PackageJson } from '@vltpkg/package-json'
import { getUser, type GitUser } from '@vltpkg/git'
import { type Manifest } from '@vltpkg/types'

export type InitOptions = {
  cwd?: string
}

export type CustomizableInitOptions = {
  name: string
  author?: GitUser
}

export type InitResult =
  | `Wrote to ${string}`
  | 'package.json already exists'

const renderUser = ({ name, email }: GitUser) => {
  let res = ''
  if (name) res += name
  if (email) {
    if (name) res += ' '
    res += `<${email}>`
  }
  return res
}

const template = ({
  name,
  author,
}: CustomizableInitOptions): Manifest => ({
  name,
  version: '1.0.0',
  description: '',
  main: 'index.js',
  ...(author ? { author: renderUser(author) } : undefined),
})

export const init = async ({
  cwd = process.cwd(),
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
      const author = await getUser().catch(() => undefined)
      const value = template({ name, author })
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
