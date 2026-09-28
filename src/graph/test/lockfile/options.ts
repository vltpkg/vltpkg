import type { SpecOptions } from '@vltpkg/spec'
import {
  defaultGitHostArchives,
  defaultGitHosts,
  defaultJsrRegistries,
  defaultRegistries,
  defaultRegistryName,
  defaultScopeRegistries,
} from '@vltpkg/spec'
import t from 'tap'
import {
  currentLockfileOptions,
  diffLockfileOptions,
} from '../../src/lockfile/options.ts'
import type { GraphModifier } from '../../src/modifiers.ts'
import type { LockfileData } from '../../src/lockfile/types.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
}

t.test('diffLockfileOptions', async t => {
  // what buildCurrentOptions() makes of configData
  const baseOptions = {
    registry: 'https://registry.npmjs.org/',
    registries: {
      npm: 'https://registry.npmjs.org/',
      custom: 'http://example.com',
    },
  }
  const diff = (
    current: SpecOptions,
    stored: LockfileData['options'] = {},
  ) =>
    diffLockfileOptions(
      {
        ...configData,
        ...current,
        mainManifest,
        projectRoot: t.testdirName,
      },
      { ...baseOptions, ...stored },
    )

  t.strictSame(diff({}), [], 'identical options')

  t.strictSame(
    diff({
      registries: {
        custom: 'http://example.com',
        npm: 'https://registry.npmjs.org/',
      },
    }),
    [],
    'reordered keys are not a change',
  )

  t.strictSame(
    diff(
      { catalog: { abbrev: '^2.0.0' } },
      { catalog: { abbrev: '^1.0.0' } },
    ),
    [
      {
        section: 'catalog',
        key: 'abbrev',
        from: '^1.0.0',
        to: '^2.0.0',
      },
    ],
    'a changed value',
  )

  t.strictSame(
    diff({ catalog: { abbrev: '^2.0.0' } }),
    [
      {
        section: 'catalog',
        key: 'abbrev',
        from: undefined,
        to: '^2.0.0',
      },
    ],
    'an added key',
  )

  t.strictSame(
    diff({}, { catalog: { abbrev: '^1.0.0' } }),
    [
      {
        section: 'catalog',
        key: 'abbrev',
        from: '^1.0.0',
        to: undefined,
      },
    ],
    'a removed key',
  )

  t.strictSame(
    diff(
      { catalogs: { node24: { '@types/node': '^25' } } },
      { catalogs: { node24: { '@types/node': '^24' } } },
    ),
    [
      {
        section: 'catalogs',
        key: 'node24 @types/node',
        from: '^24',
        to: '^25',
      },
    ],
    'a nested catalogs entry',
  )

  t.strictSame(
    diff({
      registries: { ...baseOptions.registries, gh: 'http://gh/' },
    }),
    [
      {
        section: 'registries',
        key: 'gh',
        from: undefined,
        to: 'http://gh/',
      },
    ],
    'a registries entry',
  )

  t.strictSame(
    diff({ registry: 'http://other/' }),
    [
      {
        section: 'registry',
        from: 'https://registry.npmjs.org/',
        to: 'http://other/',
      },
    ],
    'a scalar section has no key',
  )

  t.strictSame(
    diff({ 'git-hosts': defaultGitHosts }),
    [],
    'default entries are not reported',
  )
})

t.test('currentLockfileOptions', async t => {
  t.strictSame(
    currentLockfileOptions({}),
    {},
    'nothing configured, nothing stored',
  )

  t.strictSame(
    currentLockfileOptions({
      modifiers: {
        config: { '#abbrev': '^2' },
      } as unknown as GraphModifier,
      catalog: { abbrev: '^2' },
      catalogs: { node24: { '@types/node': '^24' } },
      registry: 'http://reg/',
      'default-registry-alias': 'custom',
      registries: { ...defaultRegistries, mine: 'http://mine/' },
      'scoped-registries': {
        ...defaultScopeRegistries,
        '@mine': 'http://mine/',
      },
      'jsr-registries': {
        ...defaultJsrRegistries,
        mine: 'http://mine/jsr/',
      },
      'git-hosts': {
        ...defaultGitHosts,
        mine: 'git+ssh://mine/$1/$2',
      },
      'git-host-archives': {
        ...defaultGitHostArchives,
        mine: 'http://mine/$1/$2/tar',
      },
    }),
    {
      modifiers: { '#abbrev': '^2' },
      catalog: { abbrev: '^2' },
      catalogs: { node24: { '@types/node': '^24' } },
      'scoped-registries': { '@mine': 'http://mine/' },
      'jsr-registries': { mine: 'http://mine/jsr/' },
      registry: 'http://reg/',
      'default-registry-alias': 'custom',
      registries: { mine: 'http://mine/' },
      'git-hosts': { mine: 'git+ssh://mine/$1/$2' },
      'git-host-archives': { mine: 'http://mine/$1/$2/tar' },
    },
    'every section, with default entries stripped',
  )

  t.strictSame(
    currentLockfileOptions({
      'default-registry-alias': defaultRegistryName,
      registries: defaultRegistries,
      'scoped-registries': defaultScopeRegistries,
      'jsr-registries': defaultJsrRegistries,
      'git-hosts': defaultGitHosts,
      'git-host-archives': defaultGitHostArchives,
      catalog: {},
      catalogs: {},
      modifiers: { config: undefined } as unknown as GraphModifier,
    }),
    {},
    'all-default values are not stored',
  )
})
