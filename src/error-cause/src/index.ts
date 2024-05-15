import type { IncomingMessage } from 'http'

/**
 * Codification of vlt's Error.cause conventions
 *
 * Add new properties to this list as needed.
 *
 * Several of these types are just very basic duck-typing, because referencing
 * internal types directly would create a workspace dependency cycle.
 */
export interface ErrorCauseObject {
  cause?: ErrorCause
  name?: string
  offset?: number
  code?: Codes
  path?: string
  from?: string
  target?: string
  spec?:
    | string
    | {
        type: 'git' | 'file' | 'remote' | 'registry' | 'workspace'
        spec: string
        [k: string | symbol | number]: any
      }
  status?: number | null
  cmd?: string
  args?: string[]
  stdout?: null | string | Buffer
  stderr?: null | string | Buffer
  signal?: null | NodeJS.Signals
  validOptions?: Array<any>
  todo?: string
  wanted?: any
  found?: any
  response?:
    | Response
    | IncomingMessage
    | {
        statusCode: number
        headers: Record<string, string | string[]> | Buffer[]
        text: () => string
        [k: string | symbol | number]: any
      }
  url?: string | URL
  repository?: string
  version?:
    | string
    | {
        raw: string
        major: number
        minor: number
        patch: number
        [k: string | symbol | number]: any
      }
  range?:
    | string
    | {
        raw: string
        isAny: boolean
        includePrerelease: boolean
        [k: string | symbol | number]: any
      }
  manifest?: DuckTypeManifest
  packument?: {
    name: string
    'dist-tags': Record<string, string>
    versions: Record<string, DuckTypeManifest>
    time?: Record<string, string>
  }
  max?: any
  min?: any
}

export type DuckTypeManifest = Record<string, any> & {
  name: string
  version: string
  deprecated?: string
  engines?: Record<string, string>
  os?: string | string[]
  arch?: string | string[]
  dist?: {
    integrity?: string
    shasum?: string
    tarball?: string
    fileCount?: number
    unpackedSize?: number
    signatures?: {
      keyid: string
      sig: string
    }[]
  }
}

export type ErrorCause = Error | ErrorCauseObject

/**
 * Valid properties for the 'code' field in an Error cause.
 * Add new options to this list as needed.
 */
export type Codes =
  | 'ELIFECYCLE'
  | 'ENEEDAUTH'
  | 'ERESOLVE'
  | 'EUNKNOWN'
  | 'EINTEGRITY'
  | 'EEXIST'
  | 'ENOENT'
  | 'EINVAL'
  | 'EMAXREDIRECT'
  | 'ENOGIT'

const create = (
  cls: typeof Error,
  defaultFrom: ((...a: any[]) => any) | { new (...a: any[]): any },
  message: string,
  cause?: ErrorCause,
  from:
    | ((...a: any[]) => any)
    | { new (...a: any[]): any } = defaultFrom,
) => {
  const er = new cls(message, cause ? { cause } : undefined)
  Error.captureStackTrace(er, from)
  return er
}

export const error = (
  message: string,
  cause?: ErrorCause,
  from?: ((...a: any[]) => any) | { new (...a: any[]): any },
) => create(Error, error, message, cause, from)

export const typeError = (
  message: string,
  cause?: ErrorCause,
  from?: ((...a: any[]) => any) | { new (...a: any[]): any },
) => create(TypeError, typeError, message, cause, from)

export const syntaxError = (
  message: string,
  cause?: ErrorCause,
  from?: ((...a: any[]) => any) | { new (...a: any[]): any },
) => create(SyntaxError, syntaxError, message, cause, from)
