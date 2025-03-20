import t from 'tap'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runMatch } from './fixtures/run.ts'

t.test('--version', async t => {
  const { stdout } = await runMatch(t, 'vlt', ['--version'])
  t.equal(
    stdout,
    JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '../../../src/cli-sdk/package.json'),
        'utf-8',
      ),
    ).version,
  )
})
