import { fetchHomedir } from '@/lib/fetch-fs.ts'

import type { WhichConfig } from '@vltpkg/vlt-json'
import type { ConfigFileData } from '@vltpkg/cli-sdk/config'
export type ConfigAction = 'get' | 'set' | 'delete'

type ConfigKeyPair = { key: string }
type ConfigKeyValuePair = { key: string; value: string }

const endpointMap: Record<ConfigAction, string> = {
  get: '',
  set: '/set',
  delete: '/delete',
}

class ConfigError extends Error {
  which: WhichConfig
  action: ConfigAction

  constructor(args: {
    which: WhichConfig
    action: ConfigAction
    message: string
  }) {
    super(args.message)
    this.name = 'ConfigError'
    this.which = args.which
    this.action = args.action
  }

  toJSON() {
    return {
      which: this.which,
      message: this.message,
      action: this.action,
    }
  }
}

const extractErrorMessage = async (
  res: Response,
): Promise<string> => {
  try {
    const parsed = (await res.json()) as unknown
    if (typeof parsed === 'string') return parsed
  } catch {}
  try {
    return await res.text()
  } catch {
    return 'Unknown error'
  }
}

const fetchConfig = async <T>({
  which,
  action,
  pairs,
}: {
  which: WhichConfig
  action: ConfigAction
  pairs?: (ConfigKeyValuePair | ConfigKeyPair)[]
}): Promise<T> => {
  try {
    const endpoint = endpointMap[action]
    const res = await fetch(`/config${endpoint}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ which, pairs }),
    })

    if (!res.ok) {
      const errorText = await extractErrorMessage(res)
      const msg =
        typeof errorText === 'string' ?
          errorText.split('\n').slice(1).join('\n') || errorText
        : 'Request failed'
      throw new ConfigError({ which, action, message: msg })
    }

    // successful responses are JSON-encoded strings.
    // for GET: body is a JSON string of a JSON stringified object then parsed twice.
    // for SET/DELETE: body is a JSON string message.
    const firstParse = (await res.json()) as unknown
    if (action === 'get') {
      if (typeof firstParse === 'string') {
        try {
          return JSON.parse(firstParse) as T
        } catch {}
      }
    }
    return firstParse as T
  } catch (e) {
    if (e instanceof ConfigError) {
      throw e
    }
    throw new ConfigError({
      which,
      action,
      message: `Unexpected error: ${e instanceof Error ? e.message : String(e)}`,
    })
  }
}

export const setToConfig = async ({
  which,
  pairs,
}: {
  which: WhichConfig
  pairs: ConfigKeyValuePair[]
}): Promise<string> => {
  return fetchConfig<string>({ which, action: 'set', pairs })
}

export async function getFromConfig({
  which,
  pairs,
}: {
  which: WhichConfig
  pairs?: ConfigKeyPair[]
}): Promise<ConfigFileData | Record<string, unknown>> {
  if (!pairs) {
    return fetchConfig<ConfigFileData>({ which, action: 'get' })
  }
  return fetchConfig<Record<string, unknown>>({
    which,
    action: 'get',
    pairs,
  })
}

export const deleteFromConfig = async ({
  which,
  pairs,
}: {
  which: WhichConfig
  pairs: ConfigKeyPair[]
}): Promise<string> => {
  return fetchConfig<string>({ which, action: 'delete', pairs })
}

export const removeDashboardRoot = async (
  path: string,
): Promise<string[]> => {
  const result = (await getFromConfig({
    which: 'user',
    pairs: [{ key: 'dashboard-root' }],
  })) as Record<string, unknown>

  const value = result['dashboard-root']
  const current: string[] =
    Array.isArray(value) ? value.filter(v => typeof v === 'string')
    : typeof value === 'string' ? [value]
    : []

  const updated = current.filter(p => p !== path)

  await deleteFromConfig({
    which: 'user',
    pairs: [{ key: 'dashboard-root' }],
  })

  await setToConfig({
    which: 'user',
    pairs: [
      {
        key: 'dashboard-root',
        value: JSON.stringify(updated),
      },
    ],
  })

  return updated
}

export const setDefaultDashboardRoot = async (): Promise<void> => {
  try {
    const homedir = await fetchHomedir()

    await setToConfig({
      which: 'user',
      pairs: [
        {
          key: 'dashboard-root',
          value: JSON.stringify([homedir]),
        },
      ],
    })
  } catch (e) {
    console.error('Error setting default dashboard root:', e)
  }
}
