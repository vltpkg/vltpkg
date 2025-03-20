// not an airtight indicator, but a good gut-check to even bother trying
import { stat } from 'node:fs/promises'
export const is = ({ cwd = process.cwd() } = {}) =>
  stat(cwd + '/.git').then(
    () => true,
    () => false,
  )
