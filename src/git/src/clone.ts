// The goal here is to minimize both git workload and
// the number of refs we download over the network.
//
// Every method ends up with the checked out working dir
// at the specified ref, and resolves with the git sha.

import type { RevDoc, RevDocEntry } from '@vltpkg/types'
import { gitScpURL } from '@vltpkg/git-scp-url'
import { mkdir, rm, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GitOptions } from './index.ts'
import { isWindows } from './is-windows.ts'
import { resolveRef } from './resolve.ts'
import { revs as getRevs } from './revs.ts'
import { spawn } from './spawn.ts'

/**
 * Only these whitelisted hosts get shallow cloning. Many hosts (including GHE)
 * don't always support it. A failed shallow fetch takes a LOT longer than a
 * full fetch in most cases, so we skip it entirely. Set opts.gitShallow =
 * true/false to force this behavior one way or the other.
 *
 * If other hosts are added to this set, then they will be shallowly cloned
 * as well.
 */
export const shallowHosts = new Set([
  'github.com',
  'gist.github.com',
  'gitlab.com',
  'bitbucket.com',
  'bitbucket.org',
])

export const clone = async (
  repo: string,
  ref = 'HEAD',
  target?: string,
  opts: GitOptions = {},
) => {
  repo = String(gitScpURL(repo) ?? repo).replace(/^git\+/, '')
  if (repo.startsWith('file://')) repo = fileURLToPath(repo)
  target ||= defaultTarget(repo, opts.cwd)
  // a commit: fetch exactly it, never the ref that is at it now
  const sha = opts.spec?.gitCommittish || ref
  if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sha)) {
    return await commit(repo, sha, target, opts)
  }
  const revs = await getRevs(repo, opts)
  return await clone_(
    repo,
    revs,
    ref,
    revs && resolveRef(revs, ref, opts),
    target,
    opts,
  )
}

const maybeShallow = (repo: string, opts: GitOptions) => {
  if (opts['git-shallow'] === false || opts['git-shallow']) {
    return opts['git-shallow']
  }
  const host = gitScpURL(repo)?.host ?? ''
  return shallowHosts.has(host)
}

const defaultTarget = (
  repo: string,
  /* c8 ignore next */ cwd = process.cwd(),
) => resolve(cwd, basename(repo.replace(/[/\\]?\.git$/, '')))

const clone_ = (
  repo: string,
  revs: RevDoc | undefined,
  ref: string,
  revDoc: RevDocEntry | undefined,
  target: string,
  opts: GitOptions,
) => {
  if (!revDoc || !revs) {
    return unresolved(repo, ref, target, opts)
  }
  if (revDoc.sha === revs.refs.HEAD?.sha) {
    return plain(repo, revDoc, target, opts)
  }
  if (revDoc.type === 'tag' || revDoc.type === 'branch') {
    return branch(repo, revDoc, target, opts)
  }
  return other(repo, revDoc, target, opts)
}

// a commit by sha. A host that only serves advertised commits (git
// protocol v0) gets the full clone.
const commit = async (
  repo: string,
  sha: string,
  target: string,
  opts: GitOptions,
) => {
  try {
    await fetchRef(repo, sha, target, opts)
  } catch {
    await rm(resolve(target, '.git'), {
      recursive: true,
      force: true,
    })
    return await unresolved(repo, sha, target, opts)
  }
  return await checkout(sha, target, opts)
}

// pull request or some other kind of advertised ref
const other = async (
  repo: string,
  revDoc: RevDocEntry,
  target: string,
  opts: GitOptions,
) => {
  await fetchRef(repo, revDoc.rawRef, target, opts)
  return await checkout(revDoc.sha, target, opts)
}

const fetchRef = async (
  repo: string,
  ref: string,
  target: string,
  opts: GitOptions,
) => {
  const shallow = maybeShallow(repo, opts)

  const fetchOrigin = ['fetch', 'origin', ref].concat(
    shallow ? ['--depth=1'] : [],
  )

  const git = (args: string[]) =>
    spawn(args, { ...opts, cwd: target })
  await mkdir(target, { recursive: true })
  await git(['init'])
  if (isWindows(opts)) {
    await git([
      'config',
      '--local',
      '--add',
      'core.longpaths',
      'true',
    ])
  }
  await git(['remote', 'add', 'origin', repo])
  await git(fetchOrigin)
}

const checkout = async (
  sha: string,
  target: string,
  opts: GitOptions,
) => {
  await spawn(['checkout', sha], { ...opts, cwd: target })
  await updateSubmodules(target, opts)
  return sha
}

// tag or branches.  use -b
const branch = async (
  repo: string,
  revDoc: RevDocEntry,
  target: string,
  opts: GitOptions,
) => {
  const args = [
    'clone',
    '-b',
    revDoc.ref,
    repo,
    target,
    '--recurse-submodules',
  ]
  if (maybeShallow(repo, opts)) {
    args.push('--depth=1')
  }
  if (isWindows(opts)) {
    args.push('--config', 'core.longpaths=true')
  }
  await spawn(args, opts)
  return revDoc.sha
}

// just the head.  clone it
const plain = async (
  repo: string,
  revDoc: RevDocEntry,
  target: string,
  opts: GitOptions,
) => {
  const args = ['clone', repo, target, '--recurse-submodules']
  if (maybeShallow(repo, opts)) {
    args.push('--depth=1')
  }
  if (isWindows(opts)) {
    args.push('--config', 'core.longpaths=true')
  }
  await spawn(args, opts)
  return revDoc.sha
}

const updateSubmodules = async (target: string, opts: GitOptions) => {
  const hasSubmodules = await stat(`${target}/.gitmodules`)
    .then(() => true)
    .catch(() => false)
  if (!hasSubmodules) {
    return
  }
  await spawn(
    ['submodule', 'update', '-q', '--init', '--recursive'],
    { ...opts, cwd: target },
  )
}

const unresolved = async (
  repo: string,
  ref: string,
  target: string,
  opts: GitOptions,
) => {
  // can't do this one shallowly, because the ref isn't advertised
  // but we can avoid checking out the working dir twice, at least
  const lp =
    isWindows(opts) ? ['--config', 'core.longpaths=true'] : []
  const cloneArgs = [
    'clone',
    '--mirror',
    '-q',
    repo,
    target + '/.git',
  ]
  const git = (args: string[]) =>
    spawn(args, { ...opts, cwd: target })
  await mkdir(target, { recursive: true })
  await git(cloneArgs.concat(lp))
  await git(['init'])
  await git(['checkout', ref])
  await updateSubmodules(target, opts)
  const result = await git(['rev-parse', '--revs-only', 'HEAD'])
  return result.stdout
}
