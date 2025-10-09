import { getRouterParam, eventHandler, HTTPError } from 'h3'
import type { HTTPEvent, EventHandlerRequest } from 'h3'
import assert from 'node:assert'
import type { EventHandler } from 'h3'

const assertParam = (
  event: HTTPEvent<EventHandlerRequest>,
  name: string,
) => {
  const param = getRouterParam(event, name)
  assert(param, `${name} parameter is required`)
  return param
}

const packageOrVersionHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  const param3 = getRouterParam(event, 'param3')
  return {
    param1,
    param2,
    param3,
  }
}

export const getPackageOrVersionHandler = eventHandler(
  packageOrVersionHandler,
)

const tarballHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  const tarball = assertParam(event, 'tarball')
  return {
    param1,
    param2,
    tarball,
  }
}

export const getTarballHandler = eventHandler(tarballHandler)

export const putPackageHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  return {
    param1,
    param2,
  }
}

export const searchHandler: EventHandler = async event => {
  throw new HTTPError('Not implemented', {
    status: 501,
  })
}
