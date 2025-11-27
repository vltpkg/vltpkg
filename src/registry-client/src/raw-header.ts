import {
  getDecodedValue,
  getEncondedValue,
} from './string-encoding.ts'

const textEncoder = new TextEncoder()

/**
 * Give it a key, and it'll return the value of that header as a Uint8Array
 * Uses byte-level comparison to avoid string decoding overhead.
 */
export const getRawHeader = (
  headers: Uint8Array[],
  key: string,
): Uint8Array | undefined => {
  const keyBytes = textEncoder.encode(key.toLowerCase())
  for (let i = 0; i < headers.length; i += 2) {
    const name = headers[i]
    if (name && name.length === keyBytes.length) {
      let match = true
      for (let j = 0; j < keyBytes.length; j++) {
        // Case-insensitive byte comparison
        const nb = name[j]
        const kb = keyBytes[j]
        // nb/kb undefined check unreachable due to length validation above
        /* c8 ignore next */
        if (nb === undefined || kb === undefined || (nb | 0x20) !== kb) {
          match = false
          break
        }
      }
      if (match) return headers[i + 1]
    }
  }
}

/**
 * Give it a key and value, and it'll overwrite or add the header entry
 */
export const setRawHeader = (
  headers: Uint8Array[],
  key: string,
  value: Uint8Array | string,
): Uint8Array[] => {
  const k = key.toLowerCase()
  const encVal =
    typeof value === 'string' ? getEncondedValue(value) : value
  for (let i = 0; i < headers.length; i += 2) {
    const name = headers[i]
    if (
      name &&
      name.length === k.length &&
      getDecodedValue(name).toLowerCase() === k
    ) {
      return [
        ...headers.slice(0, i + 1),
        encVal,
        ...headers.slice(i + 2),
      ]
    }
  }
  return [...headers, getEncondedValue(k), encVal]
}
