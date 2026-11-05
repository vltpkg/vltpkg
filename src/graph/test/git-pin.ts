import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { gitPinMoved, gitPinned } from '../src/git-pin.ts'

t.test('gitPinMoved', async t => {
  const sha1 = 'a'.repeat(40)
  const sha2 = 'b'.repeat(64)
  const remote = 'git+https://host/o/r.git'
  const archive = 'https://host/o/r/archive/'
  // a 40-hex token in the url, not a commit
  const token = `git+https://u:${sha1}@host/o/r.git`
  for (const [a, b, moved, name] of [
    [
      { integrity: 'sha512-a' },
      { integrity: 'sha512-a' },
      false,
      'same integrity',
    ],
    [
      { integrity: 'sha512-a', resolved: `${remote}#${sha1}` },
      { integrity: 'sha512-b', resolved: `${remote}#${sha1}` },
      true,
      'integrity wins',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      { resolved: `${remote}#${sha1}::path:x` },
      false,
      'same sha',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      { resolved: `${remote}#${sha2}` },
      true,
      'other sha',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      { resolved: remote },
      true,
      'remote only',
    ],
    [
      { resolved: 'github:o/r' },
      { resolved: `${remote}#${sha1}` },
      true,
      'remote only, both ways',
    ],
    [
      { resolved: `${remote}#${sha1}` },
      {},
      false,
      'not resolved yet',
    ],
    [
      { resolved: archive + sha1 },
      { resolved: archive + 'main' },
      false,
      'archive read from node_modules',
    ],
    [
      { resolved: remote },
      { resolved: remote },
      false,
      'no sha at all',
    ],
    [
      { resolved: token },
      { resolved: `${token}#${sha1}` },
      true,
      'token, remote only',
    ],
    [
      { resolved: token },
      { resolved: remote },
      false,
      'token, no sha',
    ],
    [
      { resolved: `${token}#${sha2}::path:${sha1}` },
      { resolved: `${token}#${sha2}` },
      false,
      'token, hex path dir',
    ],
    [
      { resolved: `${remote}#${sha1}-x` },
      { resolved: `${remote}#${sha1}` },
      true,
      'ref starting w/ 40 hex',
    ],
  ] as const) {
    t.equal(gitPinMoved(a, b), moved, name)
  }
})

t.test('gitPinned', async t => {
  const sha = 'a'.repeat(40)
  const git = (remote: string, sel: string) =>
    joinDepIDTuple(['git', remote, sel])
  const gh = git('github:o/r', 'main')
  const clone = git('git+https://host/o/r.git', 'main')
  // a 40-hex token is not a commit
  const tokenRemote = `git+https://u:${'c'.repeat(40)}@host/o/r.git`
  const tokenClone = git(tokenRemote, 'main')
  for (const [id, resolved, pinned, name] of [
    [gh, 'github:o/r', false, 'github: shorthand'],
    [
      gh,
      'https://api.github.com/repos/o/r/tarball/main',
      false,
      'ref url',
    ],
    [
      gh,
      `https://codeload.github.com/o/r/legacy.tar.gz/${sha}`,
      true,
      'sha url',
    ],
    [
      gh,
      `https://gitlab.com/api/v4/projects/o%2Fr/repository/archive.tar.gz?sha=${sha}`,
      true,
      'sha query',
    ],
    [
      gh,
      'https://codeload.github.com/o/r/legacy.tar.gz/main',
      false,
      'codeload ref url',
    ],
    [
      gh,
      'https://gitlab.com/api/v4/projects/o%2Fr/repository/archive.tar.gz?sha=main',
      false,
      'ref query',
    ],
    [
      gh,
      'https://bitbucket.org/o/r/get/main.tar.gz',
      false,
      'bitbucket ref url',
    ],
    [
      gh,
      `https://bitbucket.org/o/r/get/${sha}.tar.gz`,
      true,
      'bitbucket sha url',
    ],
    [gh, undefined, false, 'no resolved'],
    [
      git('github:o/r', ''),
      `git+ssh://git@github.com:o/r.git#${sha}`,
      true,
      'no ref, ssh pin',
    ],
    [git('github:o/r', ''), 'github:o/r', false, 'no ref'],
    [
      git('git+https://host/o/r.git', 'semver:^1'),
      'git+https://host/o/r.git',
      false,
      'semver, remote only',
    ],
    [
      git('git+https://host/o/r.git', 'main::path:x'),
      'git+https://host/o/r.git',
      false,
      'path, remote only',
    ],
    [git('github:o/r', sha), 'github:o/r', true, 'ref is a sha'],
    [
      git('github:o/r', `${sha}::path:x`),
      'github:o/r',
      true,
      'sha ref, path',
    ],
    [
      git('github:o/r', 'a'.repeat(39)),
      'github:o/r',
      false,
      'short sha ref',
    ],
    [clone, 'git+https://host/o/r.git', false, 'remote only'],
    [clone, `git+https://host/o/r.git#${sha}`, true, 'remote#sha'],
    [
      git('git+https://host/o/r.git', 'semver:^1'),
      `git+https://host/o/r.git#${sha}::path:x`,
      true,
      'sha, path',
    ],
    [tokenClone, tokenRemote, false, 'token remote, no sha'],
    [tokenClone, `${tokenRemote}#${sha}`, true, 'token remote#sha'],
  ] as const) {
    t.equal(gitPinned({ id, resolved }), pinned, name)
  }
})
