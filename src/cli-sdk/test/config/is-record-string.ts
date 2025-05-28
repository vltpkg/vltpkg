import t from 'tap'
import { isRecordString } from '../../src/config/is-record-string-string.ts'

t.throws(() => isRecordString(undefined))
t.throws(() => isRecordString({ a: 1 }))
t.throws(() => isRecordString(['a']))
isRecordString({ a: 'a' })
