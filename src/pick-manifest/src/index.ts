import { parse, Range, satisfies, Version } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'

const parsedNodeVersion = Version.parse(process.version)

export type JSONField =
  | string
  | number
  | JSONField[]
  | { [k: string]: JSONField }

export type Manifest = Record<string, JSONField> & {
  name: string
  version: string
  deprecated?: string
  engines?: Record<string, string>
  os?: string | string[]
  arch?: string | string[]
}

export type Packument = {
  name: string
  'dist-tags': Record<string, string>
  versions: Record<string, Manifest>
  time?: Record<string, string>
}

export type PickManifestOptions = {
  defaultTag?: string
  before?: Date | string | number
  nodeVersion?: string
  os?: NodeJS.Platform
  arch?: NodeJS.Architecture
}

const isBefore = (
  verTimes?: Record<string, string>,
  version?: string,
  before?: number,
): boolean => {
  if (!verTimes || !version || !before) return true
  const time = version && verTimes[version]
  return !!time && Date.parse(time) <= before
}

const checkList = (value: string, list: string | string[]) => {
  if (typeof list === 'string') {
    list = [list]
  }
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
  mani: Manifest,
  nodeVersion: Version,
  wantOs: NodeJS.Process['platform'],
  wantArch: NodeJS.Process['arch'],
): boolean => {
  const { engines, os, arch } = mani
  if (engines) {
    const { node } = engines
    if (node && !satisfies(nodeVersion, node, true)) {
      return false
    }
  }
  if (wantOs && os && !checkList(wantOs, os)) return false
  if (wantArch && arch && !checkList(wantArch, arch)) return false
  return true
}

const versionOk = (
  packument: Packument,
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
    isBefore(time, version, before) &&
    platformCheck(mani, nodeVersion, os, arch)
  )
}

export const pickManifest = (
  packument: Packument,
  wanted: string | Range,
  opts: PickManifestOptions = {},
): Manifest | undefined => {
  const {
    defaultTag = 'latest',
    before,
    nodeVersion,
    os = process.platform,
    arch = process.arch,
  } = opts
  const nv =
    !nodeVersion ? parsedNodeVersion : Version.parse(nodeVersion)

  const {
    name,
    time: verTimes,
    versions = {},
    'dist-tags': distTags = {},
  } = packument

  const time = before && verTimes ? +new Date(before) : Infinity
  const spec = Spec.parse(`${name}@${wanted}`)
  let { range } = spec

  if (!range && !spec.distTag) {
    throw new Error(
      'Only dist-tag or semver range specs are supported',
    )
  }

  // if there is an explicit dist tag, we must get that version.
  if (spec.distTag && !range) {
    const ver = distTags[spec.distTag]
    if (!ver) return undefined
    // if the version in the dist-tags is before the before date, then
    // we use that.  Otherwise, we get the highest precedence version
    // prior to the dist-tag.
    if (versionOk(packument, ver, nv, os, arch, time)) {
      return versions[ver]
    } else {
      return pickManifest(packument, `<=${ver}`, opts)
    }
  }

  /* c8 ignore next - for TS's benefit */
  if (!range) return undefined

  if (range.isAny) range = new Range('*', true)

  // if the range is *, then we prefer the 'latest' if available
  // but skip this if it should be avoided, in that case we have
  // to try a little harder.
  const defaultVer = distTags[defaultTag]
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
    mani: Manifest
  }
  let found: ManiCheck | undefined = undefined
  let foundIsDefTag: boolean = false

  for (const [ver, mani] of entries) {
    if (!isBefore(verTimes, ver, time)) {
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
    }
    else if (mc.deprecated !== found.deprecated) {
      if (!mc.deprecated) {
        found = mc
        /* c8 ignore next */
        foundIsDefTag = !!defTagVersion?.equals(mc.version)
      }
    }
    else if (found.prerelease !== mc.prerelease) {
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
