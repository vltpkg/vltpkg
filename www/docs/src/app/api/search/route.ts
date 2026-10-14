import { GET as search } from '@/app/api/v1/search/route'

// the pre-versioning path, kept working but flagged (RFC 9745) with a pointer to its successor
export const GET = async (request: Request) => {
  const res = await search(request)
  res.headers.set('Deprecation', '@1791936000') // 2026-10-14
  res.headers.set('Link', '</api/v1/search>; rel="successor-version"')
  return res
}
