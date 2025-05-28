import t from 'tap'
import { isRecordRecord } from '../../src/config/is-record-record.ts'

t.throws(() => isRecordRecord(undefined))
t.throws(() => isRecordRecord('a'))
t.throws(() => isRecordRecord(1))
t.throws(() => isRecordRecord(['a']))
t.throws(() => isRecordRecord([{ a: 'a' }]))
t.throws(() => isRecordRecord({ a: 1 }))
t.throws(() => isRecordRecord({ a: 'a' }))
isRecordRecord({ a: { a: 'a' } })
