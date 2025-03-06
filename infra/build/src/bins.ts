import { resolve } from 'node:path'

export const BINS_DIR = resolve(import.meta.dirname, 'bins')

export const BINS = ['vlix', 'vlr', 'vlrx', 'vlt', 'vlx'] as const

export type Bin = (typeof BINS)[number]

export const isBin = (value: unknown): value is Bin =>
  BINS.includes(value as Bin)
