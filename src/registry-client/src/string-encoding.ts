const decoder = new TextDecoder()

/**
 * Decodes a string from a Uint8Array
 */
export const getDecodedValue = (
  value: string | Uint8Array | undefined,
): string => {
  if (value == undefined) return ''
  if (typeof value === 'string') return value
  const res = decoder.decode(value)
  return res
}

/**
 * Encodes a string to a Uint8Array
 */
export const getEncondedValue = (
  value: Uint8Array | string | undefined,
): Uint8Array => {
  if (value == undefined) return new Uint8Array(0)
  if (typeof value === 'string') {
    const res = Buffer.from(value)
    return res
  }
  return value
}
