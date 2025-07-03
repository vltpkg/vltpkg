import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.ts'
import { actual } from '../../src/index.ts'
import { build } from '../../src/reify/build.ts'

t.test('should handle missing bin files gracefully', async t => {
  const sqldId = joinDepIDTuple([
    'registry',
    '',
    'sqld@0.24.1-pre.42',
  ])

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
                  sqld: '.bin/sqld', // This file doesn't exist
                },
              }),
              // Note: .bin/sqld file is intentionally missing
            },
          },
        },
      },
    },
  })

  // Load the actual graph
  const after = actual.load({
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    projectRoot,
    loadManifests: true,
  })

  // Create a before graph without the package
  const before = actual.load({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    loadManifests: true,
  })

  const bSqld = before.nodes.get(sqldId)
  if (bSqld) {
    before.removeNode(bSqld)
  }

  const diff = new Diff(before, after)

  // This should not throw an error even though the bin file doesn't exist
  await t.resolves(
    build(diff, new PackageJson(), new PathScurry(projectRoot)),
    'should succeed even when bin file is missing',
  )
})
