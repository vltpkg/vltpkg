import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import t from 'tap'
import { getAssetsDir } from '../src/get-assets-dir.ts'

const expect = resolve(
  fileURLToPath(import.meta.url),
  '../../../gui/dist',
)
t.equal(await getAssetsDir(), expect)
