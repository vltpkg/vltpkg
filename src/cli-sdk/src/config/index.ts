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
 *   "registry": "https://registry.npmjs.org/",
 *   "command": {
 *     "publish": {
 *       "registry": "http://registry.internal"
 *     }
 *   }
 * }
 * ```
 * @module
 */

import { error } from '@vltpkg/error-cause'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { Monorepo } from '@vltpkg/workspaces'
import { XDG } from '@vltpkg/xdg'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import type { Jack, OptionsResults, Unwrap } from 'jackspeak'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import type { JSONResult } from 'polite-json'
import {
  parse as jsonParse,
  stringify as jsonStringify,
  kIndent,
  kNewline,
} from 'polite-json'
import { walkUp } from 'walk-up-path'
import type { Commands, RecordField } from './definition.ts'
import {
  commands,
  definition,
  getCommand,
  isRecordField,
  recordFields,
} from './definition.ts'
import { merge } from './merge.ts'
export {
  commands,
  definition,
  isRecordField,
  recordFields,
  type Commands,
}

export type RecordPairs = Record<string, unknown>
export type RecordString = Record<string, string>
export type ConfigFiles = Record<string, ConfigFileData>

// turn a set of pairs into a Record object.
// if a kv pair doesn't have a = character, set to `''`
const reducePairs = <T extends string[]>(
  pairs: T,
): RecordString | T => {
  const record: RecordString = {}
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

export type PairsAsRecords = Omit<
  ConfigOptions,
  | 'projectRoot'
  | 'scurry'
  | 'packageJson'
  | 'monorepo'
  | 'packageInfo'
> & {
  command?: Record<string, ConfigOptions>
}

export const pairsToRecords = (
  obj: ConfigFileData,
): PairsAsRecords => {
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
    // hard cast because TS can't see through the entries/fromEntries
  ) as unknown as PairsAsRecords
}

export const recordsToPairs = (obj: RecordPairs): RecordPairs => {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(
        ([k]) =>
          !(
            k === 'scurry' ||
            k === 'packageJson' ||
            k === 'monorepo' ||
            k === 'projectRoot' ||
            k === 'packageInfo'
          ),
      )
      .map(([k, v]) => [
        k,
        k === 'command' && v && typeof v === 'object' ?
          recordsToPairs(v as RecordPairs)
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
    RecordString | string[]
  : k extends 'command' ? ConfigFiles
  : ConfigData[k]
}

export type ConfigOptions = {
  [k in keyof ConfigData]: k extends RecordField ? RecordString
  : k extends 'command' ? never
  : ConfigData[k]
} & {
  packageJson: PackageJson
  scurry: PathScurry
  projectRoot: string
  monorepo?: Monorepo
  packageInfo: PackageInfoClient
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

  configFiles: ConfigFiles = {}

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
  get options(): ConfigOptions {
    if (this.#options) return this.#options
    const scurry = new PathScurry(this.projectRoot)
    const packageJson = new PackageJson()
    const asRecords = pairsToRecords(this.parse().values)
    const extras = {
      projectRoot: this.projectRoot,
      scurry,
      packageJson,
      monorepo: Monorepo.maybeLoad(this.projectRoot, {
        scurry,
        packageJson,
      }),
    }
    const options: Omit<ConfigOptions, 'packageInfo'> = Object.assign(
      asRecords,
      extras,
    )
    this.#options = Object.assign(options, {
      packageInfo: new PackageInfoClient(options),
    })
    return this.#options
  }

  /**
   * Reset the options value, optionally setting a new project root
   * to recalculate the options.
   */
  resetOptions(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
    this.#options = undefined
  }

  // memoized options() getter value
  #options?: ConfigOptions

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
   * `Record<alias, canonical name>` to dereference command aliases.
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
  parse(args: string[] = process.argv): this & ParsedConfig {
    if (isParsed(this)) return this

    this.jack.loadEnvDefaults()
    const p = this.jack.parseRaw(args)

    const fallback = getCommand(p.values['fallback-command'])
    this.command = getCommand(p.positionals[0])

    const cmdOrFallback = this.command ?? fallback
    const cmdSpecific =
      cmdOrFallback && this.commandValues[cmdOrFallback]
    if (cmdSpecific) {
      this.jack.setConfigValues(recordsToPairs(cmdSpecific))
    }

    // ok, applied cmd-specific defaults, do rest of the parse
    this.jack.applyDefaults(p)
    this.jack.writeEnv(p)

    if (this.command) p.positionals.shift()
    else this.command = getCommand(p.values['fallback-command'])

    Object.assign(this, p)

    /* c8 ignore start - unpossible */
    if (!isParsed(this)) throw error('failed to parse config')
    /* c8 ignore stop */

    return this
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
  getRecord(k: OptListKeys<ConfigData>): RecordString {
    const pairs = this.get(k) as
      | (string[] & { [kRecord]?: RecordString })
      | undefined
    if (!pairs) return {}
    if (pairs[kRecord]) return pairs[kRecord]
    const kv = pairs.reduce((kv: RecordString, pair) => {
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
    which: 'project' | 'user',
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
    which: 'project' | 'user',
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
            const cmd = getCommand(c)
            if (cmd) {
              this.commandValues[cmd] = merge<ConfigData>(
                this.commandValues[cmd] ?? ({} as ConfigData),
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
          cause: er,
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
    let result: JSONResult
    try {
      result = jsonParse(data)
      if (result && typeof result === 'object') {
        if (result[kIndent] !== undefined)
          this.stringifyOptions[kIndent] = result[kIndent]
        if (result[kNewline] !== undefined)
          this.stringifyOptions[kNewline] = result[kNewline]
      }
    } catch (er) {
      throw error('failed to parse vlt config file', {
        path: file,
        cause: er,
      })
    }
    this.configFiles[file] = result as ConfigFileData
    return result as ConfigFileData
  }

  getFilename(which: 'project' | 'user' = 'project'): string {
    return which === 'user' ?
        xdg.config('vlt.json')
      : resolve(this.projectRoot, 'vlt.json')
  }

  async deleteConfigKeys(
    which: 'project' | 'user',
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
    which: 'project' | 'user',
    edit: (file: string) => Promise<void> | void,
  ) {
    const file = this.getFilename(which)
    const backup = this.configFiles[file]
    if (!backup) {
      writeFileSync(file, '{\n\n}\n')
    }
    let valid = false
    try {
      await edit(file)
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

    let lastKnownRoot = resolve(this.projectRoot)
    for (const dir of walkUp(this.projectRoot)) {
      // don't look in ~
      if (dir === home) break

      // finding a project config file stops the search
      const projectConfig = resolve(dir, 'vlt.json')
      if (projectConfig === userConfig) break
      if (
        (await exists(projectConfig)) &&
        (await this.#maybeLoadConfigFile(projectConfig))
      ) {
        lastKnownRoot = dir
        break
      }

      // stat existence of these files
      const [hasPackage, hasModules, hasWorkspaces, hasGit] =
        await Promise.all([
          exists(resolve(dir, 'package.json')),
          exists(resolve(dir, 'node_modules')),
          exists(resolve(dir, 'vlt-workspaces.json')),
          exists(resolve(dir, '.git')),
        ])

      // treat these as potential roots
      if (hasPackage || hasModules || hasWorkspaces) {
        lastKnownRoot = dir
      }

      // define backstops
      if (hasWorkspaces || hasGit) {
        break
      }
    }
    this.projectRoot = lastKnownRoot
    return this
  }

  /**
   * Determine whether we should use colors in the output. Update
   * chalk appropriately.
   *
   * Implicitly calls this.parse() if it not parsed already.
   */
  async loadColor(): Promise<this & LoadedConfig> {
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
    return this as this & LoadedConfig
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

const isParsed = (c: Config): c is ParsedConfig =>
  !!(c.values && c.positionals && c.command)

export type ParsedConfig = Config & {
  command: NonNullable<Config['command']>
  values: OptionsResults<ConfigDefinitions>
  positionals: string[]
}

/**
 * A fully loaded {@link Config} object
 */
export type LoadedConfig = ParsedConfig & {
  get(k: 'color'): boolean
}
