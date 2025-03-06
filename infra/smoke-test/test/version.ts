import t from 'tap'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { run } from './fixtures/run.ts'

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
