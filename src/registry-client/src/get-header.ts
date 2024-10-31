const isIterable = <T>(o: unknown): o is Iterable<T> =>
  !!o && typeof o === 'object' && Symbol.iterator in o

export const getHeader = (
  headers:
    | Iterable<[string, string[] | string | undefined]>
    | Record<string, string[] | string | undefined>
    | string[]
    | null
    | undefined,
  key: string,
): string[] | string | undefined => {
  if (!headers) return undefined
  key = key.toLowerCase()
  if (Array.isArray(headers)) {
    if (!headers.length) return undefined
    if (Array.isArray(headers[0])) {
      // [string,HeaderValue][]
      for (const [k, v] of headers as unknown as [
        string,
        string[] | string,
      ][]) {
        if (k.toLowerCase() === key) return v
      }
    } else if (headers.length % 2 === 0) {
      // [k, v, k2, v2, ...]
      for (let i = 0; i < headers.length; i += 2) {
        if (headers[i]?.toLowerCase() === key) return headers[i + 1]
      }
    }
  } else if (
    isIterable<[string, string[] | string | undefined]>(headers)
  ) {
    for (const [k, v] of headers) {
      if (k.toLowerCase() === key) return v
    }
  } else {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === key) return v
    }
  }
}
