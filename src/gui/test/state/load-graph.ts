import { test, expect } from 'vitest'
import { inspect } from 'util'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { load } from '@/state/load-graph.js'
import { type TransferData } from '@/state/types.js'
import { Spec, kCustomInspect } from '@vltpkg/spec/browser'

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${String(this)}}`
  },
})

const transferData: TransferData = {
  importers: [
    {
      importer: true,
      id: joinDepIDTuple(['file', '.']),
      name: 'my-project',
      version: '1.0.0',
      location: '.',
      manifest: {
        name: 'my-project',
        version: '1.0.0',
      },
      projectRoot: '/path/to/project',
      dev: false,
      optional: false,
    },
  ],
  lockfile: {
    options: {
      registries: {
        custom: 'http://example.com',
      },
    },
    nodes: {
      '··bar@1.0.0': [
        3,
        'bar',
        null,
        null,
        null,
        {
          name: 'bar',
          version: '1.0.0',
        },
      ],
      '··foo@1.0.0': [
        2,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        null,
        'node_modules/.pnpm/foo@1.0.0/node_modules/foo',
        {
          name: 'foo',
          version: '1.0.0',
          dist: {
            integrity:
              'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
          },
        },
      ],
      '·custom·baz@1.0.0': [
        1,
        'baz',
        null,
        'http://example.com/baz.tgz',
        null,
        {
          name: 'baz',
          version: '1.0.0',
          dist: {
            tarball: 'http://example.com/baz.tgz',
          },
        },
      ],
    },
    edges: {
      'file·. foo': 'prod ^1.0.0 || 1.2.3 || 2 ··foo@1.0.0',
      'file·. baz': 'prod custom:baz@^1.0.0 ·custom·baz@1.0.0',
      '··foo@1.0.0 bar': 'prod ^1.0.0 ··bar@1.0.0',
    },
  },
  projectInfo: {
    tools: ['vlt'],
    vltInstalled: true,
  },
}

test('load graph', () => {
  expect(inspect(load(transferData), { depth: 4 })).toMatchSnapshot()
})
