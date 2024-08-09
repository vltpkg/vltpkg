/**
 * Given a rawHeaders array of [key, value, key2, value2, ...],
 * overwrite the current value of a header, or if not found, append
 */
export const setRawHeader = (
  headers: Buffer[],
  key: string,
  value: Buffer | string,
) => {
  key = key.toLowerCase()
  const keyBuf = Buffer.from(key)
  const valBuf = Buffer.isBuffer(value) ? value : Buffer.from(value)
  for (let i = 0; i < headers.length; i += 2) {
    const k = headers[i]
    if (
      k &&
      k.length === keyBuf.length &&
      String(k).toLowerCase() === key
    ) {
      headers[i + 1] = valBuf
      return
    }
  }
  headers.push(keyBuf, valBuf)
}
