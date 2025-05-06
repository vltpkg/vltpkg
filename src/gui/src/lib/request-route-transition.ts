import type { Action } from '@/state/types.ts'
import { DEFAULT_QUERY } from '@/state/index.ts'

export type RequestRouteTransitionOptions<T> = {
  navigate: (route: string) => void
  updateErrorCause: Action['updateErrorCause']
  updateQuery: Action['updateQuery']
  updateStamp: Action['updateStamp']
  body: T
  url: string
  destinationRoute: string
  errorMessage: string
}

export const requestRouteTransition = async <T>({
  navigate,
  updateErrorCause,
  updateQuery,
  updateStamp,
  body,
  url,
  destinationRoute,
  errorMessage,
}: RequestRouteTransitionOptions<T>) => {
  let req
  try {
    req = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error(err)
    navigate('/error')
    updateErrorCause('Failed to submit request.')
    return
  }

  let projectSelected = false
  try {
    projectSelected = (await req.json()) === 'ok'
  } catch (err) {
    console.error(err)
  }

  if (projectSelected) {
    window.scrollTo(0, 0)
    updateQuery(DEFAULT_QUERY)
    navigate(destinationRoute)
    updateStamp()
  } else {
    navigate('/error')
    updateErrorCause(errorMessage)
  }
}
