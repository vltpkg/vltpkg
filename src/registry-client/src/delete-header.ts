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
  if (Array.isArray(headers)) {
    if (!headers.length) return headers
    if (Array.isArray(headers[0])) {
      const index = (headers as [string, string][]).findIndex(
        ([k]) => k.toLowerCase() === key.toLowerCase(),
      )
      if (index !== -1) headers.splice(index, 1)
    } else {
      const h = headers as string[]
      for (let i = 0; i < h.length; i += 2) {
        if (h[i]?.toLowerCase() === key.toLowerCase()) {
          headers.splice(i, 2)
          break
        }
      }
    }
    return headers
  } else if (
    isIterable<[string, string[] | string | undefined]>(headers)
  ) {
    return deleteHeader([...headers] as unknown as H, key)
  } else {
    delete headers[key]
    return headers
  }
}
