/**
 * The one-shot request the OIDC exchange makes: no pooling, no retries, no
 * cache. It goes through global `fetch` rather than undici deliberately —
 * a static undici import anywhere in this package's graph puts undici in the
 * compiled binary, where it cannot link (its llhttp is WebAssembly and the
 * pin ships no wasm host archive). OIDC runs once per CI publish, so the
 * transport's pooling buys nothing here.
 */
export type OidcResponse = {
  statusCode: number
  body: { json: () => Promise<unknown> }
}

export const request = async (
  url: URL | string,
  options: { method: string; headers: Record<string, string> },
): Promise<OidcResponse> => {
  const res = await fetch(String(url), options)
  return { statusCode: res.status, body: { json: () => res.json() } }
}
