import type { useToast } from '@/components/hooks/use-toast.js'

import type { Action } from '@/state/types.js'
import type { DepID } from '@vltpkg/dep-id'

export type Operation = 'install' | 'uninstall'

type AddRemoveDependencyOptions = {
  operation: Operation
  setError: (str: string) => void
  setInProgress: (bool: boolean) => void
  updateStamp: Action['updateStamp']
  toast?: ReturnType<typeof useToast>['toast']
  name: string
  version?: string
  type?: string
  importerId: DepID
  onSuccessful?: (str: string) => void
}

export const addRemoveDependency = async ({
  operation,
  setError,
  setInProgress,
  updateStamp,
  toast,
  importerId,
  name,
  version,
  type,
  onSuccessful,
}: AddRemoveDependencyOptions) => {
  const body =
    operation === 'install' ?
      {
        add: {
          [importerId]: {
            [name]: {
              version,
              type,
            },
          },
        },
      }
    : {
        remove: {
          [importerId]: [name],
        },
      }
  let req
  try {
    setInProgress(true)
    req = await fetch(`/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error(err)
    setError(String(err))
    return
  } finally {
    setInProgress(false)
  }

  let installed = false
  let res = ''
  try {
    res = (await req.json()) as string
    installed = res === 'ok'
  } catch (err) {
    console.warn('unable to parse json response:', err)
  }

  if (installed) {
    toast?.({
      description: `Successfully ${operation}ed: ${name}`,
    })
    onSuccessful?.(name)
    updateStamp()
  } else {
    if ((req.status === 500 || req.status === 400) && res) {
      setError(res)
    }
    if (!res) {
      setError('Failed to install dependency.')
    }
  }
}
