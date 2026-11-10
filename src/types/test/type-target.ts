import t from 'tap'
import { getTypeTarget } from '../src/type-target.ts'

t.test('DefinitelyTyped target names', t => {
  for (const name of [
    undefined,
    null,
    '',
    'react',
    '@other/react',
    '@types/',
    '@types/a/b',
    '@types/__name',
    '@types/scope__',
  ]) {
    t.equal(getTypeTarget(name), undefined, String(name))
  }
  t.equal(getTypeTarget('@types/react'), 'react')
  t.equal(getTypeTarget('@types/scope__name'), '@scope/name')
  t.equal(
    getTypeTarget('@types/scope__some__name'),
    '@scope/some__name',
  )
  t.end()
})
