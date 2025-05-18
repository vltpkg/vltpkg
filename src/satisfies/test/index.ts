import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import t from 'tap'
import { satisfies } from '../src/index.ts'

const projectRoot = t.testdir({
  'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
  src: {
    a: {
      'package.json': JSON.stringify({
        name: 'a',
        version: '1.2.3',
      }),
    },
    b: {
      'package.json': JSON.stringify({
        name: 'b',
      }),
    },
  },
})

const monorepo = Monorepo.load(projectRoot)

t.test('ids that satisfy the spec', t => {
  const satisfied: [Spec, DepID][] = [
    [
      Spec.parse('foo@1.x'),
      joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    ],
    [
      Spec.parse('@scope/foo@1.x'),
      joinDepIDTuple(['registry', 'npm', '@scope/foo@1.2.3']),
    ],
    [
      Spec.parse('@scope/foo@latest'),
      joinDepIDTuple(['registry', 'npm', '@scope/foo@1.2.3']),
    ],
    [
      Spec.parse('foo@1.x', {
        registry: 'https://example.com/',
        registries: {
          ex: 'https://example.com/',
        },
      }),
      joinDepIDTuple(['registry', 'ex', 'foo@1.2.3']),
    ],
    [
      Spec.parse('x@github:short/short'),
      joinDepIDTuple([
        'git',
        'github:short/short',
        'deadbeefcafebad',
      ]),
    ],
    [
      Spec.parse('x@git+ssh://git@github.com:long/short.git'),
      joinDepIDTuple(['git', 'github:long/short', 'deadbeefcafebad']),
    ],
    [
      Spec.parse('x@github:short/long'),
      joinDepIDTuple([
        'git',
        'git+ssh://git@github.com:short/long.git',
        'deadbeefcafebad',
      ]),
    ],
    [
      Spec.parse('x@git+ssh://git@github.com:long/long.git'),
      joinDepIDTuple([
        'git',
        'git+ssh://git@github.com:long/long.git',
        'deadbeefcafebad',
      ]),
    ],
    [
      Spec.parse('x@github:y/z#path:src/x'),
      joinDepIDTuple([
        'git',
        'github:y/z',
        'deadbeefcafebad::path:src/x',
      ]),
    ],
    [
      Spec.parse('a@workspace:*'),
      joinDepIDTuple(['workspace', 'src/a']),
    ],
    [
      Spec.parse('a@workspace:b@*'),
      joinDepIDTuple(['workspace', 'src/b']),
    ],
    [
      Spec.parse('a@workspace:1.x'),
      joinDepIDTuple(['workspace', 'src/a']),
    ],
    [
      Spec.parse('a@https://example.com/a.tgz'),
      joinDepIDTuple(['remote', 'https://example.com/a.tgz']),
    ],
    [Spec.parse('a@file:a'), joinDepIDTuple(['file', './a'])],
    [
      Spec.parse('a@registry:https://registry.npmjs.org/#a@1.x'),
      joinDepIDTuple(['registry', '', 'a@1.2.3']),
    ],
    [
      Spec.parse('a@registry:https://example.com/#a@1.x', {
        registries: {
          ex: 'https://example.com/',
        },
      }),
      joinDepIDTuple(['registry', 'ex', 'a@1.2.3']),
    ],
  ]

  for (const [spec, depid] of satisfied) {
    t.equal(
      satisfies(depid, spec, projectRoot, projectRoot, monorepo),
      true,
      {
        spec: spec,
        depid,
      },
    )
  }

  t.end()
})

t.test('ids that do not satisfy the spec', t => {
  const unsatisfied: [Spec, DepID][] = [
    [
      Spec.parse('foo@1.x', {
        registries: {
          ex: 'https://example.com/',
        },
      }),
      joinDepIDTuple(['registry', 'ex', 'foo@1.2.3']),
    ],
    [
      Spec.parse('foo@ex:foo@1.x', {
        registries: {
          ex: 'https://example.com/',
        },
      }),
      joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    ],
    [
      Spec.parse('@foo/bar@1.x'),
      joinDepIDTuple(['registry', '', '@foo/bar']),
    ],
    [
      Spec.parse('a@registry:https://other.registry/#a@1.x'),
      joinDepIDTuple(['registry', '', 'a@1.2.3']),
    ],
    [
      Spec.parse('a@registry:https://other.registry/#a@1.x'),
      joinDepIDTuple(['registry', 'ex', 'a@1.2.3']),
    ],
    [
      Spec.parse('a@registry:https://example.com/#a@1.x', {
        registries: {
          ex: 'https://not.example.com/',
        },
      }),
      joinDepIDTuple(['registry', 'ex', 'a@1.2.3']),
    ],
    [
      Spec.parse('a@1'),
      joinDepIDTuple(['git', 'mismatched', 'type']),
    ],
    [
      Spec.parse('x@workspace:xyz@*'),
      joinDepIDTuple(['workspace', 'src/a']),
    ],
    // can't do a semver range if it doesn't have a version
    [
      Spec.parse('b@workspace:b@1.x'),
      joinDepIDTuple(['workspace', 'src/b']),
    ],
    [
      Spec.parse('x@github:y/z'),
      joinDepIDTuple(['git', 'github:a/b', '']),
    ],
    [
      Spec.parse('x@github:y/z'),
      joinDepIDTuple(['git', 'gitlab:y/z', '']),
    ],
    [
      Spec.parse('x@github:y/z#deadbeef'),
      joinDepIDTuple(['git', 'github:y/z', 'asdfcafebad']),
    ],
    [
      Spec.parse('x@github:y/z#deadbeef'),
      joinDepIDTuple(['git', 'github:y/z', '']),
    ],
    [
      Spec.parse('x@github:y/z#path:a/b'),
      joinDepIDTuple(['git', 'github:y/z', 'path:c/d']),
    ],
    [
      Spec.parse('a@git://host/repo'),
      joinDepIDTuple(['git', 'git://otherhost/repo', '']),
    ],
  ]

  for (const [spec, depid] of unsatisfied) {
    t.equal(
      satisfies(depid, spec, projectRoot, projectRoot, monorepo),
      false,
      {
        spec: spec,
        depid,
      },
    )
  }

  t.end()
})
