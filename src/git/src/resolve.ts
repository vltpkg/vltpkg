import { type RevDoc } from '@vltpkg/types'
import { pickManifest } from '@vltpkg/pick-manifest'
import { type GitOptions } from './index.js'
import { revs } from './revs.js'

/**
 * Given a repo and either a ref or a git specifier Spec object, resolve the
 * appropriate ref that we should clone, ideally witout actually cloning the
 * repository.
 *
 *
 */
export const resolve = async (
  repo: string,
  ref = 'HEAD',
  opts: GitOptions = {},
) => {
  const revDoc = await revs(repo, opts)
  /* no resolution possible if we can't read the repo */
  if (!revDoc) return undefined
  return resolveRef(revDoc, ref, opts)
}

/**
 * Given a repo's RevDoc object and either a ref or a git specifier Spec
 * object, resolve the appropriate ref that we should clone, witout actually
 * cloning the repository.
 */
export const resolveRef = (
  revDoc: RevDoc,
  ref = 'HEAD',
  opts: GitOptions = {},
) => {
  const { spec } = opts
  ref = spec?.gitCommittish || ref
  if (spec?.range) {
    return pickManifest(revDoc, spec.range, opts)
  }
  if (!ref) {
    return revDoc.refs.HEAD
  }
  if (revDoc.refs[ref]) {
    return revDoc.refs[ref]
  }
  /* c8 ignore start - typically found above, but just in case */
  const sha = revDoc.shas[ref]?.[0]
  if (sha) {
    return revDoc.refs[sha]
  }
  /* c8 ignore stop */
  return undefined
}
