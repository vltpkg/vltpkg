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
        type: 'file' | 'git' | 'registry' | 'remote' | 'workspace'
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
  validOptions?: unknown[]

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
        headers:
          | Buffer[]
          | Record<string, string[] | string>
          | IncomingHttpHeaders
        text?: () => string
        [k: number | string | symbol]: any
      }

  /** string or URL object */
  url?: URL | string

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
 * The input cause for the {@link error} functions. Can either be a plain error
 * or an error cause options object.
 */
export type ErrorCause = Error | ErrorCauseOptions

/**
 * The same as {@link ErrorCauseOptions} except where `cause` has been
 * converted to an Error.
 */
export type ErrorCauseResult = Omit<ErrorCauseOptions, 'cause'> & {
  cause?: Error
}

/**
 * An error with a cause property. Cause defaults to `unknown`.
 */
export type ErrorWithCause<
  T extends Error = Error,
  U = unknown,
> = T & { cause: U }

/**
 * An error with a cause property that is an Error.
 */
export type ErrorWithCauseError<T extends Error = Error> =
  ErrorWithCause<T, Error>

/**
 * An error with a cause property that is an {@link ErrorCauseResult}.
 */
export type ErrorWithCauseObject<T extends Error = Error> =
  ErrorWithCause<T, ErrorCauseResult>

/**
 * Helper util to convert unknown to a plain error. Not specifically
 * related to error causes, but useful for error handling in general.
 */
export const asError = (
  er: unknown,
  fallbackMessage = 'Unknown error',
): Error =>
  er instanceof Error ? er : new Error(String(er) || fallbackMessage)

/**
 * Helper util to check if an error has any type of cause property.
 * Note that this does not mean it is a cause from this library,
 * just that it has a cause property.
 */
export const isErrorWithCause = (er: unknown): er is ErrorWithCause =>
  er instanceof Error && 'cause' in er

export const errorCodes = [
  'EEXIST',
  'EINTEGRITY',
  'EINVAL',
  'ELIFECYCLE',
  'EMAXREDIRECT',
  'ENEEDAUTH',
  'ENOENT',
  'ENOGIT',
  'ERESOLVE',
  'EUNKNOWN',
  'EUSAGE',
] as const

const errorCodesSet = new Set(errorCodes)

/**
 * Valid properties for the 'code' field in an Error cause.
 * Add new options to this list as needed.
 */
export type Codes = (typeof errorCodes)[number]

/**
 *  An error with a cause property that is an {@link ErrorCauseResult}
 * and has a code property that is a {@link Codes}.
 */
export type ErrorWithCode<T extends Error = Error> = ErrorWithCause<
  T,
  Omit<ErrorCauseResult, 'code'> & {
    code: Exclude<ErrorCauseResult['code'], undefined>
  }
>

/**
 * Type guard to check if an error has one of our error code properties.
 * Note that the type check only checks for the code property and value,
 * but since every property on {@link ErrorCauseOptions} is optional, this should
 * be sufficient to know the shape of the cause and use it in printing.
 */
export const isErrorWithCode = (er: unknown): er is ErrorWithCode =>
  isErrorWithCause(er) &&
  !!er.cause &&
  typeof er.cause === 'object' &&
  'code' in er.cause &&
  typeof er.cause.code === 'string' &&
  errorCodesSet.has(er.cause.code as Codes)

// Use `Function` because that is the same type as `Error.captureStackTrace`
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type From = Function

// `captureStackTrace` is non-standard so explicitly type it as possibly
// undefined since it might be in browsers.
const { captureStackTrace } = Error as {
  captureStackTrace?: ErrorConstructor['captureStackTrace']
}

export type ErrorCtor<T extends Error> = new (
  message: string,
  options?: { cause: Error | ErrorCauseResult },
) => T

export type ErrorResult<T extends Error = Error> =
  | T
  | ErrorWithCauseError<TypeError>
  | ErrorWithCauseObject<TypeError>

function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: From,
  message: string,
  cause?: undefined,
  from?: From,
): T
function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: From,
  message: string,
  cause?: Error,
  from?: From,
): ErrorWithCauseError<T>
function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: From,
  message: string,
  cause?: ErrorCauseOptions,
  from?: From,
): ErrorWithCauseObject<T>
function create<T extends Error>(
  cls: ErrorCtor<T>,
  defaultFrom: From,
  message: string,
  cause?: ErrorCause,
  from: From = defaultFrom,
) {
  let er: T | null = null
  if (cause instanceof Error) {
    er = new cls(message, { cause })
  } else if (cause && typeof cause === 'object') {
    if ('cause' in cause) {
      cause.cause = asError(cause.cause)
    }
    er = new cls(message, {
      cause: cause as ErrorCauseResult,
    })
  } else {
    er = new cls(message)
  }
  captureStackTrace?.(er, from)
  return er
}

export function error(
  message: string,
  cause?: undefined,
  from?: From,
): Error
export function error(
  message: string,
  cause: Error,
  from?: From,
): ErrorWithCauseError
export function error(
  message: string,
  cause: ErrorCauseOptions,
  from?: From,
): ErrorWithCauseObject
export function error(
  message: string,
  cause?: ErrorCause,
  from?: From,
): ErrorResult {
  return create(Error, error, message, cause, from)
}

export function typeError(
  message: string,
  cause?: undefined,
  from?: From,
): TypeError
export function typeError(
  message: string,
  cause: Error,
  from?: From,
): ErrorWithCauseError<TypeError>
export function typeError(
  message: string,
  cause: ErrorCauseOptions,
  from?: From,
): ErrorWithCauseObject<TypeError>
export function typeError(
  message: string,
  cause?: ErrorCause,
  from?: From,
): ErrorResult<TypeError> {
  return create<TypeError>(TypeError, typeError, message, cause, from)
}

export function syntaxError(
  message: string,
  cause?: undefined,
  from?: From,
): SyntaxError
export function syntaxError(
  message: string,
  cause: Error,
  from?: From,
): ErrorWithCauseError<SyntaxError>
export function syntaxError(
  message: string,
  cause: ErrorCauseOptions,
  from?: From,
): ErrorWithCauseObject<SyntaxError>
export function syntaxError(
  message: string,
  cause?: ErrorCause,
  from?: From,
): ErrorResult<SyntaxError> {
  return create<SyntaxError>(
    SyntaxError,
    syntaxError,
    message,
    cause,
    from,
  )
}
