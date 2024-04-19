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
