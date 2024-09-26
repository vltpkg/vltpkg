import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
export const findPackageJson = from =>
  resolve(import.meta.dirname, from, 'package.json')
export const loadPackageJson = from =>
  JSON.parse(readFileSync(findPackageJson(from), 'utf8'))
