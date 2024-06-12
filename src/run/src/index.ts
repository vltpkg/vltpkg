import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import {
  promiseSpawn,
  PromiseSpawnOptions,
  type SpawnResultNoStderr,
  type SpawnResultNoStdout,
  type SpawnResultStderrString,
  type SpawnResultStdoutString,
} from '@vltpkg/promise-spawn'
import { foregroundChild } from 'foreground-child'
import { proxySignals } from 'foreground-child/proxy-signals'
import { statSync } from 'node:fs'
import { delimiter, resolve } from 'node:path'
import { walkUp } from 'walk-up-path'

/** map of which node_modules/.bin folders exist */
const dotBins = new Map<string, boolean>()

/** Check if a directory exists, and cache result */
const dirExists = (p: string) => {
  const cached = dotBins.get(p)
  if (cached !== undefined) return cached
  try {
    const isDir = statSync(p).isDirectory()
    dotBins.set(p, isDir)
    return isDir
  } catch {
    dotBins.set(p, false)
    return false
  }
}

/**
 * Add all exsting `node_modules/.bin` folders to the PATH that
 * exist between the cwd and the projectRoot, so dependency bins
 * are found, with closer paths higher priority.
 */
const addPaths = (
  projectRoot: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => {
  const { PATH = '' } = env
  const paths = new Set<string>()
  for (const p of walkUp(cwd)) {
    const dotBin = resolve(p, 'node_modules/.bin')
    if (dirExists(dotBin)) paths.add(dotBin)
    if (p === projectRoot) break
  }
  for (const p of PATH.split(delimiter)) {
    /* c8 ignore next - pretty rare to have an empty entry */
    if (p) paths.add(p)
  }
  env.PATH = [...paths].join(delimiter)
  return env
}

/** options shared by run() and exec() */
export interface SharedOptions extends PromiseSpawnOptions {
  /** additional arguments to pass to the command */
  args?: string[]
  /** the root of the project, which we don't walk up past */
  projectRoot: string

  /** the directory where the package.json lives and the script runs */
  cwd: string
  /**
   * environment variables to set. `process.env` is always included,
   * to omit fields, set them explicitly to undefined.
   *
   * vlt will add some of its own, as well:
   * - npm_lifecycle_event: the event name
   * - npm_lifecycle_script: the command in package.json#scripts
   * - npm_package_json: path to the package.json file
   * - VLT_* envs for all vlt configuration values that are set
   */
  env?: NodeJS.ProcessEnv
  /**
   * the shell to run the script in. If not set, then the default
   * platform-specific shell will be used.
   */
  'script-shell'?: string
}

/**
 * Options for run() and runFG()
 */
export interface RunOptions extends SharedOptions {
  /** the name of the thing in package.json#scripts */
  event: string
  /**
   * pass in a @vltpkg/package-json.PackageJson instance, and
   * it'll be used for reading the package.json file. Optional,
   * may improve performance somewhat.
   */
  packageJson?: PackageJson

  /**
   * if the script is not defined in package.json#scripts, just ignore it and
   * treat as success. Otherwise, treat as an error. Default false.
   */
  ignoreMissing?: boolean
}

/**
 * Options for exec() and execFG()
 */
export interface ExecOptions extends SharedOptions {
  /** the command to execute */
  command: string
}

/**
 * Run a package.json#scripts event in the background
 */
export const run = async (options: RunOptions) =>
  runImpl(options, exec, '')

/**
 * Run a package.json#scripts event in the foreground
 */
export const runFG = async (options: RunOptions) =>
  runImpl(options, execFG, null)

/**
 * Internal implementation of run() and runFG(), since they're mostly identical
 */
const runImpl = async <
  R extends
    | (SpawnResultNoStderr & SpawnResultNoStdout)
    | (SpawnResultStderrString & SpawnResultStdoutString),
>(
  options: RunOptions,
  execImpl: (options: ExecOptions) => Promise<R>,
  empty: R['stdout'],
): Promise<R & { pre?: R; post?: R }> => {
  const {
    event,
    packageJson = new PackageJson(),
    ignoreMissing = false,
    ...execArgs
  } = options
  const pjPath = resolve(options.cwd, 'package.json')
  const pj = packageJson.read(options.cwd)
  const { scripts } = pj
  const command = scripts?.[event]
  if (!command) {
    if (ignoreMissing) {
      return Promise.resolve({
        command: '',
        /* c8 ignore next */
        args: execArgs.args ?? [],
        cwd: options.cwd,
        status: 0,
        signal: null,
        stdout: empty,
        stderr: empty,
        // `as` to workaround "could be instantiated with arbitrary type".
        // it's private and used in 2 places, we know that it isn't.
      } as R)
    }
    throw error('Script not defined in package.json', {
      name: event,
      cwd: options.cwd,
      args: options.args,
      path: pjPath,
    })
  }

  const precommand = scripts[`pre${event}`]
  const pre =
    precommand ?
      await execImpl({
        command: precommand,
        ...execArgs,
        env: {
          ...execArgs.env,
          npm_package_json: pjPath,
          npm_lifecycle_event: `pre${event}`,
          npm_lifecycle_script: command,
        },
      })
    : undefined
  if (pre && (pre.status || pre.signal)) {
    return pre
  }
  const result: R & { pre?: R; post?: R } = await execImpl({
    command,
    ...execArgs,
    env: {
      ...execArgs.env,
      npm_package_json: pjPath,
      npm_lifecycle_event: event,
      npm_lifecycle_script: command,
    },
  })
  result.pre = pre
  if (result.signal || result.status) {
    return result
  }

  const postcommand = scripts[`post${event}`]
  if (!postcommand) return result

  const post = await execImpl({
    command: postcommand,
    ...execArgs,
    env: {
      ...execArgs.env,
      npm_package_json: pjPath,
      npm_lifecycle_event: `post${event}`,
      npm_lifecycle_script: command,
    },
  })
  console.error('GOT POST', post)
  if (post.status || post.signal) {
    const { status, signal } = post
    return Object.assign(result, { post, status, signal })
  }
  result.post = post
  return result
}

/**
 * Execute an arbitrary command in the background
 */
export const exec = async (options: ExecOptions) => {
  const {
    command,
    args = [],
    cwd,
    env = {},
    projectRoot,
    'script-shell': shell = true,
  } = options

  const p = promiseSpawn(command, args, {
    ...options,
    shell,
    stdio: 'pipe',
    stdioString: true,
    cwd,
    env: addPaths(projectRoot, cwd, {
      ...process.env,
      ...env,
    }),
    windowsHide: true,
  })
  p.process.stdout
  proxySignals(p.process)
  return await p
}

/**
 * Execute an arbitrary command in the foreground
 */
export const execFG = async (options: ExecOptions) => {
  const {
    command,
    args = [],
    cwd,
    projectRoot,
    env = {},
    'script-shell': shell = true,
  } = options

  return new Promise<SpawnResultNoStderr & SpawnResultNoStdout>(
    res => {
      foregroundChild(
        command,
        args,
        {
          ...options,
          shell,
          cwd,
          env: addPaths(projectRoot, cwd, {
            ...process.env,
            ...env,
          }),
        },
        (status, signal) => {
          res({
            command,
            args,
            cwd,
            stdout: null,
            stderr: null,
            status,
            signal,
          })
          return false
        },
      )
    },
  )
}
