import { isIterable } from './is-iterable.ts'

export const deleteHeader = <
  H extends
    | [string, string[] | string][]
    | Iterable<[string, string[] | string | undefined]>
    | Record<string, string[] | string | undefined>
    | string[],
>(
  headers: H | null | undefined,
  key: string,
): H => {
  if (!headers) return {} as H
  const lk = key.toLowerCase()
  if (Array.isArray(headers)) {
    if (!headers.length) return headers
    // remove every match, not just the first
    const step = Array.isArray(headers[0]) ? 1 : 2
    for (let i = 0; i < headers.length;) {
      const h = headers[i] as [string, string] | string
      const k = Array.isArray(h) ? h[0] : h
      if (k.toLowerCase() === lk) headers.splice(i, step)
      else i += step
    }
    return headers
  } else if (
    isIterable<[string, string[] | string | undefined]>(headers)
  ) {
    return deleteHeader([...headers] as unknown as H, key)
  } else {
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === lk) delete headers[k]
    }
    return headers
  }
}
