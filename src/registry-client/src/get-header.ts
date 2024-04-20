const isIterable = <T>(o: any): o is Iterable<T> =>
  !!o && !!o[Symbol.iterator]

export const getHeader = (
  headers:
    | string[]
    | Record<string, string | string[] | undefined>
    | Iterable<[string, string | string[] | undefined]>
    | null
    | undefined,
  key: string,
): string | string[] | undefined => {
  if (!headers) return undefined
  key = key.toLowerCase()
  if (Array.isArray(headers)) {
    if (!headers.length) return undefined
    if (Array.isArray(headers[0])) {
      // [string,HeaderValue][]
      for (const [k, v] of headers as unknown as [
        string,
        string | string[],
      ][]) {
        if (k.toLowerCase() === key) return v
      }
      return undefined
    } else {
      // [k, v, k2, v2, ...]
      for (let i = 0; i < headers.length; i += 2) {
        if (headers[i]?.toLowerCase() === key) return headers[i + 1]
      }
    }
  } else if (
    isIterable<[string, string | string[] | undefined]>(headers)
  ) {
    for (const [k, v] of headers) {
      if (k.toLowerCase() === key) return v
    }
    return undefined
  } else {
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === key) return v
    }
  }
}
