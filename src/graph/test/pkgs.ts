import t from 'tap'
import { Package, PackageInventory } from '../src/pkgs.js'

t.test('Package', async t => {
  const pkg = new Package({
    name: 'foo',
    version: '1.0.0',
  })
  t.strictSame(pkg.id, 'foo@1.0.0', 'should retrieve a package id')
  t.strictSame(
    pkg.tarball,
    undefined,
    'should return undefined on access missing manifest info',
  )
  t.strictSame(
    pkg.integrity,
    undefined,
    'should return undefined on access missing manifest info',
  )
  t.strictSame(
    pkg.shasum,
    undefined,
    'should return undefined on access missing manifest info',
  )
  const prefixedPkg = new Package(
    {
      name: 'bar',
      version: '1.0.0',
    },
    undefined,
    'vlt:',
  )
  t.strictSame(
    prefixedPkg.id,
    'vlt:bar@1.0.0',
    'should use prefix when origin is passed as an option',
  )
  const depPkg = new Package({
    name: 'lorem',
    version: '2.0.0',
    dependencies: {
      a: '^1.0.0',
    },
    devDependencies: {
      b: '^1.0.0',
    },
    optionalDependencies: {
      c: '^1.0.0',
    },
  })
  t.strictSame(depPkg.name, 'lorem', 'should retrieve pkg name')
  t.strictSame(
    depPkg.dependencies,
    { a: '^1.0.0' },
    'should retrieve prod dependencies',
  )
  t.strictSame(
    depPkg.devDependencies,
    { b: '^1.0.0' },
    'should retrieve dev dependencies',
  )
  t.strictSame(
    depPkg.optionalDependencies,
    { c: '^1.0.0' },
    'should retrieve optional dependencies',
  )
  t.strictSame(
    depPkg.peerDependencies,
    undefined,
    'should retrieve no peer dependencies when undefined',
  )
  const locationOnly = new Package(
    { version: '1.0.0' },
    './node_modules/foo',
  )
  t.strictSame(
    locationOnly.name,
    './node_modules/foo',
    'name should default to location if available',
  )
  const unnamed = new Package({ version: '1.0.0' })
  t.strictSame(
    unnamed.name,
    '',
    'empty name if no name | package is provided',
  )
  const noversion = new Package({ name: 'noversion' })
  t.strictSame(
    noversion.version,
    '',
    'empty version if no version was defined',
  )
  const noDepsMetadata = new Package({
    name: 'ipsum',
    version: '1.0.0',
  })
  noDepsMetadata.updateMetadata({
    dependencies: { a: '^1.0.0' },
    devDependencies: { b: '^1.0.0' },
    optionalDependencies: { c: '^1.0.0' },
    peerDependencies: { d: '^1.0.0' },
    dist: {
      integrity:
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      tarball: 'https://registry.npmjs.org/ipsum/-/ipsum-1.0.0.tgz',
    },
  })
  t.strictSame(
    noDepsMetadata.dependencies,
    { a: '^1.0.0' },
    'should have added dependencies',
  )
  t.strictSame(
    noDepsMetadata.devDependencies,
    { b: '^1.0.0' },
    'should have added devDependencies',
  )
  t.strictSame(
    noDepsMetadata.optionalDependencies,
    { c: '^1.0.0' },
    'should have added optionalDependencies',
  )
  t.strictSame(
    noDepsMetadata.peerDependencies,
    { d: '^1.0.0' },
    'should have added peerDependencies',
  )
  t.strictSame(
    noDepsMetadata.tarball,
    'https://registry.npmjs.org/ipsum/-/ipsum-1.0.0.tgz',
    'should have added tarball',
  )
  t.strictSame(
    noDepsMetadata.integrity,
    'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
    'should have added integrity',
  )
  const needsUpdate = new Package({ name: 'dolor', version: '1.0.0' })
  needsUpdate.updateMetadata({
    dist: {
      shasum: 'cf59829b8b4f03f89dda2771cb7f3653828c89bf',
      tarball: 'https://registry.npmjs.org/dolor/-/dolor-1.0.0.tgz',
    },
  })
  t.strictSame(
    needsUpdate.shasum,
    'cf59829b8b4f03f89dda2771cb7f3653828c89bf',
    'should have added shasum',
  )

  const pdm = new Package({
    name: 'pdm',
    version: '1.2.3',
    peerDependencies: {
      foo: '*',
    },
    peerDependenciesMeta: {
      foo: { optional: true },
    },
  })
  t.strictSame(pdm.peerDependencies, { foo: '*' })
  t.strictSame(pdm.peerDependenciesMeta, { foo: { optional: true } })
})

