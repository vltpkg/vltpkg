import { resolve } from 'node:path'
import t from 'tap'

t.test('list the dirs', async t => {
  const dir = t.testdir({
    vlt: {
      vlx: {
        a: {},
        b: {},
        c: {},
      },
    },
  })

  class MockXDG {
    path: string
    constructor(path: string) {
      this.path = resolve(dir, path)
    }
    data(path = '') {
      return resolve(this.path, path)
    }
  }

  const { vlxList } = await t.mockImport<
    typeof import('../src/list.ts')
  >('../src/list.ts', { '@vltpkg/xdg': { XDG: MockXDG } })

  const set = new Set<string>()
  const expect = new Set(
    ['a', 'b', 'c'].map(d => resolve(t.testdirName, 'vlt/vlx', d)),
  )

  for await (const dir of vlxList()) {
    set.add(dir)
  }
  t.strictSame(set, expect)
})
