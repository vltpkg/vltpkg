import { Spec } from '@vltpkg/spec'
import fs from 'fs'
import t from 'tap'
import { pathToFileURL } from 'url'
import { resolve, resolveRef } from '../src/resolve.js'
import { revs } from '../src/revs.js'
import { spawn } from '../src/spawn.js'

t.cleanSnapshot = s => s.replace(/"[0-9a-f]{40}"/g, '"{SHA}"')
const repo = t.testdir()
const git = (...cmd: string[]) => spawn(cmd, { cwd: repo })
let mainBranch = 'main'
const fixMainBranch = (err: Error & { status: number }) => {
  if (err.status !== 129) {
    throw err
  }
  const oldMainBranch = 'master'
  const fixedRefs: Record<string, any> = {}
  for (const index of Object.keys(expect.refs)) {
    if (index === mainBranch) {
      fixedRefs[oldMainBranch] = expect.refs[index]
      fixedRefs[oldMainBranch].ref = oldMainBranch
    } else {
      fixedRefs[index] = expect.refs[index]
    }
  }
  //@ts-expect-error
  expect.refs = fixedRefs
  mainBranch = oldMainBranch
  return git('init')
}
const write = (f: string, c: string) =>
  fs.writeFileSync(`${repo}/${f}`, c)
t.test('setup', () =>
  git('init', '-b', mainBranch)
    .catch(fixMainBranch)
    .then(() => git('config', 'user.name', 'pacotedev'))
    .then(() => git('config', 'user.email', 'i+pacotedev@izs.me'))
    .then(() => git('config', 'tag.gpgSign', 'false'))
    .then(() => git('config', 'commit.gpgSign', 'false'))
    .then(() => git('config', 'tag.forceSignAnnotated', 'false'))
    .then(() => write('foo', 'bar'))
    .then(() => git('add', 'foo'))
    .then(() => git('commit', '-m', 'foobar'))
    .then(() => git('tag', '-a', 'asdf', '-m', 'asdf'))
    .then(() => write('bar', 'foo'))
    .then(() => git('add', 'bar'))
    .then(() => git('commit', '-m', 'barfoo'))
    .then(() => git('tag', '-a', 'quux', '-m', 'quux'))
    .then(() => write('bob', 'obo'))
    .then(() => git('add', 'bob'))
    .then(() => git('commit', '-m', 'bob plays the obo'))
    .then(() => git('tag', '-am', 'version 1.2.3', 'version-1.2.3'))
    .then(() =>
      git('tag', '-am', 'too big', `69${Math.pow(2, 53)}.0.0`),
    )
    .then(() => write('gleep', 'glorp'))
    .then(() => git('add', 'gleep'))
    .then(() => git('commit', '-m', 'gleep glorp'))
    .then(() => git('tag', '-am', 'head version', '69.42.0')),
)

t.test('point latest at HEAD', t =>
  revs(repo).then(r =>
    t.same(r?.['dist-tags'], {
      HEAD: '69.42.0',
      latest: '69.42.0',
    }),
  ),
)

t.test('add a latest branch, point to 1.2.3 version', () =>
  git('checkout', '-b', 'latest')
    .then(() => git('reset', '--hard', 'version-1.2.3'))
    .then(() => git('checkout', mainBranch)),
)

// sharing is caring
const shaRE = /^[0-9a-f]{40}$/
const expect = {
  versions: {
    '1.2.3': {
      sha: shaRE,
      ref: 'version-1.2.3',
      type: 'tag',
    },
  },
  'dist-tags': {
    latest: '1.2.3',
    HEAD: '69.42.0',
  },
  refs: {
    latest: {
      sha: shaRE,
      ref: 'latest',
      type: 'branch',
    },
    [mainBranch]: {
      sha: shaRE,
      ref: mainBranch,
      type: 'branch',
    },
    '699007199254740992.0.0': {
      sha: shaRE,
      ref: '699007199254740992.0.0',
      type: 'tag',
    },
    asdf: {
      sha: shaRE,
      ref: 'asdf',
      type: 'tag',
    },
    quux: {
      sha: shaRE,
      ref: 'quux',
      type: 'tag',
    },
    'version-1.2.3': {
      sha: shaRE,
      ref: 'version-1.2.3',
      type: 'tag',
    },
  },
  shas: Object,
}

t.test('no revs if cannot read repo', async t => {
  const r = await resolve('https://localhost:80808/')
  t.equal(r, undefined)
})

t.test('resolve the revs', async t => {
  const revDoc = await revs(repo, { noGitRevCache: true })
  if (!revDoc) throw new Error('failed to load revs')
  const repoRemote = pathToFileURL(repo).toString() + '/.git'

  const head = await resolve(repo)
  const headRef = resolveRef(revDoc, 'HEAD')
  const emptyHead = await resolve(repo, '')
  const emptyHeadRef = resolveRef(revDoc, '')
  const tagName = await resolve(repo, 'quux', {})
  const tagNameRef = resolveRef(revDoc, 'quux', {})
  const version = await resolve(repo, '', {
    spec: Spec.parse(`x@git+${repoRemote}#semver:1.x`),
  })
  const versionRef = resolveRef(revDoc, '', {
    spec: Spec.parse(`x@git+${repoRemote}#semver:1.x`),
  })
  t.equal(await resolve(repo, 'this is not found'), undefined)
  t.equal(resolveRef(revDoc, 'this is not found'), undefined)
  t.equal(head, headRef)
  t.equal(emptyHead, head)
  t.equal(emptyHeadRef, head)
  t.matchSnapshot(head, 'HEAD default')
  t.equal(tagName, tagNameRef)
  t.matchSnapshot(tagName, 'tag name')
  t.equal(version, versionRef)
  t.matchSnapshot(version, 'version range selector')
})
