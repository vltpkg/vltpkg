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
import { readFileSync, rmSync, writeFileSync } from 'fs'
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
import {
  type Commands,
  commands,
  definition,
  isRecordField,
  recordFields,
} from './definition.js'
import { merge } from './merge.js'
export { recordFields, isRecordField }
export { definition, commands, Commands }

// turn a set of pairs into a Record object.
// if a kv pair doesn't have a = character, set to `''`
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

const isRecordFieldValue = (k: string, v: unknown): v is string[] =>
  Array.isArray(v) &&
  recordFields.includes(k as (typeof recordFields)[number])

export const pairsToRecords = (obj: ConfigFileData): ConfigData => {
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
      : isRecordFieldValue(k, v) ? reducePairs(v)
      : v,
    ]),
  )
}

export const recordsToPairs = (
  obj: Record<string | symbol, any>,
): Record<string | symbol, any> => {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      k === 'command' && v && typeof v === 'object' ?
        recordsToPairs(v)
      : (
        !v ||
        typeof v !== 'object' ||
        Array.isArray(v) ||
        !isRecordField(k)
      ) ?
        v
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
 * Call {@link Config.load} to get one of these.
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

  configFiles: Record<string, ConfigFileData> = {}

  /**
   * Parsed values in effect
   */
  values?: OptionsResults<ConfigDefinitions>

  /**
   * Command-specific config values
   */
  commandValues: {
    [cmd in Commands[keyof Commands]]?: ConfigData
  } = {}

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
  projectRoot: string

  /**
   * Record<alias, canonical name> to dereference command aliases.
   */
  commands: Commands

  /**
   * Which command name to use for overriding with command-specific values,
   * determined from the argv when parse() is called.
   */
  command?: Commands[keyof Commands]

  constructor(
    jack: Jack<ConfigDefinitions> = definition,
    projectRoot = process.cwd(),
  ) {
    this.projectRoot = projectRoot
    this.commands = commands
    this.jack = jack
  }

  /**
   * Parse the arguments and set configuration and positionals accordingly.
   */
  parse(args: string[] = process.argv): this & {
    values: OptionsResults<ConfigDefinitions>
    positionals: string[]
  } {
    if (this.values && this.positionals) {
      return this as this & {
        values: OptionsResults<ConfigDefinitions>
        positionals: string[]
      }
    }
    this.jack.loadEnvDefaults()
    const p = this.jack.parseRaw(args)
    const fallback = p.values[
      'fallback-command'
    ] as Commands[keyof Commands]
    const argv0 = p.positionals[0]
    const cmd =
      typeof argv0 === 'string' ?
        this.commands[argv0 as keyof Commands]
      : null
    if (cmd) {
      this.command = cmd
    }
    const cmdSpecific = this.commandValues[this.command || fallback]
    if (cmdSpecific) {
      this.jack.setConfigValues(recordsToPairs(cmdSpecific))
    }

    // ok, applied cmd-specific defaults, do rest of the parse
    this.jack.applyDefaults(p)
    this.jack.writeEnv(p)

    if (cmd) p.positionals.shift()
    else {
      this.command = p.values[
        'fallback-command'
      ] as Commands[keyof Commands]
    }
    return Object.assign(this, p)
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
  getRecord(k: OptListKeys<ConfigData>): Record<string, string> {
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
    /* c8 ignore next -- impossible but TS doesn't know that */
    return (this.values ?? this.parse().values)[k]
  }

  /**
   * Write the config values to the user or project config file.
   */
  async writeConfigFile(
    which: 'user' | 'project',
    values: ConfigFileData,
  ) {
    const f = this.getFilename(which)
    await mkdir(dirname(f), { recursive: true })
    const vals = Object.assign(
      pairsToRecords(values),
      this.stringifyOptions,
    )
    await writeFile(f, jsonStringify(vals))
    this.configFiles[f] = vals
    return values
  }

  /**
   * Fold in the provided fields with the existing properties
   * in the config file.
   */
  async addConfigToFile(
    which: 'user' | 'project',
    values: ConfigFileData,
  ) {
    const f = this.getFilename(which)
    return this.writeConfigFile(
      which,
      merge((await this.#maybeLoadConfigFile(f)) ?? {}, values),
    )
  }

  /**
   * if the file exists, parse and load it. returns object if data was
   * loaded, or undefined if not.
   */
  async #maybeLoadConfigFile(
    file: string,
  ): Promise<ConfigFileData | undefined> {
    const result = await this.#readConfigFile(file)

    if (result) {
      try {
        const { command, ...values } = recordsToPairs(result)
        if (command) {
          for (const [c, opts] of Object.entries(command)) {
            const cmd =
              c in commands ? commands[c as keyof Commands] : null
            if (cmd) {
              this.commandValues[cmd] = merge(
                this.commandValues[cmd] ?? {},
                opts as ConfigData,
              )
            }
          }
        }
        this.jack.setConfigValues(values, file)
        return result
      } catch (er) {
        throw error('failed to load config values from file', {
          path: file,
          cause: er as Error,
        })
      }
    }
  }

  async #readConfigFile(
    file: string,
  ): Promise<ConfigFileData | undefined> {
    if (this.configFiles[file]) return this.configFiles[file]
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
    this.configFiles[file] = result
    return result
  }

  getFilename(which: 'user' | 'project' = 'project'): string {
    return which === 'user' ?
        xdg.config('vlt.json')
      : resolve(this.projectRoot, 'vlt.json')
  }

  async deleteConfigKeys(
    which: 'user' | 'project',
    fields: string[],
  ) {
    const file = this.getFilename(which)
    const data = await this.#maybeLoadConfigFile(file)
    if (!data) {
      rmSync(file, { force: true })
      return false
    }
    let didSomething = false
    for (const f of fields) {
      const [key, ...sk] = f.split('.') as [
        h: string,
        ...rest: string[],
      ]
      const subs = sk.join('.')
      const k = key as keyof ConfigDefinitions
      const v = data[k]
      if (v === undefined) continue
      if (subs && v && typeof v === 'object') {
        if (Array.isArray(v)) {
          const i = v.findIndex(subvalue =>
            subvalue.startsWith(`${subs}=`),
          )
          if (i !== -1) {
            v.splice(i, 1)
            if (v.length === 0) delete data[k]
            didSomething = true
          }
        } else {
          if (v[subs] !== undefined) {
            delete v[subs]
            if (Object.keys(v).length === 0) delete data[k]
            didSomething = true
          }
        }
      } else {
        didSomething = true
        delete data[k]
      }
    }
    const d = jsonStringify(data)
    if (d.trim() === '{}') {
      rmSync(file, { force: true })
    } else {
      writeFileSync(file, jsonStringify(data))
    }
    return didSomething
  }

  /**
   * Edit the user or project configuration file.
   *
   * If the file isn't present, then it starts with `{}` so the user has
   * something to work with.
   *
   * If the result is not valid, or no config settings are contained in the
   * file after editing, then it's restored to what it was before, which might
   * mean deleting the file.
   */
  async editConfigFile(
    which: 'user' | 'project',
    edit: (file: string) => void | Promise<void>,
  ) {
    const file = this.getFilename(which)
    const backup = this.configFiles[file]
    if (!backup) {
      writeFileSync(file, '{\n\n}\n')
    }
    await edit(file)
    let valid = false
    try {
      const res = jsonParse(readFileSync(file, 'utf8'))
      if (!res || typeof res !== 'object' || Array.isArray(res)) {
        throw error('Invalid configuration, expected object', {
          path: file,
          found: res,
        })
      }
      if (Object.keys(res).length === 0) {
        // nothing there, remove file
        delete this.configFiles[file]
        rmSync(file, { force: true })
      } else {
        this.jack.setConfigValues(recordsToPairs(res))
        this.configFiles[file] = res as ConfigFileData
      }
      valid = true
    } finally {
      if (!valid) {
        if (backup) {
          writeFileSync(file, jsonStringify(backup))
        } else {
          rmSync(file, { force: true })
        }
      }
    }
  }

  /**
   * Find the local config file and load both it and the user-level config in
   * the XDG config home.
   *
   * Note: if working in a workspaces monorepo, then the vlt.json file MUST
   * be in the same folder as the vlt-workspaces.json file, because we stop
   * looking when we find either one.
   */
  async loadConfigFile(): Promise<this> {
    const userConfig = xdg.config('vlt.json')
    await this.#maybeLoadConfigFile(userConfig)

    // don't walk up past a folder containing any of these
    const stops = ['vlt-workspaces.json', '.git']
    // indicators that this *may* be the root, if no .git or workspaces
    // file is found higher up in the search.
    let foundLikelyRoot = false
    const likelies = ['package.json', 'node_modules']
    for (const dir of walkUp(this.projectRoot)) {
      // don't look in ~
      if (dir === home) break
      const projectConfig = resolve(dir, 'vlt.json')
      if (projectConfig === userConfig) break
      if (await this.#maybeLoadConfigFile(resolve(dir, 'vlt.json'))) {
        this.projectRoot = dir
        break
      }
      if (
        !foundLikelyRoot &&
        (
          await Promise.all(
            likelies.map(s => exists(resolve(dir, s))),
          )
        ).find(x => x)
      ) {
        foundLikelyRoot = true
        this.projectRoot = dir
      }
      if (
        (
          await Promise.all(stops.map(s => exists(resolve(dir, s))))
        ).find(x => x)
      ) {
        this.projectRoot = dir
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
    const c = this.get('color')
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
   * {@link Config} object
   */
  static async load(
    projectRoot = process.cwd(),
    argv = process.argv,
    /**
     * only used in tests, resets the memoization
     * @internal
     */
    reload = false,
  ): Promise<LoadedConfig> {
    if (this.#loaded && !reload) return this.#loaded
    const a = new Config(definition, projectRoot)
    const b = await a.loadConfigFile()
    const c = await b.parse(argv).loadColor()
    this.#loaded = c as LoadedConfig
    return this.#loaded
  }
}

/**
 * A fully loaded {@link Config} object
 */
export type LoadedConfig = Config & {
  get(k: 'color'): boolean
  values: OptionsResults<ConfigDefinitions>
  positionals: string[]
}
