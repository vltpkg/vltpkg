import { error } from '@vltpkg/error-cause'
import {
  ChildProcess,
  IOType,
  spawn,
  SpawnOptions,
  StdioOptions,
} from 'child_process'

const isPipe = (
  stdio:
    | StdioOptions
    | Exclude<StdioOptions, IOType>[number] = 'pipe',
  fd: number,
): stdio is IOTypePipe =>
  stdio === 'pipe' || stdio === 'overlapped' || stdio === null ? true
  : Array.isArray(stdio) ? isPipe(stdio[fd], fd)
  : false

export type IOTypeNoPipe = Exclude<IOType, IOTypePipe>
export type IOTypePipe = 'pipe' | 'overlapped' | null | undefined
export type PromiseSpawnOptions = {
  stdioString?: boolean
  acceptFail?: boolean
} & SpawnOptions
export type PromiseSpawnOptionsString = {
  stdioString?: true
} & PromiseSpawnOptions
export type PromiseSpawnOptionsBuffer = {
  stdioString: false
} & PromiseSpawnOptions
export type PromiseSpawnOptionsStdin = {
  stdio?:
    | Exclude<IOTypePipe, null>
    | [
        stdin?: IOTypePipe,
        stdout?: Exclude<StdioOptions, IOType>[number],
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
} & PromiseSpawnOptions
export type PromiseSpawnOptionsNoStdin = {
  stdio:
    | IOTypeNoPipe
    | IOTypeNoPipe[]
    | [
        stdin: IOTypeNoPipe | number,
        stdout?: Exclude<StdioOptions, IOType>[number],
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
} & PromiseSpawnOptions
export type PromiseSpawnOptionsStdout = {
  stdio?:
    | Exclude<IOTypePipe, null>
    | [
        stdin: undefined | Exclude<StdioOptions, IOType>[number],
        stdout?: IOTypePipe,
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
} & PromiseSpawnOptions
export type PromiseSpawnOptionsStdoutString = {
  stdioString?: true
} & PromiseSpawnOptionsStdout
export type PromiseSpawnOptionsStdoutBuffer = {
  stdioString: false
} & PromiseSpawnOptionsStdout
export type PromiseSpawnOptionsNoStdout = {
  stdio:
    | IOTypeNoPipe
    | IOTypeNoPipe[]
    | [
        stdin: undefined | Exclude<StdioOptions, IOType>[number],
        stdout?: IOTypeNoPipe,
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
} & PromiseSpawnOptions
/* c8 ignore start - weird windows coverage bug */
export type PromiseSpawnOptionsStderr = {
  stdio?:
    | Exclude<IOTypePipe, null>
    | [
        stdin: undefined | Exclude<StdioOptions, IOType>[number],
        stdout: undefined | Exclude<StdioOptions, IOType>[number],
        stderr?: IOTypePipe,
      ]
} & PromiseSpawnOptions
/* c8 ignore stop */
export type PromiseSpawnOptionsStderrString = {
  stdioString?: true
} & PromiseSpawnOptionsStderr
export type PromiseSpawnOptionsStderrBuffer = {
  stdioString: false
} & PromiseSpawnOptionsStderr
export type PromiseSpawnOptionsNoStderr = PromiseSpawnOptions & {
  stdio:
    | IOTypeNoPipe
    | IOTypeNoPipe[]
    | [
        stdin: undefined | Exclude<StdioOptions, IOType>[number],
        stdout: undefined | Exclude<StdioOptions, IOType>[number],
        stderr: IOTypeNoPipe,
      ]
}

function stdioResult<O extends PromiseSpawnOptions>(
  stdout: Buffer[],
  stderr: Buffer[],
  o: O,
): {
  stdout: SpawnResultByOptions<O>['stdout']
  stderr: SpawnResultByOptions<O>['stderr']
} {
  return {
    stdout: (!isPipe(o.stdio, 1) ? null
    : o.stdioString !== false ?
      Buffer.concat(stdout).toString().trim()
    : Buffer.concat(stdout)) as SpawnResultByOptions<O>['stdout'],
    stderr: (!isPipe(o.stdio, 2) ? null
    : o.stdioString !== false ?
      Buffer.concat(stderr).toString().trim()
    : Buffer.concat(stderr)) as SpawnResultByOptions<O>['stderr'],
  }
}

export type SpawnResult = {
  command: string
  args: string[]
  cwd: string
  status: number | null
  signal: NodeJS.Signals | null
  stdout: Buffer | string | null
  stderr: Buffer | string | null
}
export type SpawnResultString = {
  stdout: string | null
  stderr: string | null
} & SpawnResult
export type SpawnResultBuffer = {
  stdout: Buffer | null
  stderr: Buffer | null
} & SpawnResult
export type SpawnResultStdout = {
  stdout: string | Buffer
} & SpawnResult
export type SpawnResultStdoutString = {
  stdout: string
} & SpawnResultString
export type SpawnResultStdoutBuffer = {
  stdout: Buffer
} & SpawnResultBuffer
export type SpawnResultNoStdout = {
  stdout: null
} & SpawnResult
export type SpawnResultStderr = {
  stderr: string | Buffer
} & SpawnResult
export type SpawnResultStderrString = {
  stderr: string
} & SpawnResultString
export type SpawnResultStderrBuffer = {
  stderr: Buffer
} & SpawnResultBuffer
export type SpawnResultNoStderr = {
  stderr: null
} & SpawnResult

export type SpawnResultNoStdio = {
  stderr: null
  stdout: null
} & SpawnResult
export type SpawnResultStdioStrings = {
  stdout: string
  stderr: string
} & SpawnResult
export type SpawnResultStdioBuffers = {
  stdout: Buffer
  stderr: Buffer
} & SpawnResult

export type SpawnResultByOptions<T extends PromiseSpawnOptions> =
  SpawnResult & {
    stdout: T extends PromiseSpawnOptionsNoStdout ? null
    : T extends PromiseSpawnOptionsStdoutBuffer ? Buffer
    : T extends PromiseSpawnOptionsStdoutString ? string
    : T extends PromiseSpawnOptionsBuffer ? Buffer | null
    : T extends PromiseSpawnOptionsString ? string | null
    : Buffer | string | null
    stderr: T extends PromiseSpawnOptionsNoStderr ? null
    : T extends PromiseSpawnOptionsStderrBuffer ? Buffer
    : T extends PromiseSpawnOptionsStderrString ? string
    : T extends PromiseSpawnOptionsBuffer ? Buffer | null
    : T extends PromiseSpawnOptionsString ? string | null
    : Buffer | string | null
  }

export type ChildProcessByOptions<T extends PromiseSpawnOptions> =
  ChildProcess & {
    stdin: T extends PromiseSpawnOptionsNoStdin ? null
    : Exclude<ChildProcess['stdin'], null>
    stdout: T extends PromiseSpawnOptionsNoStdout ? null
    : Exclude<ChildProcess['stdout'], null>
    stderr: T extends PromiseSpawnOptionsNoStderr ? null
    : Exclude<ChildProcess['stderr'], null>
  }

/**
 * Subtype of Promise returned by {@link spawnPromise}.
 *
 * Resolution value is inferred from the provided options.
 */
export class SpawnPromise<
  O extends PromiseSpawnOptions,
  T extends object = object,
> extends Promise<SpawnResultByOptions<O> & T> {
  [Symbol.toStringTag] = 'SpawnPromise'

  /** The spawned process this promise references */
  process!: ChildProcessByOptions<O>

  /** Expose the child process stdin, if available */
  stdin!: ChildProcessByOptions<O>['stdin']

  /**
   * Set static `Symbol.species` back to the base Promise class so that
   * v8 doesn't get confused by the changed constructor signature.
   */
  static get [Symbol.species]() {
    return Promise
  }

  constructor(
    command: string,
    args: string[],
    opts: O,
    extra: T = {} as T,
  ) {
    let proc!: ChildProcessByOptions<O>
    super((res, rej) => {
      proc = spawn(command, args, opts) as ChildProcessByOptions<O>
      const stdout: Buffer[] = []
      const stderr: Buffer[] = []
      const reject = (er: Error) =>
        rej(
          error('command failed', {
            command,
            args,
            cwd: opts.cwd ?? process.cwd(),
            ...stdioResult(stdout, stderr, opts),
            ...extra,
            cause: er,
          }),
        )
      proc.on('error', reject)
      if (proc.stdout) {
        proc.stdout
          .on('data', c => stdout.push(c))
          .on('error', er => reject(er))
      }
      if (proc.stderr) {
        proc.stderr
          .on('data', c => stderr.push(c))
          .on('error', er => reject(er))
      }
      proc.on('close', (status, signal) => {
        const result = {
          command,
          args,
          cwd: opts.cwd ?? process.cwd(),
          /* c8 ignore next 2 - because windows */
          status: status ?? null,
          signal: signal ?? null,
          ...stdioResult(stdout, stderr, opts),
          ...extra,
        } as SpawnResultByOptions<O> & T
        if ((status || signal) && !opts.acceptFail)
          rej(error('command failed', result))
        else res(result)
      })
    })
    this.process = proc
    this.stdin = proc.stdin
  }
}

/**
 * Spawn the specified command, and return a promise that resolves when
 * the process closes or has an error.
 */
export function promiseSpawn<
  O extends PromiseSpawnOptions = PromiseSpawnOptionsStderrString &
    PromiseSpawnOptionsStdoutString,
  E extends object = object,
>(command: string, args: string[], opts = {} as O, extra = {} as E) {
  return new SpawnPromise<O, E>(command, args, opts, extra)
}
