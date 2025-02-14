import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import { promiseSpawn } from '@vltpkg/promise-spawn'
import type {
  PromiseSpawnOptions,
  SpawnResultNoStdio,
  SpawnResultStdioStrings,
} from '@vltpkg/promise-spawn'
import type { Manifest } from '@vltpkg/types'
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
export type SharedOptions = PromiseSpawnOptions & {
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
  'script-shell'?: boolean | string
}

/**
 * Options for run() and runFG()
 */
export type RunOptions = SharedOptions & {
  /** the name of the thing in package.json#scripts */
  arg0: string
  /**
   * pass in a @vltpkg/package-json.PackageJson instance, and
   * it'll be used for reading the package.json file. Optional,
   * may improve performance somewhat.
   */
  packageJson?: PackageJson

  /**
   * Pass in a manifest to avoid having to read it at all
   */
  manifest?: Manifest

  /**
   * if the script is not defined in package.json#scripts, just ignore it and
   * treat as success. Otherwise, treat as an error. Default false.
   */
  ignoreMissing?: boolean

  /**
   * skip the pre/post commands, just run the one specified.
   * This can be used to run JUST the specified script, without any
   * pre/post commands.
   */
  ignorePrePost?: boolean
}

/**
 * Options for exec() and execFG()
 */
export type ExecOptions = SharedOptions & {
  /** the command to execute */
  arg0: string
}

/**
 * Options for runExec() and runExecFG()
 */
export type RunExecOptions = SharedOptions & {
  /**
   * Either the command to be executed, or the event to be run
   */
  arg0: string
  /**
   * pass in a @vltpkg/package-json.PackageJson instance, and
   * it'll be used for reading the package.json file. Optional,
   * may improve performance somewhat.
   */
  packageJson?: PackageJson
}

/**
 * Run a package.json#scripts event in the background
 */
export const run = async (options: RunOptions): Promise<RunResult> =>
  runImpl(options, exec, '')

/**
 * Run a package.json#scripts event in the foreground
 */
export const runFG = async (
  options: RunOptions,
): Promise<RunFGResult> => runImpl(options, execFG, null)

/** Return type of {@link run} */
export type RunResult = SpawnResultStdioStrings & {
  pre?: SpawnResultStdioStrings
  post?: SpawnResultStdioStrings
}

/** Return type of {@link runFG} */
export type RunFGResult = SpawnResultNoStdio & {
  pre?: SpawnResultNoStdio
  post?: SpawnResultNoStdio
}

export const isRunResult = (v: unknown): v is RunResult =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  'stdout' in v &&
  'stderr' in v &&
  'status' in v &&
  'signal' in v

/**
 * Return type of {@link run} or {@link runFG}, as determined by their base
 * type
 * @internal
 */
export type RunImplResult<
  R extends SpawnResultNoStdio | SpawnResultStdioStrings,
> = R & { pre?: R; post?: R }

/**
 * Internal implementation of run() and runFG(), since they're mostly identical
 */
const runImpl = async <
  R extends SpawnResultNoStdio | SpawnResultStdioStrings,
