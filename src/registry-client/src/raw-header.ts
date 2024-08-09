/**
 * Give it a key, and it'll return the buffer of that header value
 */
export const getRawHeader = (headers: Buffer[], k: string) => {
  k = k.toLowerCase()
  for (let i = 0; i < headers.length; i += 2) {
    const name = headers[i]
    if (
      name &&
      name.length === k.length &&
      name.toString().toLowerCase() === k
    ) {
      return headers[i + 1]
    }
  }
}

/**
 * Give it a key and value, and it'll overwrite or add the header entry
 */
export const setRawHeader = (
  headers: Buffer[],
  k: string,
  v: Buffer | string,
): Buffer[] => {
  k = k.toLowerCase()
  const value = typeof v === 'string' ? Buffer.from(v) : v
  for (let i = 0; i < headers.length; i += 2) {
    const name = headers[i]
    if (
      name &&
      name.length === k.length &&
      name.toString().toLowerCase() === k
    ) {
      return [
        ...headers.slice(0, i + 1),
        value,
        ...headers.slice(i + 2),
      ]
    }
  }
  return [...headers, Buffer.from(k), value]
}
