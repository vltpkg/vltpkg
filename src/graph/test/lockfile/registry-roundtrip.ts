import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { PackageJson } from '@vltpkg/package-json'
import { unload } from '@vltpkg/vlt-json'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { Graph } from '../../src/graph.ts'
import { save } from '../../src/lockfile/save.ts'
import { load as loadVirtual } from '../../src/lockfile/load.ts'
import type { AddImportersDependenciesMap } from '../../src/dependencies.ts'
import type { InstallOptions } from '../../src/install.ts'

// Reproduces vltpkg/vltpkg#1580: lockfile node/edge registry references
// should not flip back to npm after a re-load and re-save when a custom
// registry is configured in vlt.json.

t.test(
  'custom registry survives save -> load -> save round-trip',
  async t => {
    const specOptions: SpecOptions = {
      registry: 'https://registry.vlt.io/npm/',
    }
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({ 'vlt.json': '{}' })
    t.chdir(projectRoot)
    unload('project')

    const graph = new Graph({
      ...specOptions,
      projectRoot,
      mainManifest,
    })
    graph
      .placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0', specOptions),
        {
          name: 'foo',
          version: '1.0.0',
          dist: {
            integrity: 'sha512-deadbeef==',
            // Many registries (incl. proxies) return the upstream
            // npmjs.org tarball URL even when serving the manifest
            // themselves. Ensure this is faithfully round-tripped.
            tarball: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
          },
        },
      )
      ?.setResolved()

    save({ ...specOptions, graph })
    const first = readFileSync(
      resolve(projectRoot, 'vlt-lock.json'),
      'utf8',
    )

    // Re-load the lockfile and re-save with the same options.
    const reloaded = loadVirtual({
      ...specOptions,
      projectRoot,
      mainManifest,
    })
    save({ ...specOptions, graph: reloaded })
    const second = readFileSync(
      resolve(projectRoot, 'vlt-lock.json'),
      'utf8',
    )

    t.equal(
      second,
      first,
      'second save should be byte-identical to first save',
    )
  },
)

t.test(
  'two installs in a row preserve custom registry references',
  async t => {
    const fooManifest = {
      name: 'foo',
      version: '1.0.0',
      dist: {
        integrity: 'sha512-deadbeef==',
        // Registry proxies frequently rewrite (or pass through)
        // tarball URLs; cover both cases here by using a URL that
        // does NOT live on the configured custom registry.
        tarball: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
      },
    }

    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'foo') return fooManifest
        return null
      },
      async extract(spec: Spec) {
        return { resolved: '', spec }
      },
    } as unknown as PackageInfoClient

    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: { foo: '^1.0.0' },
      }),
      'vlt.json': '{}',
    })
    t.chdir(projectRoot)
    unload('project')

    const customRegistry = 'https://registry.vlt.io/npm/'

    const options = {
      projectRoot,
      scurry: new PathScurry(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      allowScripts: ':not(*)',
      registry: customRegistry,
      lockfileOnly: true,
    } as unknown as InstallOptions

    const { install } = await import('../../src/install.ts')

    await install(options, new Map() as AddImportersDependenciesMap)

    const first = readFileSync(
      resolve(projectRoot, 'vlt-lock.json'),
      'utf8',
    )
    t.match(
      first,
      /registry\.vlt\.io/,
      'first install lockfile mentions the custom registry',
    )

    // wipe the hidden lockfile to make sure the second install
    // doesn't take any actual-graph shortcuts that paper over the bug
    const hidden = resolve(projectRoot, 'node_modules/.vlt-lock.json')
    if (existsSync(hidden)) rmSync(hidden)

    // fresh options - simulate a brand new `vlt install` invocation
    const options2 = {
      ...options,
      scurry: new PathScurry(projectRoot),
      packageJson: new PackageJson(),
    } as unknown as InstallOptions

    await install(options2, new Map() as AddImportersDependenciesMap)

    const second = readFileSync(
      resolve(projectRoot, 'vlt-lock.json'),
      'utf8',
    )

    t.equal(
      second,
      first,
      'second install should produce an identical lockfile',
    )
    t.match(
      second,
      /registry\.vlt\.io/,
      'second install lockfile still mentions the custom registry',
    )
  },
)
