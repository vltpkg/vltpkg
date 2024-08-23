import t from 'tap'
import { Spec } from '../src/browser.js'

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
  const { spec, name, bareSpec, type } = Spec.parse(n, b, ty)
  t.matchSnapshot(
    { spec, name, bareSpec, type },
    `spec ${spec} of type ${type}`,
  )
})