t.test('PackageInventory', async t => {
  const inventory = new PackageInventory()
  const pkg = inventory.registerPackage(
    {
      name: 'foo',
      version: '1.0.0',
    },
    'npm:',
  )
  t.strictSame(inventory.size, 1, 'should have other Map properties')

  const repeatPkg = inventory.registerPackage({
    name: 'foo',
    version: '1.0.0',
  })
  t.strictSame(
    pkg,
    repeatPkg,
    'should return same package instance if duplicating package info',
  )

  const manifest = `{
  "name": "abbrev",
  "version": "2.0.0",
  "description": "Like ruby's abbrev module, but in js",
  "author": {
    "name": "GitHub Inc."
  },
  "main": "lib/index.js",
  "scripts": {
    "test": "tap",
    "postlint": "template-oss-check",
    "template-oss-apply": "template-oss-apply --force",
    "lintfix": "npm run lint -- --fix",
    "snap": "tap",
    "posttest": "npm run lint"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/npm/abbrev-js.git"
  },
  "license": "ISC",
  "devDependencies": {
    "@npmcli/eslint-config": "^4.0.0",
    "@npmcli/template-oss": "4.8.0",
    "tap": "^16.3.0"
  },
  "tap": {
    "nyc-arg": [
      "--exclude",
      "tap-snapshots/**"
    ]
  },
  "engines": {
    "node": "^14.17.0 || ^16.13.0 || >=18.0.0"
  },
  "templateOSS": {
    "//@npmcli/template-oss": "This file is partially managed by @npmcli/template-oss. Edits may be overwritten.",
    "version": "4.8.0"
  },
  "gitHead": "6eaa998b4291757a34d55d815290314c4776a30a",
  "bugs": {
    "url": "https://github.com/npm/abbrev-js/issues"
  },
  "homepage": "https://github.com/npm/abbrev-js#readme",
  "_id": "abbrev@2.0.0",
  "_nodeVersion": "18.12.0",
  "_npmVersion": "9.0.1",
  "dist": {
    "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    "shasum": "cf59829b8b4f03f89dda2771cb7f3653828c89bf",
    "tarball": "https://registry.npmjs.org/abbrev/-/abbrev-2.0.0.tgz",
    "fileCount": 4,
    "unpackedSize": 4827
  }
}`
  const pending = inventory.registerPending(JSON.parse(manifest))
  t.strictSame(
    pending.tarball,
    'https://registry.npmjs.org/abbrev/-/abbrev-2.0.0.tgz',
    'should retrieve the tarball url',
  )
  t.strictSame(
    pending.integrity,
    'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
    'should retrieve the integrity value',
  )
  t.strictSame(
    pending.shasum,
    'cf59829b8b4f03f89dda2771cb7f3653828c89bf',
    'should retrieve the shasum value',
  )
  t.strictSame(
    inventory.pending.size,
    1,
    'should have added package to pending packages list',
  )
  inventory.registerPackage(
    {
      name: 'abbrev',
      version: '2.0.0',
    },
    'path/to/module',
  )
  t.strictSame(
    inventory.pending.size,
    0,
    'should remote package from list of pending package list if its location is added later',
  )
})
