import { type Action } from '@/state/types.js'
import { DEFAULT_QUERY } from '@/state/index.js'

export type RequestRouteTransitionOptions<T> = {
  updateActiveRoute: Action['updateActiveRoute']
  updateErrorCause: Action['updateErrorCause']
  updateQuery: Action['updateQuery']
  updateStamp: Action['updateStamp']
  body: T
  url: string
  destinationRoute: string
  errorMessage: string
}

export const requestRouteTransition = async <T>({
  updateActiveRoute,
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
    // eslint-disable-next-line no-console
    console.error(err)
    updateActiveRoute('/error')
    updateErrorCause('Failed to submit request.')
    return
  }

  let projectSelected = false
  try {
    projectSelected = (await req.json()) === 'ok'
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
  }

  if (projectSelected) {
    window.scrollTo(0, 0)
    updateQuery(DEFAULT_QUERY)
    updateActiveRoute(destinationRoute)
    updateStamp()
  } else {
    updateActiveRoute('/error')
    updateErrorCause(errorMessage)
  }
}
