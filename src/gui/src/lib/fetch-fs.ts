type FsEndpoint = '/ls' | '/homedir'

export type FileType = 'file' | 'directory' | 'other'
export interface FsItem {
  name: string
  path: string
  type: FileType
  size: number
  mtime: string
}

type ErrorResponse = { error: string }

const isErrorResponse = (v: unknown): v is ErrorResponse =>
  typeof v === 'object' &&
  v !== null &&
  'error' in (v as Record<string, unknown>) &&
  typeof (v as { error?: unknown }).error === 'string'

const fetchFs = async <T>({
  endpoint,
  path,
}: {
  endpoint: FsEndpoint
  path?: string
}): Promise<T> => {
  const body = path ? JSON.stringify({ path }) : JSON.stringify({})
  const res = await fetch(`/fs${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch fs`)
  }

  const data: unknown = await res.json()

  if (isErrorResponse(data)) {
    throw new Error(data.error)
  }

  if (typeof data === 'string') {
    return JSON.parse(data) as T
  }

  return data as T
}

export const fetchFsLs = async ({
  path,
}: {
  path?: string
}): Promise<FsItem[]> => {
  try {
    return await fetchFs<FsItem[]>({ endpoint: '/ls', path })
  } catch (e) {
    throw new Error(`Failed to fetch fs ls: ${e}`)
  }
}

export const fetchHomedir = async (): Promise<string> => {
  try {
    return await fetchFs<string>({ endpoint: '/homedir' })
  } catch (e) {
    throw new Error(`Failed to fetch homedir: ${e}`)
  }
}
