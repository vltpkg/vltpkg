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

t.test('catalog spec preserved as-is', t => {
  const s = Spec.parse('typescript', 'catalog:dev', {
    catalog: {},
    catalogs: { dev: { typescript: 'npm:typescript@^5.0.0' } },
    registry: 'https://registry.npmjs.org/',
    registries: {},
  })
  t.equal(
    calculateSaveValue('registry', s, undefined, '5.9.3'),
    'catalog:dev',
    'catalog spec saved as catalog:dev, not resolved value',
  )
  t.equal(
    calculateSaveValue('registry', s, '^4.0.0', '5.9.3'),
    'catalog:dev',
    'catalog spec replaces existing non-catalog dep',
  )
  t.end()
})

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

// save-exact registry cases
// nodeVersion is always 1.2.3
const saveExactCases: [
  spec: string,
  existing: string | undefined,
  expect: string,
  comment: string,
][] = [
  ['', undefined, '1.2.3', 'new dep, no spec, use exact version'],
  [
    '1',
    undefined,
    '1.2.3',
    'range spec overridden with exact version',
  ],
  ['npm:b', undefined, 'npm:b@1.2.3', 'alias with exact version'],
  [
    'npm:b@',
    undefined,
    'npm:b@1.2.3',
    'alias with @ uses exact version',
  ],
  [
    'npm:b@npm:c',
    undefined,
    'npm:c@1.2.3',
    'chained alias shortened with exact version',
  ],
  [
    'jsr:@a/b@',
    undefined,
    'jsr:@a/b@1.2.3',
    'jsr alias with exact version',
  ],
  [
    'npm:@i/j@jsr:@a/b',
    undefined,
    'jsr:@a/b@1.2.3',
    'jsr alias shorten with exact version',
  ],
  ['jsr:', undefined, 'jsr:1.2.3', 'jsr exact version'],
  ['latest', 'latest', 'latest', 'spec matches manifest, unchanged'],
  ['', 'latest', 'latest', 'spec from manifest, unchanged'],
  ['1.2.3', 'latest', '1.2.3', 'specific version stays exact'],
  [
    '',
    '1.2.3',
    '1.2.3',
    'manifest needs specific version, unchanged',
  ],
  ['1.2', '1.2', '1.2', 'got exactly what we wanted, unchanged'],
]

t.test('save-exact registry cases', t => {
  t.plan(saveExactCases.length)
  for (const [
    bareSpec,
    existing,
    expect,
    comment,
  ] of saveExactCases) {
    const spec = Spec.parse('@x/y', bareSpec)
    t.equal(
      calculateSaveValue('registry', spec, existing, '1.2.3', true),
      expect,
      comment,
    )
  }
})

t.test('save-exact with non-registry type', t => {
  const s = Spec.parse('x', 'github:a/b')
  t.equal(
    calculateSaveValue('git', s, 'a/b', '1.2.3', true),
    'github:a/b',
    'non-registry type unaffected by saveExact',
  )
  t.end()
})

t.test('save-exact with catalog spec', t => {
  const s = Spec.parse('typescript', 'catalog:dev', {
    catalog: {},
    catalogs: { dev: { typescript: 'npm:typescript@^5.0.0' } },
    registry: 'https://registry.npmjs.org/',
    registries: {},
  })
  t.equal(
    calculateSaveValue('registry', s, undefined, '5.9.3', true),
    'catalog:dev',
    'catalog spec preserved even with saveExact',
  )
  t.end()
})

