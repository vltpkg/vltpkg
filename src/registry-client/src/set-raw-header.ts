import {
  getDecodedValue,
  getEncondedValue,
} from './string-encoding.ts'

/**
 * Given a rawHeaders array of [key, value, key2, value2, ...],
 * overwrite the current value of a header, or if not found, append
 */
export const setRawHeader = (
  headers: Uint8Array[],
  key: string,
  value: Uint8Array | string,
): Uint8Array[] => {
  key = key.toLowerCase()
  const keyBuf = getEncondedValue(key)
  const valBuf = getEncondedValue(value)
  for (let i = 0; i < headers.length; i += 2) {
    const k = headers[i]
    if (
      k?.length === keyBuf.length &&
      getDecodedValue(k).toLowerCase() === key
    ) {
      headers[i + 1] = valBuf
      return headers
    }
  }
  headers.push(keyBuf, valBuf)
  return headers
}
