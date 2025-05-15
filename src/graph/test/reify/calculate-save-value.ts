import { Spec } from '@vltpkg/spec'
import t from 'tap'
import { calculateSaveValue } from '../../src/reify/calculate-save-value.ts'

t.test('non-registry type, just saved as-is', t => {
  const s = Spec.parse('x', 'github:a/b')
  t.equal(calculateSaveValue('git', s, 'a/b', '1.2.3'), 'github:a/b')
  t.end()
})

// registry cases
// nodeVersion is always 1.2.3
const cases: [
  spec: string,
  existing: string | undefined,
  expect: string,
  comment: string,
][] = [
  ['1', undefined, '1', 'new dep, use specified range'],
  ['', undefined, '^1.2.3', 'new dep, no spec, use caret range'],
  ['npm:b@1', undefined, 'npm:b@1', 'alias preserved'],
  ['npm:b', undefined, 'npm:b@^1.2.3', 'alias preserved with range'],
  [
    'npm:b@',
    undefined,
    'npm:b@^1.2.3',
    'alias preserved with range with @',
  ],
  ['npm:b@npm:c@1', undefined, 'npm:c@1', 'chained alias shortened'],
  [
    'npm:b@npm:c',
    undefined,
    'npm:c@^1.2.3',
    'chained alias shortened with save range',
  ],
  ['jsr:@a/b@1', undefined, 'jsr:@a/b@1', 'jsr alias'],
  [
    'jsr:@a/b@',
    undefined,
    'jsr:@a/b@^1.2.3',
    'jsr alias with save range',
  ],
  [
    'npm:@i/j@jsr:@a/b@1',
    undefined,
    'jsr:@a/b@1',
    'jsr alias shorten',
  ],
  [
    'npm:@i/j@jsr:@a/b',
    undefined,
    'jsr:@a/b@^1.2.3',
    'jsr alias shorten with caret range',
  ],
  ['latest', 'latest', 'latest', 'spec matches manifest'],
  ['', 'latest', 'latest', 'spec from manifest'],
  ['1.2.3', 'latest', '1.2.3', 'requested specific version'],
  ['', '1.2.3', '1.2.3', 'manifest needs specific version'],
  ['1.2', '1.2', '1.2', 'got exactly what we wanted'],
  ['jsr:', undefined, 'jsr:^1.2.3', 'jsr save range'],
  [
    '1.2 || 2.5',
    undefined,
    '1.2 || 2.5',
    'saved what was requested, no existing dep',
  ],
  ['1.2 || 2.5', '1.2', '1.2 || 2.5', 'saved what was requested'],
]

t.test('registry cases', t => {
  t.plan(cases.length)
  for (const [bareSpec, existing, expect, comment] of cases) {
    const spec = Spec.parse('@x/y', bareSpec)
    t.equal(
      calculateSaveValue('registry', spec, existing, '1.2.3'),
      expect,
      comment,
    )
  }
})
