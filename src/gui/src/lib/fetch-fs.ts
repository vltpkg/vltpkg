export const FS_ENDPOINTS = {
  ls: '/fs/ls',
  homedir: '/fs/homedir',
  read: '/fs/read',
} as const

type FsEndpoint = (typeof FS_ENDPOINTS)[keyof typeof FS_ENDPOINTS]

type ExtractBody<T> = T extends { body: object } ? T['body'] : never
type ExtractData<T> = T extends { data: object } ? T['data'] : never

export type FileType = 'file' | 'directory' | 'other' | 'symlink'
export interface FsItem {
  name: string
  path: string
  type: FileType
  size: number | null
  mtime: string
  fileType?: string | null
}

const fetchServerFs = async <
  Op extends { body: unknown; data: unknown },
>({
  endpoint,
  body,
  signal,
}: {
  endpoint: FsEndpoint
  body: ExtractBody<Op>
  signal?: AbortSignal
}): Promise<ExtractData<Op>> => {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) throw new Error('Failed to fetch fs')

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
      message = 'Unknown server error'
    }
    throw new Error(message)
  }
  return data as ExtractData<Op>
}

interface LsOperation {
  body: { path?: string }
  data: FsItem[]
}

export const fetchFsLs = async ({
  path,
  signal,
}: {
  path?: string
  signal?: AbortSignal
}): Promise<FsItem[]> => {
  try {
    return await fetchServerFs<LsOperation>({
      endpoint: FS_ENDPOINTS.ls,
      body: { path },
      signal,
    })
  } catch (e) {
    if ((e as { name?: unknown }).name === 'AbortError') throw e
    throw new Error(`Failed to fetch fs ls: ${e}`)
  }
}

interface HomedirOperation {
  body: Record<string, never>
  data: string
}

export const fetchHomedir = async (opts?: {
  signal?: AbortSignal
}): Promise<string> => {
  try {
    return await fetchServerFs<HomedirOperation>({
      endpoint: FS_ENDPOINTS.homedir,
      body: {},
      signal: opts?.signal,
    })
  } catch (e) {
    if ((e as { name?: unknown }).name === 'AbortError') throw e
    throw new Error(`Failed to fetch homedir: ${e}`)
  }
}

export interface ReadOpItem {
  content: string
  encoding: 'utf8' | 'base64'
  mime: string
  ext: string | null
  name: string
}

interface ReadOperation {
  body: { path: string; encoding?: 'utf8' | 'base64' }
  data: ReadOpItem
}

export const fetchFsRead = async ({
  path,
  encoding = 'utf8',
  signal,
}: {
  path: string
  encoding?: 'utf8' | 'base64'
  signal?: AbortSignal
}): Promise<ReadOperation['data']> => {
  try {
    return await fetchServerFs<ReadOperation>({
      endpoint: FS_ENDPOINTS.read,
      body: { path, encoding },
      signal,
    })
  } catch (e) {
    if ((e as { name?: unknown }).name === 'AbortError') throw e
    throw new Error(`Failed to fetch fs read: ${e}`)
  }
}
