import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import { setTimeout } from 'node:timers/promises'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const findRollbacks = (dir: string) =>
  readdirSync(dir, {
    withFileTypes: true,
  }).filter(f => f.name.startsWith('.VLT.DELETE.'))

t.test('removes rollbacks after a successful install', async t => {
  const { status } = await runMultiple(t, ['i', 'abbrev@2.0.0'], {
    packageJson: true,
    test: async ({ t, dirs, run }) => {
      await setTimeout(1000)
      await run(['install', 'abbrev@3.0.0'])
      await setTimeout(1000)
      t.strictSame(
        [
          ...findRollbacks(join(dirs.project, 'node_modules')),
          ...findRollbacks(join(dirs.project, 'node_modules/.vlt')),
        ],
        [],
        'rollbacks have been cleaned up',
      )
    },
  })
  t.equal(status, 0)
})

t.test('removes the parked node_modules after vlt ci', async t => {
  // the child that deletes it starts as ci ends, give it some time
  const settle = async (dirs: string[]) => {
    const found = () =>
      dirs.filter(d => existsSync(d)).flatMap(d => findRollbacks(d))
    for (let i = 0; i < 50 && found().length; i++) {
      await setTimeout(200)
    }
    return found()
  }
  for (const [name, args] of [
    ['with dependencies', ['i', 'abbrev@2.0.0']],
    ['without dependencies', ['i']],
  ] as const) {
    t.test(name, async t => {
      const { status } = await runMultiple(t, [...args], {
        packageJson: true,
        test: async ({ t, dirs, run }) => {
          await setTimeout(1000)
          const ci = await run(['ci'])
          t.equal(ci.status, 0, 'ci succeeds')
          t.strictSame(
            await settle([
              dirs.project,
              join(dirs.project, 'node_modules'),
              join(dirs.project, 'node_modules/.vlt'),
            ]),
            [],
            'rollbacks have been cleaned up',
          )
        },
      })
      t.equal(status, 0)
    })
  }
})
