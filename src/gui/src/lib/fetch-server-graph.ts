export const GRAPH_ENDPOINTS = {
  nodeResolvedPath: '/graph/node/resolved-path',
} as const

type GraphEndpoint =
  (typeof GRAPH_ENDPOINTS)[keyof typeof GRAPH_ENDPOINTS]

type ExtractBody<T> = T extends { body: object } ? T['body'] : never
type ExtractData<T> = T extends { data: object } ? T['data'] : never

const fetchServerGraph = async <
  Op extends { body: unknown; data: unknown },
>({
  endpoint,
  body,
  signal,
}: {
  endpoint: GraphEndpoint
  body: ExtractBody<Op>
  signal?: AbortSignal
}): Promise<ExtractData<Op>> => {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) throw new Error('Failed to fetch graph')

  const data: unknown = await res.json()
  // Some server endpoints return stringified JSON for consistency with other APIs
  if (typeof data === 'string') {
    return JSON.parse(data) as ExtractData<Op>
  }
  return data as ExtractData<Op>
}

interface NodeResolvedPathOperation {
  body: { depId: string }
  data: { path: string }
}

export const fetchNodeResolvedPath = async (
  { depId }: NodeResolvedPathOperation['body'],
  opts?: { signal?: AbortSignal },
): Promise<NodeResolvedPathOperation['data']> => {
  try {
    return await fetchServerGraph<NodeResolvedPathOperation>({
      endpoint: GRAPH_ENDPOINTS.nodeResolvedPath,
      body: { depId },
      signal: opts?.signal,
    })
  } catch (e) {
    if ((e as { name?: unknown }).name !== 'AbortError') {
      console.error(e)
    }
    throw e
  }
}
