import { resolve } from 'node:path'
import type { Commands } from '@vltpkg/cli-sdk/definition'

export const BINS_DIR = resolve(import.meta.dirname, 'bins')

export const BINS = ['vlxl', 'vlr', 'vlrx', 'vlt', 'vlx'] as const

export type Bin = (typeof BINS)[number]

export const isBin = (value: unknown): value is Bin =>
  BINS.includes(value as Bin)

export const run = async (command?: keyof Commands) => {
  if (command) {
    process.argv.splice(2, 0, command)
  }
  const vlt = await import('@vltpkg/cli-sdk')
  await vlt.default()
}
