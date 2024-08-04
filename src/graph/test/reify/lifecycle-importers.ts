import {PackageJson} from '@vltpkg/package-json'
import { RunOptions } from '@vltpkg/run'
import {Spec} from '@vltpkg/spec'
import { resolve } from 'path'
import t from 'tap'
import { load as loadActual } from '../../src/actual/load.js'
import {Diff} from '../../src/diff.js'
import {Edge} from '../../src/edge.js'
import { build as buildIdeal } from '../../src/ideal/build.js'
import {Node} from '../../src/node.js'
import { mockPackageInfo } from '../fixtures/reify.js'

const runs: RunOptions[] = []
t.beforeEach(() => (runs.length = 0))

const mockRun = async (options: RunOptions) => {
  runs.push(options)
}

const { lifecycleImporters } = await t.mockImport<
  typeof import('../../src/reify/lifecycle-importers.js')
>('../../src/reify/lifecycle-importers.js', {
  '@vltpkg/run': { run: mockRun },
})

t.test('run scripts for importers with changed deps', async t => {
  const dir = t.testdir({
    cache: {},
    project: {
      'vlt-workspaces.json': JSON.stringify('src/*'),
      'package.json': JSON.stringify({}),
      src: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.2.3',
            dependencies: { glob: '11' },
          }),
        },
        filedep: {
          'package.json': JSON.stringify({
            name: 'filedep',
            version: '1.2.3',
            optionalDependencies: { missing: 'file:./missing.tgz' },
          }),
        },
      },
    },
  })
  const projectRoot = resolve(dir, 'project')
  const actual = loadActual({ projectRoot, loadManifests: true })
  const ideal = await buildIdeal({
    projectRoot,
    packageInfo: mockPackageInfo,
    loadManifests: true,
  })
  const diff = new Diff(actual, ideal)
  const packageJson = new PackageJson()
  await lifecycleImporters(diff, packageJson, projectRoot)
  t.match(new Set(runs), new Set([
    { arg0: 'install', cwd: './src/a' },
    { arg0: 'install', cwd: './src/filedep' },
    { arg0: 'prepare', cwd: './src/a' },
    { arg0: 'prepare', cwd: './src/filedep' },
  ]))
  // now we do the samething, but only the src/a has changes
  ideal.nodes.delete(';;glob@11.0.0')
  const globEdge = ideal.nodes.get('workspace;src%2Fa')?.edgesOut.get('glob')
  if (!globEdge) throw new Error('glob edge went missing??')
  globEdge.to = undefined
  const ideal2 = await buildIdeal({
    projectRoot,
    packageInfo: mockPackageInfo,
    loadManifests: true,
  })
  const diff2 = new Diff(ideal, ideal2)
  runs.length = 0
  await lifecycleImporters(diff2, packageJson, projectRoot)
  t.match(runs, [
    { arg0: 'install', cwd: './src/a' },
    { arg0: 'prepare', cwd: './src/a' },
  ])
  runs.length = 0

  const fd = ideal2.nodes.get('workspace;src%2Ffiledep')
  if (!fd) throw new Error('wat')
  const fdglobEdge = new Edge('prod', Spec.parse('glob@11'), fd, ideal2.nodes.get(';;glob@11.0.0'))
  fd.edgesOut.set('glob', fdglobEdge)
  ideal2.edges.add(fdglobEdge)

  // now we run both, because there's a new edge added
  const diff3 = new Diff(ideal, ideal2)
  await lifecycleImporters(diff3, packageJson, projectRoot)
  t.match(new Set(runs.map(({arg0,cwd})=>({arg0,cwd}))), new Set([
    { arg0: 'install', cwd: './src/a' },
    { arg0: 'install', cwd: './src/filedep' },
    { arg0: 'prepare', cwd: './src/a' },
    { arg0: 'prepare', cwd: './src/filedep' },
  ]))
  runs.length = 0

  // verify that adding an importer builds it
  const ideal3 = await buildIdeal({
    projectRoot,
    packageInfo: mockPackageInfo,
    loadManifests: true,
  })
  const newImp = new Node({ projectRoot }, ';;workspace%2Fsrc/x')
  newImp.location = './src/x'
  newImp.importer = true
  ideal3.importers.add(newImp)
  ideal3.nodes.set(newImp.id, newImp)
  const globNode = ideal3.nodes.get(';;glob@11.0.0')
  if (!globNode) throw 'no glob??'
  // upgrade!
  globNode.id = ';;glob@11.0.1'
  globNode.location = './src/node_modules/.vlt/;;glob@11.0.1/node_modules/glob'
  ideal3.nodes.delete(';;glob@11.0.0')
  ideal3.nodes.set(globNode.id, globNode)
  const diff4 = new Diff(ideal, ideal3)
  await lifecycleImporters(diff4, packageJson, projectRoot)
  t.match(new Set(runs.map(({arg0,cwd})=>({arg0,cwd}))), new Set([
    { arg0: 'install', cwd: './src/a' },
    { arg0: 'install', cwd: './src/x' },
    { arg0: 'prepare', cwd: './src/a' },
    { arg0: 'prepare', cwd: './src/x' },
  ]))
  runs.length = 0
})
