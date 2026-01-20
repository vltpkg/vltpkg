import { Spec } from '@vltpkg/spec'
import t from 'tap'
import { inferName } from '../src/infer-name.ts'

t.match(
  inferName('github:a/b#main', {}),
  Spec.parse('github-a+b-main', 'github:a/b#main'),
)
t.match(
  inferName(Spec.parseArgs('github:a/b#main'), {}),
  Spec.parse('github-a+b-main', 'github:a/b#main'),
)
t.match(
  inferName(Spec.parseArgs('a@1.2.3'), {}),
  Spec.parse('a', '1.2.3'),
)
