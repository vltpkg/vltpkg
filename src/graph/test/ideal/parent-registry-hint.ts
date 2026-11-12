import { joinDepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import { withParentRegistryHint } from '../../src/ideal/parent-registry-hint.ts'

const npm = 'https://registry.npmjs.org/'
const corp = 'https://corp.example.com/'
const options = {
  registries: { npm, corp },
} satisfies SpecOptions

const graph = new Graph({
  projectRoot: t.testdirName,
  mainManifest: { name: 'app', version: '1.0.0' },
  ...options,
})
const parent = graph.addNode(
  joinDepIDTuple(['registry', 'corp', 'internal-lib@1.0.0']),
  undefined,
  undefined,
  'internal-lib',
  '1.0.0',
)
const notFound = (spec: Spec, statusCode = 404) =>
  error('failed to fetch packument: 404 Not Found', {
    code: 'ERESOLVE',
    spec,
    url: `${npm}${spec.name}`,
    response: { statusCode },
  })
const utils = Spec.parse('utils', '^1', options)

t.test('other errors are returned as is', async t => {
  const plain = new Error('nope')
  t.equal(withParentRegistryHint(plain, utils, parent), plain)
  const notObject = new Error('nope', { cause: new Error('x') })
  t.equal(withParentRegistryHint(notObject, utils, parent), notObject)
  const noResponse = error('nope', { code: 'ERESOLVE' })
  t.equal(
    withParentRegistryHint(noResponse, utils, parent),
    noResponse,
  )
  const forbidden = notFound(utils, 403)
  t.equal(withParentRegistryHint(forbidden, utils, parent), forbidden)

  const er = notFound(utils)
  t.equal(
    withParentRegistryHint(er, utils, graph.mainImporter),
    er,
    'importer parent',
  )
  const git = Spec.parse('utils', 'github:a/utils', options)
  t.equal(withParentRegistryHint(er, git, parent), er, 'not registry')
  const prefixed = Spec.parse('utils', 'npm:utils@^1', options)
  t.equal(
    withParentRegistryHint(er, prefixed, parent),
    er,
    'prefixed',
  )
  const scoped = Spec.parse('@acme/x', '^1', {
    ...options,
    'scoped-registries': { '@acme': 'https://other.example.com/' },
  })
  t.equal(
    withParentRegistryHint(er, scoped, parent),
    er,
    'routed by scoped-registries',
  )
  const jsrParent = graph.addNode(
    joinDepIDTuple(['registry', 'jsr', '@jsr/a__b@1.0.0']),
    undefined,
    undefined,
    '@jsr/a__b',
    '1.0.0',
  )
  t.equal(withParentRegistryHint(er, utils, jsrParent), er, 'jsr')
  const sameRegistry = Spec.parse('utils', '^1', {
    ...options,
    'default-registry-alias': 'corp',
  })
  t.equal(
    withParentRegistryHint(er, sameRegistry, parent),
    er,
    'same registry',
  )
})

t.test('a 404 under a parent from another registry', async t => {
  const er = notFound(utils)
  t.match(withParentRegistryHint(er, utils, parent), {
    message:
      'failed to fetch packument: 404 Not Found\n' +
      'utils has no registry prefix, so it was requested from npm, ' +
      'but its parent internal-lib came from corp. To install it ' +
      'from corp, give it a registry prefix with a graph modifier ' +
      'in vlt.json, or map its scope in scoped-registries.',
    cause: {
      code: 'ERESOLVE',
      spec: utils,
      url: `${npm}utils`,
      response: { statusCode: 404 },
      cause: er,
    },
  })
})
