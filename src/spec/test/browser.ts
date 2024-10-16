import t from 'tap'
import { Spec } from '../src/browser.js'

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
    custom: 'https://example.com',
  },
}

const gitOptions = {
  'git-hosts': {
    example: 'git+ssh://git@example.com/$1/$2.git',
  },
  'git-host-archives': {
    example: 'https://example.com/$1/$2/archive/$committish.tar.gz',
  },
}

const arr = [
  ['foo', '', 'registry'],
  ['foo', '1.2', 'registry'],
  ['foo', '~1.2', 'registry'],
  ['@foo/bar', '*', 'registry'],
  ['@foo/bar', '', ' registry'],
  ['@foo/bar', 'baz', 'registry'],
  ['foo', 'latest', 'registry'],
  ['foo', ' 1.2 ', 'registry'],
  ['x', 'f fo o al/ a d s ;f', 'registry'],
  ['foo', 'npm:bar@', 'registry'],
  ['x', 'git+ssh://git@notgithub.com/user/foo#1.2.3', 'git'],
  ['x', 'user/foo#semver:^1.2.3', 'git'],
  ['x', './foo', 'file'],
  ['x', 'file:path/to/foo', 'file'],
  ['foo', 'bar/foo', 'file'],
  ['x', 'workspace:*', 'workspace'],
] as [string, string, Spec['type']][]

arr.forEach(([n, b, ty]) => {
  const { spec, name, bareSpec, type } = Spec.fromLockfileInfo(
    n,
    b,
    ty,
    specOptions,
  )
  t.matchSnapshot(
    { spec, name, bareSpec, type },
    `spec ${spec} of type ${type}`,
  )
})

const { spec, name, bareSpec, type, options } = Spec.fromLockfileInfo(
  'foo',
  'example:foo/bar',
  'git',
  gitOptions,
)
t.matchSnapshot(
  { spec, name, bareSpec, type, options },
  `spec ${spec} of type ${type} with git options`,
)
