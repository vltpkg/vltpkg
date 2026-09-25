import { resolve } from 'node:path'
import t from 'tap'
import { storeRoot } from '../src/store-root.ts'

t.equal(storeRoot('/c'), resolve('/c/store/v1'))
