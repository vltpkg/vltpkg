import type {
  ManifestMinified,
  PackumentMinified,
} from '@vltpkg/types'
import { parse } from '@vltpkg/semver'
import { error } from '@vltpkg/error-cause'

export type RefType = 'head' | 'branch' | 'tag' | 'pull' | 'other'

/**
 * A representation of a given remote ref in a {@link RevDoc} object.
 */
export type RevDocEntry = ManifestMinified & {
  version: string
  /** sha this references */
  sha: string
  /** ref as passed git locally */
  ref: string
  /** canonical full ref, like `refs/tags/blahblah` */
  rawRef: string
  /** what type of ref this is: 'branch', 'tag', etc. */
  type: RefType
}

/**
 * An object kind of resembling a packument, but about a git repo.
 */
export type RevDoc = PackumentMinified & {
  /** all semver-looking tags go in this record */
  versions: Record<string, RevDocEntry>
  /**
   * named refs like 'main' or 'HEAD'. 'latest' is added synthetically if
   * needed
   */
  'dist-tags': Record<string, string>
  /** all named things that can be cloned down remotely */
  refs: Record<string, RevDocEntry>
  /** all named shas referenced above */
  shas: Record<string, string[]>
}

/**
 * turn an array of lines from `git ls-remote` into a thing
 * vaguely resembling a packument, where docs are a resolved ref
 */
export const linesToRevs = (lines: string[]): RevDoc =>
  finish(
    lines.reduce(linesToRevsReducer, {
      name: '',
      versions: {},
      'dist-tags': {},
      refs: {},
      shas: {},
    }),
  )

const finish = (revs: RevDoc): RevDoc =>
  distTags(versions(shaList(peelTags(revs))))

const versions = (revs: RevDoc): RevDoc => {
  for (const [version, entry] of Object.entries(revs.versions)) {
    entry.version = version
  }
  return revs
}

// We can check out shallow clones on specific SHAs if we have a ref
const shaList = (revs: RevDoc): RevDoc => {
  Object.entries(revs.refs).forEach(([ref, doc]) => {
    const shas = revs.shas[doc.sha]
    if (!shas) {
      revs.shas[doc.sha] = [ref]
    } else {
      shas.push(ref)
    }
  })
  return revs
}

// Replace any tags with their ^{} counterparts, if those exist
const peelTags = (revs: RevDoc) => {
  Object.entries(revs.refs)
    .filter(([ref]) => ref.endsWith('^{}'))
    .forEach(([ref, peeled]) => {
      const unpeeled = revs.refs[ref.replace(/\^\{\}$/, '')]
      if (unpeeled) {
        unpeeled.sha = peeled.sha
        delete revs.refs[ref]
      }
    })
  return revs
}

const distTags = (revs: RevDoc) => {
  // not entirely sure what situations would result in an
  // ichabod repo, but best to be careful in Sleepy Hollow anyway
  /* c8 ignore start */
  const HEAD = revs.refs.HEAD || {
    sha: undefined,
  }
  /* c8 ignore stop */
  for (const [v, ver] of Object.entries(revs.versions)) {
    // simulate a dist-tags with latest pointing at the
    // 'latest' branch if one exists and is a version,
    // or HEAD if not.
    if (revs.refs.latest && ver.sha === revs.refs.latest.sha) {
      revs['dist-tags'].latest = v
    } else if (ver.sha === HEAD.sha) {
      revs['dist-tags'].HEAD = v
      if (!revs.refs.latest) {
        revs['dist-tags'].latest = v
      }
    }
  }
  return revs
}

const refType = (ref: string): RefType => {
  if (ref.startsWith('refs/tags/')) {
    return 'tag'
  }
  if (ref.startsWith('refs/heads/')) {
    return 'branch'
  }
  if (ref.startsWith('refs/pull/')) {
    return 'pull'
  }
  if (ref === 'HEAD') {
    return 'head'
  }
  // Could be anything, ignore for now
  /* c8 ignore next */
  return 'other'
}

// return the doc, or null if we should ignore it.
const lineToRevDoc = (line: string): RevDocEntry | undefined => {
  let [sha, rawRef] = line.trim().split(/\s+/, 2)
  if (sha === undefined || rawRef === undefined) return undefined
  sha = sha.trim()
  rawRef = rawRef.trim()

  const type = refType(rawRef)

  switch (type) {
    case 'tag': {
      // refs/tags/foo^{} is the 'peeled tag', ie the commit
      // that is tagged by refs/tags/foo they resolve to the same
      // content, just different objects in git's data structure.
      // But, we care about the thing the tag POINTS to, not the tag
      // object itself, so we only look at the peeled tag refs, and
      // ignore the pointer.
      // For now, though, we have to save both, because some tags
      // don't have peels, if they were not annotated.
      const ref = rawRef.slice('refs/tags/'.length)
      return { name: '', version: '', sha, ref, rawRef, type }
    }

    case 'branch': {
      const ref = rawRef.slice('refs/heads/'.length)
      return { name: '', version: '', sha, ref, rawRef, type }
    }

    case 'pull': {
      // NB: merged pull requests installable with #pull/123/merge
      // for the merged pr, or #pull/123 for the PR head
      const ref = rawRef.slice('refs/'.length).replace(/\/head$/, '')
      return { name: '', version: '', sha, ref, rawRef, type }
    }

    case 'head': {
      const ref = 'HEAD'
      return { name: '', version: '', sha, ref, rawRef, type }
    }

    default:
      // at this point, all we can do is leave the ref un-munged
      return { name: '', version: '', sha, ref: rawRef, rawRef, type }
  }
}

const linesToRevsReducer = (revs: RevDoc, line: string) => {
  const doc = lineToRevDoc(line)

  if (!doc) {
    return revs
  }

  revs.refs[doc.ref] = doc
  revs.refs[doc.rawRef] = doc

  if (doc.type === 'tag') {
    // try to pull a semver value out of tags like `release-v1.2.3`
    // which is a pretty common pattern.
    const match =
      doc.ref.endsWith('^{}') ?
        null
      : doc.ref.match(/v?(\d+\.\d+\.\d+(?:[-+].+)?)$/)
    if (match) {
      /* c8 ignore start */
      if (!match[1])
        throw error(`invalid semver tag`, { found: doc.ref })
      /* c8 ignore stop */
      const v = parse(match[1])
      if (v) revs.versions[String(v)] = doc
    }
  }

  return revs
}
