import t from 'tap'
import { isCacheable } from '../src/is-cacheable.ts'

t.equal(isCacheable(200), true)
t.equal(isCacheable(299), true)
t.equal(isCacheable(199), false)
t.equal(isCacheable(302), false)
t.equal(isCacheable(303), false)
t.equal(isCacheable(308), true)
t.equal(isCacheable(399), false)
t.equal(isCacheable(301), true)
t.equal(isCacheable(400), false)
t.equal(isCacheable(410), true)
t.equal(isCacheable(420), false)
t.equal(isCacheable(5234), false)