// save-prefix registry cases
// nodeVersion is always 1.2.3
const savePrefixTildeCases: [
  spec: string,
  existing: string | undefined,
  expect: string,
  comment: string,
][] = [
  ['', undefined, '~1.2.3', 'new dep, no spec, use tilde prefix'],
  [
    '1',
    undefined,
    '1',
    'range spec preserved as-is with tilde prefix',
  ],
  ['npm:b', undefined, 'npm:b@~1.2.3', 'alias with tilde prefix'],
  [
    'npm:b@',
    undefined,
    'npm:b@~1.2.3',
    'alias with @ uses tilde prefix',
  ],
  [
    'npm:b@npm:c',
    undefined,
    'npm:c@~1.2.3',
    'chained alias shortened with tilde prefix',
  ],
  [
    'jsr:@a/b@',
    undefined,
    'jsr:@a/b@~1.2.3',
    'jsr alias with tilde prefix',
  ],
  [
    'npm:@i/j@jsr:@a/b',
    undefined,
    'jsr:@a/b@~1.2.3',
    'jsr alias shorten with tilde prefix',
  ],
  ['jsr:', undefined, 'jsr:~1.2.3', 'jsr tilde prefix'],
  ['latest', 'latest', 'latest', 'spec matches manifest, unchanged'],
  ['', 'latest', 'latest', 'spec from manifest, unchanged'],
  ['1.2.3', 'latest', '1.2.3', 'specific version stays exact'],
  [
    '',
    '1.2.3',
    '1.2.3',
    'manifest needs specific version, unchanged',
  ],
  ['1.2', '1.2', '1.2', 'got exactly what we wanted, unchanged'],
]

t.test('save-prefix ~ registry cases', t => {
  t.plan(savePrefixTildeCases.length)
  for (const [
    bareSpec,
    existing,
    expect,
    comment,
  ] of savePrefixTildeCases) {
    const spec = Spec.parse('@x/y', bareSpec)
    t.equal(
      calculateSaveValue(
        'registry',
        spec,
        existing,
        '1.2.3',
        false,
        '~',
      ),
      expect,
      comment,
    )
  }
})

t.test('save-prefix >= registry cases', t => {
  const spec = Spec.parse('@x/y', '')
  t.equal(
    calculateSaveValue(
      'registry',
      spec,
      undefined,
      '1.2.3',
      false,
      '>=',
    ),
    '>=1.2.3',
    'new dep with >= prefix',
  )
  t.end()
})

t.test('save-prefix empty string registry cases', t => {
  const spec = Spec.parse('@x/y', '')
  t.equal(
    calculateSaveValue(
      'registry',
      spec,
      undefined,
      '1.2.3',
      false,
      '',
    ),
    '1.2.3',
    'new dep with empty prefix (exact version)',
  )
  t.end()
})

t.test('save-exact takes precedence over save-prefix', t => {
  const spec = Spec.parse('@x/y', '')
  t.equal(
    calculateSaveValue(
      'registry',
      spec,
      undefined,
      '1.2.3',
      true,
      '~',
    ),
    '1.2.3',
    'saveExact overrides savePrefix',
  )
  t.end()
})

t.test('save-prefix with non-registry type', t => {
  const s = Spec.parse('x', 'github:a/b')
  t.equal(
    calculateSaveValue('git', s, 'a/b', '1.2.3', false, '~'),
    'github:a/b',
    'non-registry type unaffected by savePrefix',
  )
  t.end()
})

t.test('save-prefix with catalog spec', t => {
  const s = Spec.parse('typescript', 'catalog:dev', {
    catalog: {},
    catalogs: { dev: { typescript: 'npm:typescript@^5.0.0' } },
    registry: 'https://registry.npmjs.org/',
    registries: {},
  })
  t.equal(
    calculateSaveValue('registry', s, undefined, '5.9.3', false, '~'),
    'catalog:dev',
    'catalog spec preserved even with savePrefix',
  )
  t.end()
})

t.test('save-prefix defaults to ^ when undefined', t => {
  const spec = Spec.parse('@x/y', '')
  t.equal(
    calculateSaveValue(
      'registry',
      spec,
      undefined,
      '1.2.3',
      false,
      undefined,
    ),
    '^1.2.3',
    'undefined savePrefix defaults to ^',
  )
  t.end()
})
