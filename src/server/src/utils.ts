import * as json from './json.ts'

import type { ServerResponse } from 'node:http'
import type { WhichConfig } from '@vltpkg/vlt-json'

type KeyPair = { key: string }
type KeyValuePair = { key: string; value: string }

export const isValidWhich = (w: unknown): w is WhichConfig =>
  w === 'user' || w === 'project'

const isKeyPair = (x: unknown): x is KeyPair =>
  !!x &&
  typeof x === 'object' &&
  typeof (x as { key?: unknown }).key === 'string'

const isKeyValuePair = (x: unknown): x is KeyValuePair =>
  !!x &&
  typeof x === 'object' &&
  typeof (x as { key?: unknown }).key === 'string' &&
  typeof (x as { value?: unknown }).value === 'string'

export const normalizeKeyPairs = (
  res: ServerResponse,
  pairs: unknown,
): { ok: true; keys: string[] } | { ok: false } => {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    json.error(
      res,
      'Bad request',
      'Config delete requires a non-empty keys array',
      400,
    )
    return { ok: false }
  }
  const keys: string[] = []
  for (const p of pairs) {
    if (!isKeyPair(p)) {
      json.error(res, 'Bad request', 'All keys must be strings', 400)
      return { ok: false }
    }
    keys.push(p.key)
  }
  return { ok: true, keys }
}

export const normalizeKeyValuePairs = (
  res: ServerResponse,
  pairs: unknown,
):
  | { ok: true; normalized: { key: string; value: string }[] }
  | { ok: false } => {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    json.error(
      res,
      'Bad request',
      'Config set requires a non-empty pairs array',
      400,
    )
    return { ok: false }
  }
  const normalized: { key: string; value: string }[] = []
  for (const p of pairs) {
    if (!isKeyValuePair(p)) {
      json.error(
        res,
        'Bad request',
        'Each pair must have string key and value',
        400,
      )
      return { ok: false }
    }
    normalized.push({ key: p.key, value: p.value })
  }
  return { ok: true, normalized }
}
