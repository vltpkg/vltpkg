/**
 * Module that handles all vlt configuration needs
 *
 * Project-level configs are set in a `vlt.json` file in the local project
 * if present. This will override the user-level configs in the appropriate
 * XDG config path.
 *
 * Command-specific configuration can be specified by putting options in a
 * field in the `command` object. For example:
 *
 * ```json
 * {
 *   "registry": "https://registry.npmjs.org",
 *   "command": {
 *     "publish": {
 *       "registry": "http://registry.internal"
 *     }
 *   }
 * }
 * ```
 *
 * @module
 */

import { error } from '@vltpkg/error-cause'
import { XDG } from '@vltpkg/xdg'
import { lstat, mkdir, readFile, writeFile } from 'fs/promises'
import { Jack, OptionsResults, Unwrap } from 'jackspeak'
import { homedir } from 'os'
import { dirname, resolve } from 'path'
import {
  kIndent,
  kNewline,
  parse as jsonParse,
  stringify as jsonStringify,
} from 'polite-json'
import { walkUp } from 'walk-up-path'
import { definition, recordFields } from './definition.js'

export { recordFields }
export type { definition }

// deep merge 2 objects
// scalars are overwritten, objects are folded in together
// if nothing to be added, then return the base object.
const merge = <T extends Record<string, any>>(base: T, add: T): T =>
  Object.fromEntries(
    Object.entries(base)
      .map(([k, v]) => [
        k,
        add[k] === undefined ? v
        : (
          !!v &&
          typeof v === 'object' &&
          !!add[k] &&
          typeof add[k] === 'object'
        ) ?
          merge(v, add[k])
        : add[k],
      ])
      .concat(
        Object.entries(add).map(([k, v]) => [
          k,
          (
            !!v &&
            !!base[k] &&
            typeof v === 'object' &&
            typeof base[k] === 'object'
          ) ?
            merge(base[k], v)
          : v,
        ]),
      ),
  ) as T

// if the pairs do not reduce cleanly due to a non-pair being found,
// return the set of strings unchanged.
const reducePairs = <T extends string[]>(
  pairs: T,
): T | Record<string, string> => {
  const record: Record<string, string> = {}
  for (const kv of pairs) {
    const eq = kv.indexOf('=')
    if (eq === -1) record[kv] = ''
    else {
      const key = kv.substring(0, eq)
      const val = kv.substring(eq + 1)
      record[key] = val
    }
  }
  return record
}

const isRecordField = (k: string, v: unknown): v is string[] =>
  Array.isArray(v) &&
  recordFields.includes(k as (typeof recordFields)[number])

const pairsToRecords = (obj: ConfigFileData): ConfigData => {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      k === 'command' && v && typeof v === 'object' ?
        Object.fromEntries(
          Object.entries(v).map(([k, v]) => [
            k,
            pairsToRecords(v as ConfigFileData),
          ]),
        )
      : isRecordField(k, v) ? reducePairs(v)
      : v,
    ]),
  )
}

const recordsToPairs = (
  obj: Record<string | symbol, any>,
): Record<string | symbol, any> => {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      k === 'command' && v && typeof v === 'object' ?
        recordsToPairs(v)
      : !v || typeof v !== 'object' || Array.isArray(v) ? v
      : Object.entries(v).map(([k, v]) => `${k}=${v}`),
    ]),
  )
}

const kRecord = Symbol('parsed key=value record')
const exists = (f: string) =>
  lstat(f).then(
    () => true,
    () => false,
  )

const home = homedir()
const xdg = new XDG('vlt')

/**
 * Config data can be any options, and also a 'command' field which
 * contains command names and override options for that command.
 */
export type ConfigData = OptionsResults<ConfigDefinitions> & {
  command?: Record<string, OptionsResults<ConfigDefinitions>>
}

/**
 * Config data as it appears in config files, with kv pair lists
 * stored as `Record<string, string>`.
 */
export type ConfigFileData = {
  [k in keyof ConfigData]?: k extends OptListKeys<ConfigData> ?
    string[] | Record<string, string>
  : k extends 'command' ? Record<string, ConfigFileData>
  : ConfigData[k]
}

/**
 * The base config definition set as a type
 */
export type ConfigDefinitions = Unwrap<typeof definition>

export type StringListKeys<O> = {
  [k in keyof O]: O[k] extends string[] | undefined ? k : never
}
export type OptListKeys<O> = Exclude<
  StringListKeys<O>[keyof StringListKeys<O>],
  undefined
>

/**
 * Class that handles configuration for vlt.
 *
 * Call {@link @vltpkg/config!index.Config.load} to get one of these.
 */