>(
  options: RunOptions,
  execImpl: (options: ExecOptions) => Promise<R>,
  empty: R['stdout'],
): Promise<RunImplResult<R>> => {
  const {
    arg0,
    packageJson = new PackageJson(),
    ignoreMissing = false,
    manifest,
    ...execArgs
  } = options
  const pjPath = resolve(options.cwd, 'package.json')
  // npm adds a `"install": "node-gyp rebuild"` if a binding.gyp
  // is present at the time of publish, EVEN IF it's not included
  // in the package. So, we need to read the actual package.json
  // in those cases.
  const untrustworthy = !!(
    manifest?.gypfile &&
    arg0 === 'install' &&
    manifest.scripts?.install === 'node-gyp rebuild'
  )
  const pj =
    (untrustworthy ? undefined : manifest) ??
    packageJson.read(options.cwd)
  const { scripts } = pj
  const command = scripts?.[arg0]
  if (!command) {
    if (ignoreMissing) {
      return {
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
      } as R
    }
    throw error('Script not defined in package.json', {
      name: arg0,
      cwd: options.cwd,
      args: options.args,
      path: pjPath,
      manifest: pj,
    })
  }

  const precommand = !options.ignorePrePost && scripts[`pre${arg0}`]
  const pre =
    precommand ?
      await execImpl({
        arg0: precommand,
        ...execArgs,
        args: [],
        env: {
          ...execArgs.env,
          npm_package_json: pjPath,
          npm_lifecycle_event: `pre${arg0}`,
          npm_lifecycle_script: precommand,
        },
      })
    : undefined
  if (pre && (pre.status || pre.signal)) {
    return pre as RunImplResult<R>
  }
  const result: RunImplResult<R> = await execImpl({
    arg0: command,
    ...execArgs,
    env: {
      ...execArgs.env,
      npm_package_json: pjPath,
      npm_lifecycle_event: arg0,
      npm_lifecycle_script: command,
    },
  })
  result.pre = pre
  if (result.signal || result.status) {
    return result
  }

  const postcommand = !options.ignorePrePost && scripts[`post${arg0}`]
  if (!postcommand) return result

  const post = await execImpl({
    arg0: postcommand,
    ...execArgs,
    args: [],
    env: {
      ...execArgs.env,
      npm_package_json: pjPath,
      npm_lifecycle_event: `post${arg0}`,
      npm_lifecycle_script: postcommand,
    },
  })

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
export const exec = async (
  options: ExecOptions,
): Promise<SpawnResultStdioStrings> => {
  const {
    arg0,
    args = [],
    cwd,
    env = {},
    projectRoot,
    'script-shell': shell = true,
    ...spawnOptions
  } = options

  const p = promiseSpawn(arg0, args, {
    ...spawnOptions,
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
  proxySignals(p.process)
  return await p
}

/**
 * Execute an arbitrary command in the foreground
 */
export const execFG = async (
  options: ExecOptions,
): Promise<SpawnResultNoStdio> => {
  const {
    arg0,
    args = [],
    cwd,
    projectRoot,
    env = {},
    'script-shell': shell = true,
    ...spawnOptions
  } = options

  return new Promise<SpawnResultNoStdio>(res => {
    foregroundChild(
      arg0,
      args,
      {
        ...spawnOptions,
        shell,
        cwd,
        env: addPaths(projectRoot, cwd, {
          ...process.env,
          ...env,
        }),
      },
      (status, signal) => {
        res({
          command: arg0,
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
  })
}

const runExecImpl = async <
  R extends SpawnResultNoStdio | SpawnResultStdioStrings,
>(
  options: RunExecOptions,
  runImpl: (options: RunOptions) => Promise<RunImplResult<R>>,
  execImpl: (options: ExecOptions) => Promise<R>,
): Promise<R | RunImplResult<R>> => {
  const { arg0, packageJson = new PackageJson(), ...args } = options
  const pj = packageJson.read(options.cwd)
  const { scripts } = pj
  const command = scripts?.[arg0]
  if (command) {
    return runImpl({ ...args, packageJson, arg0 })
  } else {
    return execImpl({ ...args, arg0 })
  }
}

/**
 * If the arg0 is a defined package.json script, then run(), otherwise exec()
 */
export const runExec = async (
  options: RunExecOptions,
): Promise<RunResult | SpawnResultStdioStrings> =>
  runExecImpl<SpawnResultStdioStrings>(options, run, exec)

/**
 * If the arg0 is a defined package.json script, then runFG(), otherwise
 * execFG()
 */
export const runExecFG = async (
  options: RunExecOptions,
): Promise<RunFGResult | SpawnResultNoStdio> =>
  runExecImpl<SpawnResultNoStdio>(options, runFG, execFG)
