import { error } from '@vltpkg/error-cause'
import { isRecordString } from './is-record-string-string.ts'

export const isRecordRecord: (r: unknown) => void = (
  r: unknown,
): asserts r is Record<string, Record<string, string>> => {
  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    throw error('Invalid record record', {
      found: r,
      wanted: 'Record<string, Record<string, string>>',
    })
  }
  for (const v of Object.values(r)) {
    try {
      isRecordString(v)
    } catch {
      throw error('Invalid record record', {
        found: r,
        wanted: 'Record<string, Record<string, string>>',
      })
    }
  }
}
