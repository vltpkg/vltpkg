import t from 'tap'
import {
  nonEmptyList,
  isNonEmptyList,
} from '../src/non-empty-list.ts'

t.equal(isNonEmptyList([]), false)
t.equal(isNonEmptyList([1]), true)
t.equal(isNonEmptyList([1, 2]), true)
t.equal(nonEmptyList([]), undefined)
t.strictSame(nonEmptyList([1]), [1])
t.strictSame(nonEmptyList([1, 2]), [1, 2])
