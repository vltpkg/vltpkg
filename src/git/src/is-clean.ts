import { error } from '@vltpkg/error-cause'
import { spawn } from './spawn.js'

export const isClean = async (opts = {}) => {
  const result = await spawn(
    ['status', '--porcelain=v1', '-uno'],
    opts,
  )
  if (result.status || result.signal) {
    throw error('git isClean check failed', result)
  }
  for (const line of result.stdout.split(/\r?\n+/)) {
    if (line.trim()) return false
  }
  return true
}
