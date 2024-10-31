import { error } from '@vltpkg/error-cause'
import { parse, Range, satisfies, Version } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import {
  type Manifest,
  type Packument,
  type RevDoc,
  type RevDocEntry,
} from '@vltpkg/types'

const parsedNodeVersion = Version.parse(process.version)

export type PickManifestOptions = {
  tag?: string
  before?: Date | number | string
  'node-version'?: string
  os?: NodeJS.Platform
  arch?: NodeJS.Architecture
}

export type Manifestish = Manifest | RevDocEntry
export type Packumentish = Packument | RevDoc
export type PickManifestish<T extends Packumentish> =
  T extends RevDoc ? RevDocEntry : Manifest
export type ManiCheck<T extends Packumentish> = {
  version: Version
  deprecated: boolean
  platform: boolean
  prerelease: boolean
  mani: PickManifestish<T>
}

const isBefore = (
  version: string,
  before?: number,
  verTimes?: Record<string, string>,
): boolean => {
  if (!verTimes || !version || !before) return true
  const time = version && verTimes[version]
  return !!time && Date.parse(time) <= before
}

const checkList = (value: string, list?: string[] | string) => {
  if (typeof list === 'string') {
    list = [list]
  }
  // invalid list is equivalent to 'any'
  if (!Array.isArray(list)) return true
  if (list.length === 1 && list[0] === 'any') {
    return true
  }
  // match none of the negated values, and at least one of the
  // non-negated values, if any are present.
  let negated = 0
  let match = false
  for (const entry of list) {
    const negate = entry.startsWith('!')
    const test = negate ? entry.slice(1) : entry
    if (negate) {
      negated++
      if (value === test) {
        return false
      }
    } else {
      match = match || value === test
    }
  }
  return match || negated === list.length
}

/**
 * Call with a manifest and the node version and process platform/arch
 * to check whether a version is suitable for the current platform.
 */
export const platformCheck = (
  mani: Manifestish,
  nodeVersion: Version | string,
  wantOs?: NodeJS.Process['platform'],
  wantArch?: NodeJS.Process['arch'],
): boolean => {
  const { engines, os, cpu } = mani
  if (engines) {
    const { node } = engines
    if (node && !satisfies(nodeVersion, node, true)) {
      return false
    }
  }
  if (wantOs && !checkList(wantOs, os)) return false
  if (wantArch && !checkList(wantArch, cpu)) return false
  return true
}

const versionOk = (
  packument: Packumentish,
  version: string,
  nodeVersion: Version,
  os: NodeJS.Process['platform'],
  arch: NodeJS.Process['arch'],
  before?: number,
) => {
  const mani = packument.versions[version]
  /* c8 ignore next */
  if (!mani) return false
  const { time } = packument
  return (
    isBefore(version, before, time) &&
    platformCheck(mani, nodeVersion, os, arch)
  )
}

/**
 * Choose the most appropriate manifest from a packument.
 *
 * If `before` is set in the options, then the packument MUST
 * be a full non-minified Packument object. Otherwise, a minified packument
 * is fine.
 */
export function pickManifest<T extends Packumentish>(
  packument: T,
  wanted: Range | Spec | string,
  opts: PickManifestOptions = {},
): PickManifestish<T> | undefined {
  const {
    tag = 'latest',
    before,
    'node-version': nodeVersion,
    os = process.platform,
    arch = process.arch,
  } = opts
  const nv =
    !nodeVersion ? parsedNodeVersion : Version.parse(nodeVersion)

  // cast since 'time' might not be present on minified packuments
  const {
    name,
    time: verTimes,
    versions = {},
    'dist-tags': distTags = {},
  } = packument

  const time = before && verTimes ? +new Date(before) : Infinity
  let range: Range | undefined = undefined
  let spec: Spec | undefined = undefined
  if (typeof wanted === 'object') {
    if (wanted instanceof Spec) {
      const f = wanted.final
      range = f.range
      spec = f
    } else {
      range = wanted
    }
  } else {
    spec = Spec.parse(`${name}@${wanted}`).final
    range = spec.range
  }

  if (!range) {
    if (!spec?.distTag) {
      throw error(
        'Only dist-tag or semver range specs are supported',
        { spec },
      )
    }
    // if there is an explicit dist tag, we must get that version.
    const ver = distTags[spec.distTag]
    if (!ver) return undefined
    // if the version in the dist-tags is before the before date, then
    // we use that.  Otherwise, we get the highest precedence version
    // prior to the dist-tag.
    const mani = versions[ver]
    if (mani && versionOk(packument, ver, nv, os, arch, time)) {
      return mani as PickManifestish<T>
    } else {
      range = new Range(`<=${ver}`)
    }
  }

  if (range.isAny) range = new Range('*', true)

  // if the range is *, then we prefer the 'latest' if available
  // but skip this if it should be avoided, in that case we have
  // to try a little harder.
  const defaultVer = distTags[tag]
  const defTagVersion =
    defaultVer ? Version.parse(defaultVer) : undefined
  if (
    defaultVer &&
    (range.isAny || defTagVersion?.satisfies(range)) &&
    versionOk(packument, defaultVer, nv, os, arch, time)
  ) {
    return versions[defaultVer] as PickManifestish<T>
  }

  // ok, actually have to scan the list
  const entries = Object.entries(versions)

  if (!entries.length) {
    return undefined
  }

  let found: ManiCheck<T> | undefined = undefined
  let foundIsDefTag = false

  for (const [ver, mani] of entries) {
    if (time && verTimes && !isBefore(ver, time, verTimes)) {
      continue
    }
    const version = parse(ver)
    if (!version?.satisfies(range)) {
      continue
    }
    const mc = {
      version,
      deprecated: !!mani.deprecated,
      platform: platformCheck(mani, nv, os, arch),
      prerelease: !!version.prerelease?.length,
      mani,
    }
    if (!found) {
      found = mc
      if (defTagVersion?.equals(found.version)) {
        foundIsDefTag = true
      }
      continue
    }

    const mok = !mc.deprecated && mc.platform
    const fok = !found.deprecated && found.platform

    if (mok !== fok) {
      if (mok) {
        found = mc
        foundIsDefTag = !!defTagVersion?.equals(mc.version)
      }
    } else if (mc.platform !== found.platform) {
      if (mc.platform) {
        found = mc
        foundIsDefTag = !!defTagVersion?.equals(mc.version)
      }
    } else if (mc.deprecated !== found.deprecated) {
      if (!mc.deprecated) {
        found = mc
        /* c8 ignore next */
        foundIsDefTag = !!defTagVersion?.equals(mc.version)
      }
    } else if (found.prerelease !== mc.prerelease) {
      if (!mc.prerelease) {
        found = mc
        /* c8 ignore next */
        foundIsDefTag = !!defTagVersion?.equals(mc.version)
      }
    } else if (defTagVersion?.equals(mc.version)) {
      found = mc
      foundIsDefTag = true
    } else if (
      mc.version.greaterThan(found.version) &&
      !foundIsDefTag
    ) {
      found = mc
    }
  }
  return found?.mani
}
