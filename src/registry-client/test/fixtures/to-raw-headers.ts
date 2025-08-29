const encoder = new TextEncoder()
export const toRawHeaders = (
  h: Record<string, string>,
): Uint8Array[] => {
  const r: Uint8Array[] = []
  for (const [k, v] of Object.entries(h)) {
    r.push(encoder.encode(k), encoder.encode(v))
  }
  return r
}
