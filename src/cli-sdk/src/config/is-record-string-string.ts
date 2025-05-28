import { error } from '@vltpkg/error-cause'

export const isRecordString: (r: unknown) => void = (
  r: unknown,
): asserts r is Record<string, string> => {
  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    throw error('Invalid string record', {
      found: r,
      wanted: 'Record<string, string>',
    })
  }
  for (const v of Object.values(r)) {
    if (typeof v !== 'string') {
      throw error('Invalid string record', {
        found: r,
        wanted: 'Record<string, string>',
      })
    }
  }
}
