import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { readCliState, setCliState } from '../src/cli-state.ts'

const file = (dir: string) =>
  resolve(dir, 'node_modules/.vlt/cli-state.json')

t.test('readCliState', async t => {
  const read = (content?: string) =>
    readCliState(
      t.testdir({
        node_modules: {
          '.vlt':
            content === undefined ?
              {}
            : { 'cli-state.json': content },
        },
      }),
    )
  t.strictSame(await read(), {}, 'missing')
  t.strictSame(await read('{'), {}, 'malformed')
  t.strictSame(await read('[]'), {}, 'array')
  t.strictSame(await read('{"a":1}'), { a: 1 })
})

t.test('setCliState', async t => {
  t.test('creates the file, keeps other keys', async t => {
    const dir = t.testdir({ node_modules: { '.vlt': {} } })
    await setCliState(dir, 'a', 1)
    t.strictSame(JSON.parse(readFileSync(file(dir), 'utf8')), {
      a: 1,
    })
    await setCliState(dir, 'b', 'x')
    await setCliState(dir, 'a', 2)
    t.strictSame(JSON.parse(readFileSync(file(dir), 'utf8')), {
      a: 2,
      b: 'x',
    })
  })

  t.test('no node_modules/.vlt: nothing created', async t => {
    const dir = t.testdir({})
    await setCliState(dir, 'a', 1)
    t.notOk(existsSync(resolve(dir, 'node_modules')))
  })
})
