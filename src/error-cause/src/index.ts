/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import type { IncomingHttpHeaders, IncomingMessage } from 'http'

/**
 * Codification of vlt's Error.cause conventions
 *
 * Add new properties to this list as needed.
 *
 * Several of these types are just very basic duck-typing, because referencing
 * internal types directly would create a workspace dependency cycle.
 */
export type ErrorCauseOptions = {
  /**
   * The `cause` field within a `cause` object should
   * always be an `Error` object that was previously thrown. Note
   * that the `cause` on an Error itself might _also_ be a
   * previously thrown error, if no additional information could be
   * usefully added beyond improving the message. It is typed as `unknown`
   * because we use `useUnknownInCatchVariables` so this makes it easier
   * to rethrow a caught error without recasting it.
   */
  cause?: unknown

  /** the name of something */
  name?: string

  /** byte offset in a Buffer or file */
  offset?: number

  /**
   * This should only be a string code that we set. See {@link Codes} for
   * the supported options. Lower-level system codes like `ENOENT` should
   * remain on the errors that generated them.
   */
  code?: Codes

  /** target of a file system operation */
  path?: string

  /**
   * file path origin of a resolution that failed, for example in the case
   * of `file://` specifiers.
   */
  from?: string

  /** path on disk that is being written, linked, or extracted to */
  target?: string

  /** Spec object/string relevant to an operation that failed */
  spec?:
    | string
    | {
        type:
          | 'file'
          | 'git'
          | 'registry'
          | 'remote'
          | 'workspace'
          | 'catalog'
        spec: string
        [k: number | string | symbol]: any
      }

  /** exit code of a process, or HTTP response status code */
  status?: number | null

  /** null or a signal that a process received */
  signal?: NodeJS.Signals | null

  /** the root of a project */
  projectRoot?: string

  /** the current working directory of a process */
  cwd?: string

  /** a command being run in a child process */
  command?: string

  /** the arguments passed to a process */
  args?: string[]

  /** standard output from a process */
  stdout?: Buffer | string | null

  /** standard error from a process */
  stderr?: Buffer | string | null

  /**
   * Array of valid options when something is not a valid option.
   * (For use in `did you mean X?` output.)
   */
  validOptions?: unknown[] | readonly unknown[]

  /**
   * message indicating what bit of work this might be a part of, what feature
   * needs to be implemented, etc. Eg, `{ todo: 'nested workspace support' }`.
   */
  todo?: string

  /**
   * A desired value that was not found, or a regular expression or other
   * pattern describing it.
   */
  wanted?: unknown

  /** actual value, which was not wanted */
  found?: unknown

  /** HTTP message, fetch.Response, or `@vltpkg/registry-client.CacheEntry` */
  response?:
    | IncomingMessage
    | Response
    | {
        statusCode: number
        headers?:
          | Buffer[]
          | Record<string, string[] | string>
          | IncomingHttpHeaders
        text?: () => string
        [k: number | string | symbol]: any
      }

  /** string or URL object */
  url?: URL | string

  /** HTTP method */
  method?: string

  /** git repository remote or path */
  repository?: string

  /** string or `@vltpkg/semver.Version` object */
  version?:
    | string
    | {
        raw: string
        major: number
        minor: number
        patch: number
        [k: number | string | symbol]: any
      }

  /** string or `@vltpkg/semver.Range` object */
  range?:
    | string
    | {
        raw: string
        isAny: boolean
        includePrerelease: boolean
        [k: number | string | symbol]: any
      }

  /** a package manifest, either from `package.json` or a registry */
  manifest?: DuckTypeManifest

  /** registry top-level package document */
  packument?: {
    name: string
    'dist-tags': Record<string, string>
    versions: Record<string, DuckTypeManifest>
    time?: Record<string, string>
  }

  /** maximum value, which was exceeded */
  max?: unknown

  /** minimum value, which was not met */
  min?: unknown
}

export type DuckTypeManifest = Record<string, any> & {
  name?: string
  version?: string
  deprecated?: string
  engines?: Record<string, string>
  os?: string[] | string
  arch?: string[] | string
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

/**
 * Valid properties for the 'code' field in an Error cause.
 * Add new options to this list as needed.
 */
export type Codes =
  | 'EEXIST'
  | 'EINTEGRITY'
  | 'EINVAL'
  | 'ELIFECYCLE'
  | 'EMAXREDIRECT'
  | 'ENEEDAUTH'
  | 'ENOENT'
  | 'ENOGIT'
  | 'ERESOLVE'
  | 'EUNKNOWN'
  | 'EUSAGE'
  | 'EREQUEST'
  | 'ECONFIG'

// `captureStackTrace` is non-standard so explicitly type it as possibly
// undefined since it might be in browsers.
const { captureStackTrace } = Error as {
  captureStackTrace?: ErrorConstructor['captureStackTrace']
}

export type ErrorCtor<T extends Error> = new (
  message: string,
  options?: { cause: Error | ErrorCauseOptions },
) => T

function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: Function,
  message: string,
  cause?: undefined,
  from?: Function,
): T
function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: Function,
  message: string,
  cause?: Error,
  from?: Function,
): T & { cause: Error }
function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: Function,
  message: string,
  cause?: ErrorCauseOptions,
  from?: Function,
): T & { cause: ErrorCauseOptions }
function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: Function,
  message: string,
  cause?: Error | ErrorCauseOptions,
  from: Function = defaultFrom,
) {
  const er = new cls(message, cause ? { cause } : undefined)
  captureStackTrace?.(er, from)
  return er
}

export function error(
  message: string,
  cause?: undefined,
  from?: Function,
): Error
export function error(
  message: string,
  cause: Error,
  from?: Function,
): Error & { cause: Error }
export function error(
  message: string,
  cause: ErrorCauseOptions,
  from?: Function,
): Error & { cause: ErrorCauseOptions }
export function error(
  message: string,
  cause?: Error | ErrorCauseOptions,
  from?: Function,
) {
  return create(Error, error, message, cause, from)
}

export function typeError(
  message: string,
  cause?: undefined,
  from?: Function,
): TypeError
export function typeError(
  message: string,
  cause: Error,
  from?: Function,
): TypeError & { cause: Error }
export function typeError(
  message: string,
  cause: ErrorCauseOptions,
  from?: Function,
): TypeError & { cause: ErrorCauseOptions }
export function typeError(
  message: string,
  cause?: Error | ErrorCauseOptions,
  from?: Function,
) {
  return create<TypeError>(TypeError, typeError, message, cause, from)
}

export function syntaxError(
  message: string,
  cause?: undefined,
  from?: Function,
): SyntaxError
export function syntaxError(
  message: string,
  cause: Error,
  from?: Function,
): SyntaxError & { cause: Error }
export function syntaxError(
  message: string,
  cause: ErrorCauseOptions,
  from?: Function,
): SyntaxError & { cause: ErrorCauseOptions }
export function syntaxError(
  message: string,
  cause?: Error | ErrorCauseOptions,
  from?: Function,
) {
  return create<SyntaxError>(
    SyntaxError,
    syntaxError,
    message,
    cause,
    from,
  )
}
