import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import type { RunOptions } from '@vltpkg/run'
import { Monorepo } from '@vltpkg/workspaces'
import * as FSP from 'node:fs/promises'
import * as FS from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.ts'
import { actual } from '../../src/index.ts'

const runs: RunOptions[] = []
t.beforeEach(() => (runs.length = 0))

const mockRun = async (options: RunOptions) => {
  runs.push(options)
}

const chmods: string[] = []
const existsChecks: string[] = []
const mockFSP = t.createMock(FSP, {
  chmod: async (path: string, mode: number) => {
    t.equal(mode & 0o111, 0o111)
    chmods.push(path)
  },
})

const mockFS = t.createMock(FS, {
  existsSync: (path: string): boolean => {
    existsChecks.push(path)
    // Return false for paths that contain 'missing-bin' to simulate missing files
    return !path.includes('missing-bin')
  },
  statSync: (path: string) => ({ mode: 0o644 }),
})

const { build } = await t.mockImport<
  typeof import('../../src/reify/build.ts')
>('../../src/reify/build.ts', {
  '@vltpkg/run': { run: mockRun },
  'node:fs/promises': mockFSP,
  'node:fs': mockFS,
})

// clear out before each test
t.beforeEach(() => {
  chmods.length = 0
  runs.length = 0
  existsChecks.length = 0
})

t.test('should handle missing bin files gracefully', async t => {
  const sqldId = joinDepIDTuple(['registry', '', 'sqld@0.24.1-pre.42'])

  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        sqld: '0.24.1-pre.42',
      },
    }),
    node_modules: {
      sqld: t.fixture(
        'symlink',
        './.vlt/' + sqldId + '/node_modules/sqld',
      ),
      '.vlt': {
        [sqldId]: {
          node_modules: {
            sqld: {
              'package.json': JSON.stringify({
                name: 'sqld',
                version: '0.24.1-pre.42',
                bin: {
                  sqld: 'missing-bin/sqld', // This will trigger existsSync to return false
                },
              }),
              // Note: missing-bin/sqld file doesn't exist
            },
          },
        },
      },
    },
  })

  // Load the "after" state with the sqld package present
  const after = actual.load({
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    projectRoot,
    loadManifests: true,
  })

  // Load the "before" state with all packages
  const before = actual.load({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    loadManifests: true,
  })

  // Remove the sqld package from the "before" state to simulate adding it
  const bSqld = before.nodes.get(sqldId)
  if (!bSqld) throw new Error('no sqld node in before??')
  before.removeNode(bSqld)

  const diff = new Diff(before, after)

  // This should not throw an error even though the bin file doesn't exist
  await build(diff, new PackageJson(), new PathScurry(projectRoot))
  
  // Verify the existsSync was called for the missing bin file
  const expectedBinPath = resolve(
    projectRoot,
    `node_modules/.vlt/${sqldId}/node_modules/sqld/missing-bin/sqld`,
  )
  
  t.ok(
    existsChecks.some(path => path.includes('missing-bin')),
    'existsSync should be called for bin files',
  )
  
  // Verify chmod was NOT called for the missing file
  t.notOk(
    chmods.some(path => path.includes('missing-bin')),
    'chmod should not be called for missing bin files',
  )
})
