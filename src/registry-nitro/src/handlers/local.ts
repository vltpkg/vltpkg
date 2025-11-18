import { getRouterParam, eventHandler, HTTPError, readBody } from 'h3'
import type { HTTPEvent, EventHandler } from 'h3'
import { useStorage } from 'nitro/runtime'
import assert from 'node:assert'
import { Readable } from 'node:stream'
import * as ssri from 'ssri'

const assertParam = (event: HTTPEvent, name: string) => {
  const param = getRouterParam(event, name)
  assert(param, `${name} parameter is required`)
  return param
}

const joinParams = (
  sep: string,
  ...params: (string | undefined)[]
) => {
  return params.filter(Boolean).join(sep)
}

const getPackageOrVersionKey = (
  param1: string,
  param2: string | undefined,
  param3: string | undefined,
) => {
  let type: string
  if (!param2 && !param3) {
    type = 'package'
  } else if (param2 && !param3) {
    type = param1.startsWith('@') ? 'package' : 'version'
  } else {
    type = 'version'
  }

  return `local___${type}___${joinParams('_', param1, param2, param3)}`
}

const packageOrVersionHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  const param3 = getRouterParam(event, 'param3')

  const storage = useStorage('packages')
  const key = getPackageOrVersionKey(param1, param2, param3)

  const cached = await storage.getItem(key)

  if (!cached) {
    throw new HTTPError('Package not found', { status: 404 })
  }

  // Return the cached response
  const response = cached as any
  if (response.value?.headers) {
    for (const [headerKey, value] of Object.entries(
      response.value.headers as Record<string, string>,
    )) {
      event.res.headers.set(headerKey, value)
    }
  }

  return response.value?.body ?
      JSON.parse(response.value.body)
    : cached
}

export const getPackageOrVersionHandler = eventHandler(
  packageOrVersionHandler,
)

const getTarballKey = (
  param1: string,
  param2: string | undefined,
  tarball: string,
) => {
  return `local___tarball___${joinParams('_', param1, param2, tarball)}`
}

const tarballHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')
  const tarball = assertParam(event, 'tarball')

  const storage = useStorage('tarballs')
  const key = getTarballKey(param1, param2, tarball)

  const cached = await storage.getItem(key)

  if (!cached) {
    throw new HTTPError('Tarball not found', { status: 404 })
  }

  // Return the cached response
  const response = cached as any
  if (response.value?.headers) {
    for (const [headerKey, value] of Object.entries(
      response.value.headers as Record<string, string>,
    )) {
      event.res.headers.set(headerKey, value)
    }
  }

  return response.value?.body || cached
}

export const getTarballHandler = eventHandler(tarballHandler)

export const putPackageHandler: EventHandler = async event => {
  const param1 = assertParam(event, 'param1')
  const param2 = getRouterParam(event, 'param2')

  const body: {
    name?: string
    version?: string
    _attachments?: Record<
      string,
      { data: string; content_type?: string; length?: number }
    >
  } = (await readBody(event))!
  const contentType = event.res.headers.get('content-type')

  // Determine if this is a package or version
  const isScoped = param1.startsWith('@')
  const type = param2 || !isScoped ? 'version' : 'package'

  const packageStorage = useStorage('packages')

  // Generate storage key
  const packageKey = `local___${type}___${joinParams('_', param1, param2)}`

  // Get package name and version from body
  const packageName = body.name || joinParams('/', param1, param2)
  const version = body.version

  // Handle tarball attachments if present
  if (body._attachments && version) {
    const tarballStorage = useStorage('tarballs')

    for (const [filename, attachment] of Object.entries(
      body._attachments,
    )) {
      // Decode base64 tarball data
      const tarballBuffer = Buffer.from(attachment.data, 'base64')
      const tarballStream = Readable.from([tarballBuffer])

      // Generate tarball key
      const tarballKey = `local___tarball___${joinParams('_', param1, param2, filename)}`

      // Calculate integrity for tarball data
      const tarballIntegrity = ssri.fromData(tarballBuffer, {
        algorithms: ['sha512'],
      })

      // Create tarball cache entry
      const tarballEntry = {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 100, // 100 years
        mtime: Date.now(),
        integrity: tarballIntegrity.toString(),
        value: {
          status: 200,
          headers: {
            'content-type':
              (attachment as { content_type?: string })
                .content_type || 'application/octet-stream',
            'content-length': attachment.length?.toString() || '0',
          },
          body: tarballStream,
        },
      }

      await tarballStorage.setItemRaw(tarballKey, tarballEntry)
    }
  }

  // Store package metadata (without attachments to save space)
  const { _attachments, ...packageData } = body

  // Convert body to stream for the storage driver
  const packageDataString = JSON.stringify(packageData)
  const bodyStream = Readable.from([packageDataString])

  // Calculate integrity for package data
  const packageIntegrity = ssri.fromData(packageDataString, {
    algorithms: ['sha512'],
  })

  // Create cache entry structure that matches what the driver expects
  const packageEntry = {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 year
    mtime: Date.now(),
    integrity: packageIntegrity.toString(),
    value: {
      status: 200,
      headers: {
        'content-type': contentType || 'application/json',
      },
      body: bodyStream,
    },
  }

  await packageStorage.setItemRaw(packageKey, packageEntry)

  return {
    ok: true,
    package: packageName,
    version,
    key: packageKey,
  }
}

export const searchHandler: EventHandler = async () => {
  throw new HTTPError('Not implemented', {
    status: 501,
  })
}
