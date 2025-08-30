export const toRawHeaders = (
  h: Record<string, string>,
): Uint8Array[] => {
  const r: Uint8Array[] = []
  for (const [k, v] of Object.entries(h)) {
    r.push(Buffer.from(k), Buffer.from(v))
  }
  return r
}
