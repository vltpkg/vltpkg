import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { RunOptions } from '@vltpkg/run'
import * as FSP from 'node:fs/promises'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.js'
import { actual } from '../../src/index.js'

const runs: RunOptions[] = []
t.beforeEach(() => (runs.length = 0))

const mockRun = async (options: RunOptions) => {
  runs.push(options)
}

const chmods: string[] = []
const mockFSP = t.createMock(FSP, {
  chmod: async (path: string, mode: number) => {
    t.equal(mode & 0o111, 0o111)
    chmods.push(path)
  },
})

const { build } = await t.mockImport<
  typeof import('../../src/reify/build.js')
>('../../src/reify/build.js', {
  '@vltpkg/run': { run: mockRun },
  'node:fs/promises': mockFSP,
})

// clear out before each test
t.beforeEach(() => {
  chmods.length = 0
  runs.length = 0
})

t.test(
  'run build steps in an installed project graph',
  { keepFixture: true },
  async t => {
    t.options.keepFixture = true
    const aid = joinDepIDTuple(['registry', '', 'a@1.2.3'])
    const xid = joinDepIDTuple(['registry', '', 'x@1.2.3'])
    const yid = joinDepIDTuple(['registry', '', 'y@1.2.3'])

    const projectRoot = t.testdir({
      src: {
        app: {
          'package.json': JSON.stringify({
            name: 'app',
            version: '1.2.3',
            dependencies: { y: '' },
            scripts: {
              postprepare: 'true',
            },
          }),
          node_modules: {
            y: t.fixture(
              'symlink',
              '../../../node_modules/.vlt/' + yid + '/node_modules/y',
            ),
          },
        },
      },
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.2.3',
        dependencies: {
          x: '',
          a: '',
        },
      }),
      'vlt-workspaces.json': '"src/*"',
      node_modules: {
        '.bin': {
          x: t.fixture(
            'symlink',
            '../.vlt/' + xid + '/node_modules/x/bin.js',
          ),
        },
        a: t.fixture('symlink', './.vlt/' + aid + '/node_modules/a'),
        x: t.fixture('symlink', './.vlt/' + xid + '/node_modules/x'),
        '.vlt': {
          [aid]: {
            node_modules: {
              a: {
                'package.json': JSON.stringify({
                  name: 'a',
                  version: '1.2.3',
                  scripts: {
                    install: 'do not run this',
                  },
                }),
              },
            },
          },
          [xid]: {
            node_modules: {
              x: {
                'package.json': JSON.stringify({
                  name: 'x',
                  version: '1.2.3',
                  bin: './bin.js',
                }),
                'bin.js': `#!/usr/bin/env node\nconsole.log('hello')`,
              },
            },
          },
          [yid]: {
            node_modules: {
              x: t.fixture(
                'symlink',
                '../../' + xid + '/node_modules/x',
              ),
              y: {
                'index.js': `console.error('y')`,
                'package.json': JSON.stringify({
                  name: 'y',
                  version: '1.2.3',
                  scripts: {
                    install: 'true',
                    preinstall: 'true',
                  },
                  dependencies: { x: '1' },
                }),
              },
            },
          },
        },
      },
    })

    // pretend like we didn't have the deps, and then added them
    const after = actual.load({ projectRoot, loadManifests: true })
    const before = actual.load({ projectRoot, loadManifests: true })
    const bx = before.nodes.get(xid)
    const by = before.nodes.get(yid)
    if (!bx) throw new Error('no x node in before??')
    if (!by) throw new Error('no y node in before??')
    before.removeNode(bx)
    before.removeNode(by)
    const diff = new Diff(before, after)

    await build(diff, new PackageJson(), new PathScurry(projectRoot))
    t.match(
      new Set(runs),
      new Set([
        {
          arg0: 'install',
          cwd: `./node_modules/.vlt/${yid}/node_modules/y`,
        },
        { arg0: 'prepare', cwd: `./src/app` },
      ]),
    )
    t.match(
      new Set(chmods),
      new Set([
        resolve(
          projectRoot,
          `node_modules/.vlt/${xid}/node_modules/x/bin.js`,
        ),
      ]),
    )
  },
)
