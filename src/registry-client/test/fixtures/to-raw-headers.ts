export const toRawHeaders = (h: Record<string, string>): Buffer[] => {
  const r: Buffer[] = []
  for (const [k, v] of Object.entries(h)) {
    r.push(Buffer.from(k), Buffer.from(v))
  }
  return r
}
