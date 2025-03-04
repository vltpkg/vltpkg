import t from 'tap'
import { readFileSync } from 'node:fs'

import { run } from './fixtures/cli-variants.ts'
import { resolve } from 'node:path'

t.test('--version', async t => {
  const { stdout } = await run(t, 'vlt', ['--version'])
  t.equal(
    stdout,
    JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '../../../src/vlt/package.json'),
        'utf-8',
      ),
    ).version,
  )
})
