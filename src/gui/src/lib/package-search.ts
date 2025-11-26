export const REGISTRY_ENDPOINTS = {
  search: 'https://registry.npmjs.org/-/v1/search',
} as const

type RegistryEndpoint =
  (typeof REGISTRY_ENDPOINTS)[keyof typeof REGISTRY_ENDPOINTS]

type ExtractParams<T> =
  T extends { params: object } ? T['params'] : never
type ExtractData<T> = T extends { data: object } ? T['data'] : never

const fetchRegistrySearch = async <
  Op extends { params: unknown; data: unknown },
>({
  endpoint,
  params,
  signal,
}: {
  endpoint: RegistryEndpoint
  params: ExtractParams<Op>
  signal?: AbortSignal
}): Promise<ExtractData<Op>> => {
  const queryParams = new URLSearchParams(
    params as Record<string, string>,
  ).toString()
  const url = `${endpoint}?${queryParams}`

  const res = await fetch(url, {
    signal,
  })

  if (!res.ok) {
    throw new Error(
      `Failed to fetch registry search (${res.status} ${res.statusText})`,
    )
  }

  const data: unknown = await res.json()
  if (typeof data === 'string') {
    return JSON.parse(data) as ExtractData<Op>
  }
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in (data as Record<string, unknown>)
  ) {
    const errVal = (data as { error?: unknown }).error
    let message: string
    if (typeof errVal === 'string') {
      message = errVal
    } else if (
      typeof errVal === 'number' ||
      typeof errVal === 'boolean'
    ) {
      message = String(errVal)
    } else if (errVal && typeof errVal === 'object') {
      message = JSON.stringify(errVal)
    } else {
      message = 'Unknown registry error'
    }
    throw new Error(message)
  }
  return data as ExtractData<Op>
}

// npm registry response types
export interface RegistryPackage {
  name: string
  version: string
  description?: string
  keywords?: string[]
  date: string
  license?: string
  links: {
    npm?: string
    homepage?: string
    repository?: string
    bugs?: string
  }
  author?: {
    name: string
    email?: string
    username?: string
  }
  publisher?: {
    username?: string
    email?: string
  }
  maintainers: {
    username: string
    email: string
  }[]
}

export interface SearchObject {
  package: RegistryPackage
  downloads: {
    monthly: number
    weekly: number
  }
  score: {
    final: number
    detail: {
      quality: number
      popularity: number
      maintenance: number
    }
  }
  searchScore?: number
  flags?: {
    insecure?: number
    unstable?: boolean
  }
}

export interface RegistrySearchResult {
  objects: SearchObject[]
  total: number
  time: string
}

interface SearchOperation {
  params: {
    text: string
    size?: string
    from?: string
  }
  data: RegistrySearchResult
}

export const fetchPackageSearch = async ({
  text,
  size = 10,
  from = 0,
  signal,
}: {
  text: string
  size?: number
  from?: number
  signal?: AbortSignal
}): Promise<RegistrySearchResult> => {
  try {
    return await fetchRegistrySearch<SearchOperation>({
      endpoint: REGISTRY_ENDPOINTS.search,
      params: {
        text,
        size: size.toString(),
        from: from.toString(),
      },
      signal,
    })
  } catch (e) {
    if ((e as { name?: unknown }).name === 'AbortError') throw e
    throw new Error(`Failed to fetch package search: ${e}`)
  }
}
