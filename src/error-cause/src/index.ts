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
  /**
   * The `cause` field within a `cause` object should
   * always be an `Error` object that was previously thrown. Note
   * that the `cause` on an Error itself might _also_ be a
   * previously thrown error, if no additional information could be
   * usefully added beyond improving the message.
   */
  cause?: ErrorCause

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
        type: 'git' | 'file' | 'remote' | 'registry' | 'workspace'
        spec: string
        [k: string | symbol | number]: any
      }

  /** exit code of a process, or HTTP response status code */
  status?: number | null

  /** null or a signal that a process received */
  signal?: null | NodeJS.Signals

  /** the root of a project */
  projectRoot?: string

  /** the current working directory of a process */
  cwd?: string

  /** a command being run in a child process */
  command?: string

  /** the arguments passed to a process */
  args?: string[]

  /** standard output from a process */
  stdout?: null | string | Buffer

  /** standard error from a process */
  stderr?: null | string | Buffer

  /**
   * Array of valid options when something is not a valid option.
   * (For use in `did you mean X?` output.)
   */
  validOptions?: any[]

  /**
   * message indicating what bit of work this might be a part of, what feature
   * needs to be implemented, etc. Eg, `{ todo: 'nested workspace support' }`.
   */
  todo?: string

  /**
   * A desired value that was not found, or a regular expression or other
   * pattern describing it.
   */
  wanted?: any

  /** actual value, which was not wanted */
  found?: any

  /** HTTP message, fetch.Response, or `@vltpkg/registry-client.CacheEntry` */
  response?:
    | Response
    | IncomingMessage
    | {
        statusCode: number
        headers: Record<string, string | string[]> | Buffer[]
        text: () => string
        [k: string | symbol | number]: any
      }

  /** string or URL object */
  url?: string | URL

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
        [k: string | symbol | number]: any
      }

  /** string or `@vltpkg/semver.Range` object */
  range?:
    | string
    | {
        raw: string
        isAny: boolean
        includePrerelease: boolean
        [k: string | symbol | number]: any
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
  max?: any

  /** minimum value, which was not met */
  min?: any
}

export type DuckTypeManifest = Record<string, any> & {
  name?: string
  version?: string
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
  defaultFrom: ((...a: any[]) => any) | (new (...a: any[]) => any),
  message: string,
  cause?: ErrorCause,
  from:
    | ((...a: any[]) => any)
    | (new (...a: any[]) => any) = defaultFrom,
) => {
  const er = new cls(message, cause ? { cause } : undefined)
  Error.captureStackTrace(er, from)
  return er
}

export const error = (
  message: string,
  cause?: ErrorCause,
  from?: ((...a: any[]) => any) | (new (...a: any[]) => any),
) => create(Error, error, message, cause, from)

export const typeError = (
  message: string,
  cause?: ErrorCause,
  from?: ((...a: any[]) => any) | (new (...a: any[]) => any),
) => create(TypeError, typeError, message, cause, from)

export const syntaxError = (
  message: string,
  cause?: ErrorCause,
  from?: ((...a: any[]) => any) | (new (...a: any[]) => any),
) => create(SyntaxError, syntaxError, message, cause, from)
