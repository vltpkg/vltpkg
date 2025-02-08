import { dirname } from 'path'
import { is } from './is.ts'

export type FindOpts = {
  cwd?: string
  root?: string
}
export const find = async ({
  cwd = process.cwd(),
  root,
}: FindOpts = {}) => {
  while (true) {
    if (await is({ cwd })) {
      return cwd
    }
    const next = dirname(cwd)
    if (cwd === root || cwd === next) {
      return undefined
    }
    cwd = next
  }
}
