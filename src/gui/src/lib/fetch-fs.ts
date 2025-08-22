type FsEndpoint = '/ls' | '/homedir'

export type FileType = 'file' | 'directory' | 'other'
export interface FsItem {
  name: string
  path: string
  type: FileType
  size: number
  mtime: string
}

const fetchFs = async <T>({
  endpoint,
  path,
}: {
  endpoint: FsEndpoint
  path?: string
}): Promise<T> => {
  try {
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

    const data = await res.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return JSON.parse(data)
  } catch (e) {
    throw e
  }
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
