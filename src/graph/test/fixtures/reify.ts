// fixture implementation for reify tests

// This is a little bit complicated, but allows us to modify this test
// without manually fetching fixtures or having to fetch anything in CI.
// The json maps spec strings to resolution files, and then if the file
// is there, we serve it up. Otherwise, we fetch from the actual real
// world location, and stash it in the fixtures dir.

import { Spec } from '@vltpkg/spec'
import t from 'tap'
import { PackageInfoClient } from '@vltpkg/package-info'
import type {
  PackageInfoClientRequestOptions,
  Resolution,
} from '@vltpkg/package-info'
import {
  asNormalizedManifest,
  normalizeManifest,
} from '@vltpkg/types'
import type { Manifest } from '@vltpkg/types'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
  statSync,
} from 'node:fs'
import { basename, resolve } from 'node:path'
import { extract } from 'tar'

const realPackageInfo = new PackageInfoClient({})
export const fixtureDir = resolve(import.meta.dirname, 'reify')

const fixtureMapFile = resolve(fixtureDir, 'map.json')
const fixtureMap = JSON.parse(
  readFileSync(fixtureMapFile, 'utf8'),
) as Record<string, string>

const resolutionsMapFile = resolve(fixtureDir, 'resolutions.json')
const resolutionsMap = JSON.parse(
  readFileSync(resolutionsMapFile, 'utf8'),
) as Record<string, Omit<Resolution, 'spec'>>

const fixtureExists = (fixture: string) =>
  existsSync(resolve(fixtureDir, fixture) + '.tgz') &&
  existsSync(resolve(fixtureDir, fixture) + '.json')

const fixtureName = async (spec: Spec) =>
  basename((await mockPackageInfo.resolve(spec)).resolved, '.tgz')

let fixtureMapChanged = false
let resolutionsMapChanged = false

export const fixtureManifest = (name: string) =>
  asNormalizedManifest(
    normalizeManifest(
      JSON.parse(
        readFileSync(resolve(fixtureDir, name) + '.json', 'utf8'),
      ),
    ),
  )

const actualPackageInfo = new PackageInfoClient()

export const mockPackageInfo = {
  resolve: async (
    spec: string | Spec,
    options: PackageInfoClientRequestOptions = {},
  ): Promise<Resolution> => {
    spec = typeof spec === 'string' ? Spec.parse(spec) : spec
    if (spec.type === 'file') {
      return actualPackageInfo.resolve(spec, options)
    }
    const res =
      resolutionsMap[String(spec)] ??
      (await realPackageInfo.resolve(spec, options))
    delete (res as { spec?: Spec }).spec
    if (!resolutionsMap[String(spec)]) {
      resolutionsMap[String(spec)] = res
      resolutionsMapChanged = true
    }
    return { ...res, spec }
  },

  manifest: async (
    spec: string | Spec,
    options: PackageInfoClientRequestOptions = {},
  ) => {
    spec = Spec.parse(String(spec)).final
    if (spec.type === 'file') {
      return actualPackageInfo.manifest(spec, options)
    }
    const fixture =
      fixtureMap[String(spec)] ?? (await fixtureName(spec))
    if (!fixtureExists(fixture)) await addFixture(spec)
    const maniFile = resolve(fixtureDir, fixture) + '.json'
    if (!fixtureMap[String(spec)]) {
      fixtureMap[String(spec)] = fixture
      fixtureMapChanged = true
    }
    return JSON.parse(readFileSync(maniFile, 'utf8')) as Manifest
  },

  extract: async (
    spec: string | Spec,
    target: string,
    options: PackageInfoClientRequestOptions = {},
  ) => {
    spec = Spec.parse(String(spec)).final
    if (spec.type === 'file') {
      return actualPackageInfo.extract(spec, target, options)
    }
    const fixture =
      fixtureMap[String(spec)] ?? (await fixtureName(spec))
    if (!fixtureExists(fixture)) await addFixture(spec)
    const artifact = resolve(fixtureDir, fixture + '.tgz')
    fixtureMap[String(spec)] = fixture
    if (lstatSync(artifact).isSymbolicLink()) {
      symlinkSync(artifact, target)
    } else {
      mkdirSync(target, { recursive: true })
      extract({ sync: true, file: artifact, strip: 1, cwd: target })
    }
  },
}

const addFixture = async (spec: Spec) => {
  const fixture = await fixtureName(spec)
  if (fixtureExists(fixture)) {
    return fixture
  }

  const res = await mockPackageInfo.resolve(spec)
  // get the artifact
  const artifact = resolve(fixtureDir, fixture + '.tgz')
  if (/^https?:/.test(res.resolved)) {
    const response = await fetch(res.resolved)
    const buf = Buffer.from(await response.arrayBuffer())
    writeFileSync(artifact, buf)
  } else if (res.resolved.startsWith('git')) {
    throw new Error('git deps have to be added manually')
  } else {
    const st = statSync(res.resolved)
    if (st.isFile()) {
      writeFileSync(artifact, readFileSync(res.resolved))
    } else {
      symlinkSync(res.resolved, artifact)
    }
  }

  // get the manifest
  const maniFile = resolve(fixtureDir, fixture + '.json')
  writeFileSync(
    maniFile,
    JSON.stringify(await realPackageInfo.manifest(spec), null, 2) +
      '\n',
  )

  fixtureMap[String(spec)] = fixture
}

t.teardown(() => {
  if (fixtureMapChanged) {
    writeFileSync(
      fixtureMapFile,
      JSON.stringify(fixtureMap, null, 2) + '\n',
    )
  }
  if (resolutionsMapChanged) {
    writeFileSync(
      resolutionsMapFile,
      JSON.stringify(resolutionsMap, null, 2) + '\n',
    )
  }
})
