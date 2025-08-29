import {
  getDecodedValue,
  getEncondedValue,
} from './string-encoding.ts'

/**
 * Give it a key, and it'll return the value of that header as a Uint8Array
 */
export const getRawHeader = (
  headers: Uint8Array[],
  key: string,
): Uint8Array | undefined => {
  const k = key.toLowerCase()
  for (let i = 0; i < headers.length; i += 2) {
    const name = headers[i]
    if (
      name &&
      name.length === key.length &&
      getDecodedValue(name).toLowerCase() === k
    ) {
      return headers[i + 1]
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