export class Config {
  /**
   * The {@link https://npmjs.com/jackspeak | JackSpeak} object
   * representing vlt's configuration
   */
  jack: Jack<ConfigDefinitions>

  stringifyOptions: {
    [kIndent]: string
    [kNewline]: string
  } = { [kIndent]: '  ', [kNewline]: '\n' }

  /**
   * Parsed values in effect
   */
  values?: OptionsResults<ConfigDefinitions>

  /**
   * A flattened object of the parsed configuration
   */
  get options(): ConfigFileData {
    if (this.#options) return this.#options
    this.#options = pairsToRecords(this.parse().values)
    return this.#options
  }
  // memoized options() getter value
  #options?: ConfigFileData

  /**
   * positional arguments to the vlt process
   */
  positionals?: string[]

  /**
   * The root of the project where a vlt.json, vlt-workspaces.json,
   * package.json, or .git was found. Not necessarily the `process.cwd()`,
   * though that is the default location.
   *
   * Never walks up as far as `$HOME`. So for example, if a project is in
   * `~/projects/xyz`, then the highest dir it will check is `~/projects`
   */
  cwd: string

  /**
   * Which command name to use for overriding with command-specific values
   */
  command?: string

  constructor(
    jack: Jack<ConfigDefinitions> = definition,
    cwd = process.cwd(),
    command?: string,
  ) {
    this.cwd = cwd
    this.command = command
    this.jack = jack
  }

  /**
   * Parse the arguments and set configuration and positionals accordingly.
   */
  parse(args: string[] = process.argv): this & {
    values: OptionsResults<ConfigDefinitions>
    positionals: string[]
  } {
    const v = this.values
    const p = this.positionals
    if (v && p) {
      return this as this & {
        values: OptionsResults<ConfigDefinitions>
        positionals: string[]
      }
    }
    const { values, positionals } = this.jack.parse(args)
    return Object.assign(this, { values, positionals })
  }

  /**
   * Get a `key=value` list option value as an object.
   *
   * For example, a list option with a vlaue of `['key=value', 'xyz=as=df' ]`
   * would be returned as `{key: 'value', xyz: 'as=df'}`
   *
   * Results are memoized, so subsequent calls for the same key will return the
   * same object. If new strings are added to the list, then the memoized value
   * is *not* updated, so only use once configurations have been fully loaded.
   *
   * If the config value is not set at all, an empty object is returned.
   */
  getRecord<K extends OptListKeys<ConfigData>>(
    k: K,
  ): Record<string, string> {
    const pairs = this.get(k) as
      | undefined
      | (string[] & { [kRecord]?: Record<string, string> })
    if (!pairs) return {}
    if (pairs[kRecord]) return pairs[kRecord]
    const kv = pairs.reduce((kv: Record<string, string>, pair) => {
      const eq = pair.indexOf('=')
      if (eq === -1) return kv
      const key = pair.substring(0, eq)
      const val = pair.substring(eq + 1)
      kv[key] = val
      return kv
    }, {})
    Object.assign(pairs, { [kRecord]: kv })
    return kv
  }

  /**
   * Get a configuration value.
   *
   * Note: `key=value` pair configs are returned as a string array. To get them
   * as an object, use {@link Config#getRecord}.
   */
  get<K extends keyof OptionsResults<ConfigDefinitions>>(
    k: K,
  ): OptionsResults<ConfigDefinitions>[K] {
    return (this.values ?? this.parse().values)[k]
  }

  /**
   * Write the config values to the project config file.
   */
  async writeProjectConfig(values: ConfigFileData) {
    await writeFile(
      resolve(this.cwd, 'vlt.json'),
      jsonStringify(
        Object.assign(pairsToRecords(values), this.stringifyOptions),
      ),
    )
  }

  /**
   * Write the config values to the user config file.
   */
  async writeUserConfig(values: ConfigFileData) {
    const f = xdg.config('vlt.json')
    await mkdir(dirname(f), { recursive: true })
    await writeFile(
      f,
      jsonStringify(
        Object.assign(pairsToRecords(values), this.stringifyOptions),
      ),
    )
    return values
  }

  /**
   * Fold in the provided fields with the existing properties
   * in the project config file.
   */
  async addProjectConfig(values: ConfigData) {
    const f = resolve(this.cwd, 'vlt.json')
    return this.writeProjectConfig(
      merge((await this.#maybeLoadConfigFile(f)) ?? {}, values),
    )
  }

  /**
   * Fold in the provided fields with the existing properties
   * in the project config file.
   */
  async addUserConfig(values: ConfigData) {
    const f = xdg.config('vlt.json')
    return this.writeUserConfig(
      merge((await this.#maybeLoadConfigFile(f)) ?? {}, values),
    )
  }

  /**
   * if the file exists, parse and load it. returns object if data was
   * loaded, or undefined if not.
   * */
  async #maybeLoadConfigFile(
    file: string,
  ): Promise<ConfigData | undefined> {
    const data = await readFile(file, 'utf8').catch(() => {})
    if (!data) return undefined
    let result: any
    try {
      result = jsonParse(data)
      if (result[kIndent] !== undefined)
        this.stringifyOptions[kIndent] = result[kIndent]
      if (result[kNewline] !== undefined)
        this.stringifyOptions[kNewline] = result[kNewline]
    } catch (er) {
      throw error('failed to parse vlt config file', {
        path: file,
        cause: er as Error,
      })
    }
    if (result && typeof result === 'object') {
      if (this.command && result.command?.[this.command]) {
        result = merge(result, result.command[this.command])
      }
    }
    try {
      const { command, ...values } = recordsToPairs(result)
      this.jack.setConfigValues(values)
      return result
    } catch (er) {
      throw error('failed to load config values from file', {
        path: file,
        cause: er as Error,
      })
    }
  }

  /**
   * Find the local config file and load both it and the user-level config in
   * the XDG config home.
   */
  async loadConfigFile(): Promise<this> {
    const userConfig = xdg.config('vlt.json')
    await this.#maybeLoadConfigFile(userConfig)

    // don't walk up past a folder containing any of these
    const stops = ['vlt-workspaces.json', '.git']
    // indicators that this *may* be the root, if no .git or workspaces
    // file is found higher up in the search.
    let foundLikelyRoot: boolean = false
    const likelies = ['package.json', 'node_modules']
    for (const dir of walkUp(this.cwd)) {
      // don't look in ~
      if (dir === home) break
      const projectConfig = resolve(dir, 'vlt.json')
      if (projectConfig === userConfig) break
      if (await this.#maybeLoadConfigFile(resolve(dir, 'vlt.json'))) {
        this.cwd = dir
        break
      }
      if (
        !foundLikelyRoot &&
        (await Promise.all(likelies))
          .map(s => exists(resolve(dir, s)))
          .find(x => x)
      ) {
        foundLikelyRoot = true
        this.cwd = dir
      }
      if (
        (
          await Promise.all(stops.map(s => exists(resolve(dir, s))))
        ).find(x => x)
      ) {
        this.cwd = dir
        break
      }
    }
    return this
  }

  /**
   * Determine whether we should use colors in the output. Update
   * chalk appropriately.
   *
   * Implicitly calls this.parse() if it not parsed already.
   */
  async loadColor(): Promise<
    this & {
      get(key: 'color'): boolean
      values: OptionsResults<ConfigDefinitions>
      positionals: string[]
    }
  > {
    let c = this.get('color')
    const chalk = (await import('chalk')).default
    let color: boolean
    if (
      process.env.NO_COLOR !== '1' &&
      (c === true || (c === undefined && chalk.level > 0))
    ) {
      color = true
      chalk.level = Math.max(chalk.level, 1) as 0 | 1 | 2 | 3
      process.env.FORCE_COLOR = String(chalk.level)
      delete process.env.NO_COLOR
    } else {
      color = false
      chalk.level = 0
      process.env.FORCE_COLOR = '0'
      process.env.NO_COLOR = '1'
    }
    const { values = this.parse().values } = this
    ;(values as ConfigData & { color: boolean }).color = color
    return this as this & {
      values: OptionsResults<ConfigDefinitions>
      positionals: string[]
      get(k: 'color'): boolean
    }
  }

  /**
   * cache of the loaded config
   */
  static #loaded: LoadedConfig | undefined

  /**
   * Load the configuration and return a Promise to a
   * {@link @vltpkg/config!index.Config} object
   */
  static async load(
    cwd = process.cwd(),
    command?: string,
    /**
     * only used in tests, resets the memoization
     * @internal
     */
    reload: boolean = false,
  ): Promise<LoadedConfig> {
    if (this.#loaded && !reload) return this.#loaded
    const a = new Config(definition, cwd, command)
    const b = await a.loadConfigFile()
    const c = await b.loadColor()
    this.#loaded = c
    return this.#loaded
  }
}

/**
 * A fully loaded {@link @vltpkg/config!index.Config} object
 */
export type LoadedConfig = Config & {
  get(k: 'color'): boolean
  cwd: string
  values: OptionsResults<ConfigDefinitions>
  positionals: string[]
}
