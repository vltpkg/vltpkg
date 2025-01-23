import { error } from '@vltpkg/error-cause'
import {
  type ChildProcess,
  type IOType,
  spawn,
  type SpawnOptions,
  type StdioOptions,
} from 'child_process'

const isPipe = (
  stdio:
    | Exclude<StdioOptions, IOType>[number]
    | StdioOptions = 'pipe',
  fd: number,
): stdio is IOTypePipe =>
  stdio === 'pipe' || stdio === 'overlapped' || stdio === null ? true
  : Array.isArray(stdio) ? isPipe(stdio[fd], fd)
  : false

export type IOTypeNoPipe = Exclude<IOType, IOTypePipe>
export type IOTypePipe = 'overlapped' | 'pipe' | null | undefined

export interface PromiseSpawnOptions extends SpawnOptions {
  stdioString?: boolean
  acceptFail?: boolean
}
export interface PromiseSpawnOptionsString
  extends PromiseSpawnOptions {
  stdioString?: true
}
export interface PromiseSpawnOptionsBuffer
  extends PromiseSpawnOptions {
  stdioString: false
}
export interface PromiseSpawnOptionsStdin
  extends PromiseSpawnOptions {
  stdio?:
    | Exclude<IOTypePipe, null>
    | [
        stdin?: IOTypePipe,
        stdout?: Exclude<StdioOptions, IOType>[number],
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
}
export interface PromiseSpawnOptionsNoStdin
  extends PromiseSpawnOptions {
  stdio:
    | IOTypeNoPipe
    | IOTypeNoPipe[]
    | [
        stdin: IOTypeNoPipe | number,
        stdout?: Exclude<StdioOptions, IOType>[number],
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
}
export interface PromiseSpawnOptionsStdout
  extends PromiseSpawnOptions {
  stdio?:
    | Exclude<IOTypePipe, null>
    | [
        stdin: Exclude<StdioOptions, IOType>[number] | undefined,
        stdout?: IOTypePipe,
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
}
export interface PromiseSpawnOptionsStdoutString
  extends PromiseSpawnOptionsStdout {
  stdioString?: true
}
export interface PromiseSpawnOptionsStdoutBuffer
  extends PromiseSpawnOptionsStdout {
  stdioString: false
}
export interface PromiseSpawnOptionsNoStdout
  extends PromiseSpawnOptions {
  stdio:
    | IOTypeNoPipe
    | IOTypeNoPipe[]
    | [
        stdin: Exclude<StdioOptions, IOType>[number] | undefined,
        stdout?: IOTypeNoPipe,
        stderr?: Exclude<StdioOptions, IOType>[number],
      ]
}
export interface PromiseSpawnOptionsStderr
  extends PromiseSpawnOptions {
  stdio?:
    | Exclude<IOTypePipe, null>
    | [
        stdin: Exclude<StdioOptions, IOType>[number] | undefined,
        stdout: Exclude<StdioOptions, IOType>[number] | undefined,
        stderr?: IOTypePipe,
      ]
}
export interface PromiseSpawnOptionsStderrString
  extends PromiseSpawnOptionsStderr {
  stdioString?: true
}
export interface PromiseSpawnOptionsStderrBuffer
  extends PromiseSpawnOptionsStderr {
  stdioString: false
}
export interface PromiseSpawnOptionsNoStderr
  extends PromiseSpawnOptions {
  stdio:
    | IOTypeNoPipe
    | IOTypeNoPipe[]
    | [
        stdin: Exclude<StdioOptions, IOType>[number] | undefined,
        stdout: Exclude<StdioOptions, IOType>[number] | undefined,
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

export interface SpawnResult {
  command: string
  args: string[]
  cwd: string
  status: number | null
  signal: NodeJS.Signals | null
  stdout: Buffer | string | null
  stderr: Buffer | string | null
}
export interface SpawnResultString extends SpawnResult {
  stdout: string | null
  stderr: string | null
}
export interface SpawnResultBuffer extends SpawnResult {
  stdout: Buffer | null
  stderr: Buffer | null
}
export interface SpawnResultStdout extends SpawnResult {
  stdout: Buffer | string
}
export interface SpawnResultStdoutString extends SpawnResultString {
  stdout: string
}
export interface SpawnResultStdoutBuffer extends SpawnResultBuffer {
  stdout: Buffer
}
export interface SpawnResultNoStdout extends SpawnResult {
  stdout: null
}
export interface SpawnResultStderr extends SpawnResult {
  stderr: Buffer | string
}
export interface SpawnResultStderrString extends SpawnResultString {
  stderr: string
}
export interface SpawnResultStderrBuffer extends SpawnResultBuffer {
  stderr: Buffer
}
export interface SpawnResultNoStderr extends SpawnResult {
  stderr: null
}
export interface SpawnResultNoStdio extends SpawnResult {
  stderr: null
  stdout: null
}
export interface SpawnResultStdioStrings extends SpawnResult {
  stdout: string
  stderr: string
}
export interface SpawnResultStdioBuffers extends SpawnResult {
  stdout: Buffer
  stderr: Buffer
}

export type Override<T, R> = Omit<T, keyof R> & R

export type SpawnResultByOptions<T extends PromiseSpawnOptions> =
  Override<
    SpawnResult,
    {
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
  >

export type ChildProcessByOptions<T extends PromiseSpawnOptions> =
  Override<
    ChildProcess,
    {
      stdin: T extends PromiseSpawnOptionsNoStdin ? null
      : Exclude<ChildProcess['stdin'], null>
      stdout: T extends PromiseSpawnOptionsNoStdout ? null
      : Exclude<ChildProcess['stdout'], null>
      stderr: T extends PromiseSpawnOptionsNoStderr ? null
      : Exclude<ChildProcess['stderr'], null>
    }
  >

/**
 * Subtype of Promise returned by {@link promiseSpawn}.
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
          .on('data', c => stdout.push(c as Buffer))
          .on('error', er => reject(er))
      }
      if (proc.stderr) {
        proc.stderr
          .on('data', c => stderr.push(c as Buffer))
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
