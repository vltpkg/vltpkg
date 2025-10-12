import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

mkdirSync(resolve(import.meta.dirname, '../.data'), {
  recursive: true,
})
