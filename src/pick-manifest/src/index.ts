import { error } from '@vltpkg/error-cause'
import { parse, Range, satisfies, Version } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import {
  Manifest,
  ManifestMinified,
  Packument,
  PackumentMinified,
} from '@vltpkg/types'

const parsedNodeVersion = Version.parse(process.version)

export type PickManifestOptions = {
  tag?: string
  before?: Date | string | number
  'node-version'?: string
  os?: NodeJS.Platform
  arch?: NodeJS.Architecture
}

export type PickManifestOptionsBefore = PickManifestOptions & {
  before: NonNullable<PickManifestOptions['before']>
}
export type PickManifestOptionsNoBefore = PickManifestOptions & {
  before?: undefined
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

const checkList = (value: string, list: unknown) => {
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
    const negate = entry.charAt(0) === '!'
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

const platformCheck = (
  mani: Manifest | ManifestMinified,
  nodeVersion: Version,
  wantOs: NodeJS.Process['platform'],
  wantArch: NodeJS.Process['arch'],
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
  packument: Packument | PackumentMinified,
  version: string,
  nodeVersion: Version,
  os: NodeJS.Process['platform'],
  arch: NodeJS.Process['arch'],
  before?: number,
) => {
  const mani = packument.versions[version]
  /* c8 ignore next */
  if (!mani) return false
  const { time } = packument as Packument
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
export function pickManifest(
  packument: Packument,
  wanted: string | Range | Spec,
  opts: PickManifestOptions,
): Manifest | undefined
export function pickManifest(
  packument: PackumentMinified,
  wanted: string | Range | Spec,
  opts: PickManifestOptionsNoBefore,
): ManifestMinified | undefined
export function pickManifest(
  packument: Packument,
  wanted: string | Range | Spec,
): Manifest | undefined
export function pickManifest(
  packument: PackumentMinified,
  wanted: string | Range | Spec,
): ManifestMinified | undefined
export function pickManifest(
  packument: Packument | PackumentMinified,
  wanted: string | Range | Spec,
): Manifest | ManifestMinified | undefined
export function pickManifest(
  packument: Packument | PackumentMinified,
  wanted: string | Range | Spec,
  opts: PickManifestOptions = {},
): ManifestMinified | Manifest | undefined {
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
  } = packument as Packument

  const time = before && verTimes ? +new Date(before) : Infinity
  let range: Range | undefined = undefined
  let spec: Spec | undefined = undefined
  if (typeof wanted === 'object') {
    if (wanted instanceof Spec) {
      range = wanted.range
      spec = wanted
    } else {
      range = wanted
    }
  } else {
    spec = Spec.parse(`${name}@${wanted}`)
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
      return mani
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
    (!!defaultVer && Version.parse(defaultVer)) || undefined
  if (
    defaultVer &&
    !!range &&
    (range.isAny || defTagVersion?.satisfies(range)) &&
    versionOk(packument, defaultVer, nv, os, arch, time)
  ) {
    return versions[defaultVer]
  }

  // ok, actually have to scan the list
  const entries = Object.entries(versions)

  if (!entries.length) {
    return undefined
  }

  type ManiCheck = {
    version: Version
    deprecated: boolean
    platform: boolean
    prerelease: boolean
    mani: ManifestMinified
  }
  let found: ManiCheck | undefined = undefined
  let foundIsDefTag: boolean = false

  for (const [ver, mani] of entries) {
    if (time && verTimes && !isBefore(ver, time, verTimes)) {
      continue
    }
    const version = parse(ver)
    if (!version?.satisfies(range)) {
      continue
    }
    const mc: ManiCheck = {
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
