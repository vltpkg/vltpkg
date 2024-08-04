import { PackageJson } from '@vltpkg/package-json'
import * as FSP from 'node:fs/promises'
import { PathScurry } from 'path-scurry'
import t, { Test } from 'tap'
import { Diff } from '../../src/diff.js'
import { Node } from '../../src/node.js'

const runTest = async (t: Test, withManifest: boolean) => {
  const chmods: string[] = []
  const { chmodBins } = await t.mockImport<
    typeof import('../../src/reify/chmod-bins.js')
  >('../../src/reify/chmod-bins.js', {
    'node:fs/promises': t.createMock(FSP, {
      chmod: async (path: string, mode: number) => {
        t.equal(mode, 0o777)
        chmods.push(path)
      },
    }),
  })
  const fooManifest = {
    name: 'foo',
    version: '1.2.3',
    bin: 'foo.sh',
  }
  const projectRoot = t.testdir({
    node_modules: {
      '.vlt': {
        ';;foo@1.2.3': {
          node_modules: {
            foo: {
              'package.json': JSON.stringify(fooManifest),
              'foo.sh': '#!/usr/bin/env bash\necho ok',
            },
          },
        },
      },
    },
  })
  const diff = {
    nodes: {
      add: new Set([
        new Node(
          { projectRoot },
          ';;foo@1.2.3',
          withManifest ? fooManifest : undefined,
          undefined,
          'foo',
          '1.2.3',
        ),
      ]),
    },
  } as unknown as Diff
  const scurry = new PathScurry(projectRoot)

  await Promise.all(chmodBins(diff, new PackageJson(), scurry))
  t.strictSame(chmods, [
    scurry.resolve(
      'node_modules/.vlt/;;foo@1.2.3/node_modules/foo/foo.sh',
    ),
  ])
}

t.test('with the manifest', t => runTest(t, true))
t.test('without the manifest', t => runTest(t, false))
