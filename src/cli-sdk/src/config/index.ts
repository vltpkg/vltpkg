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
import type { SpecOptions } from '@vltpkg/spec'
import {
  assertRecordStringString,
  assertRecordStringT,
  isRecordStringString,
} from '@vltpkg/types'
import type { Validator, WhichConfig } from '@vltpkg/vlt-json'
import { find, load, reload, save } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import type { Jack, OptionsResults, Unwrap } from 'jackspeak'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { PathScurry } from 'path-scurry'
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

export const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

export type RecordPairs = Record<string, unknown>
export type RecordString = Record<string, string>

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

export type PairsAsRecords = ConfigOptionsNoExtras & {
  command?: {
    [k in keyof Commands]?: ConfigOptionsNoExtras
  }
}

export const pairsToRecords = (
  obj:
    | NonNullable<ConfigFileData>
    | OptionsResults<ConfigDefinitions>,
): PairsAsRecords => {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      k === 'command' && v && typeof v === 'object' ?
        Object.fromEntries(
          Object.entries(v).map(([k, v]) => [
            k,
            pairsToRecords(v as NonNullable<ConfigFileData>),
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

export type ConfigDataNoCommand = {
  [k in keyof OptionsResults<ConfigDefinitions>]?: OptionsResults<ConfigDefinitions>[k]
}

/**
 * Config data can be any options, and also a 'command' field which
 * contains command names and override options for that command.
 */
export type ConfigData = ConfigDataNoCommand & {
  command?: {
    [k in keyof Commands]?: ConfigDataNoCommand
  }
}

export type ConfigFileDataNoCommand = {
  [k in keyof ConfigDataNoCommand]: k extends (
    OptListKeys<ConfigDataNoCommand>
  ) ?
    RecordString | string[]
  : ConfigDataNoCommand[k]
}

/**
 * Config data as it appears in the config field of the vlt.json, with kv pair
 * lists stored as `Record<string, string>` and
 */
export type ConfigFileData = ConfigFileDataNoCommand & {
  command?: {
    [k in keyof Commands]?: ConfigFileDataNoCommand
  }
}

export type ConfigOptionsNoExtras = {
  [k in keyof OptionsResults<ConfigDefinitions>]: k extends (
    RecordField
  ) ?
    RecordString
  : k extends 'command' ? never
  : OptionsResults<ConfigDefinitions>[k]
}

export type ConfigOptions = ConfigOptionsNoExtras &
  Pick<SpecOptions, 'catalog' | 'catalogs'> & {
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
        load: {
          paths: asRecords.workspace,
          groups: asRecords['workspace-group'],
        },
      }),
      catalog: load<Record<string, string>>(
        'catalog',
        assertRecordStringString,
      ),
      catalogs: load<Record<string, Record<string, string>>>(
        'catalogs',
        o =>
          assertRecordStringT(
            o,
            isRecordStringString,
            'Record<string, Record<string, string>>',
          ),
      ),
    }

    const options: Omit<ConfigOptions, 'packageInfo'> = Object.assign(
      asRecords,
      extras,
    )

    this.#options = Object.assign(options, {
      packageInfo: new PackageInfoClient(options),
      [kCustomInspect]() {
        return Object.fromEntries(
          Object.entries(options).filter(
            ([k]) =>
              k !== 'monorepo' &&
              k !== 'scurry' &&
              k !== 'packageJson' &&
              k !== 'packageInfo',
          ),
        )
      },
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
   * Original arguments used for parsing (stored for reload purposes)
   * @internal
   */
  #originalArgs?: string[]

  /**
   * The root of the project where a vlt.json, vlt.json,
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

    // Store the original args for potential reload
    this.#originalArgs = [...args]

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
    this: LoadedConfig,
    which: WhichConfig,
    values: NonNullable<ConfigFileData>,
  ) {
    save('config', pairsToRecords(values), which)
    await this.#reloadConfig()
  }

  /**
   * Fold in the provided fields with the existing properties
   * in the config file.
   */
  async addConfigToFile(
    this: LoadedConfig,
    which: WhichConfig,
    values: NonNullable<ConfigFileData>,
  ) {
    return this.writeConfigFile(
      which,
      merge((await this.#maybeLoadConfigFile(which)) ?? {}, values),
    )
  }

  // called in this weird bound way so that it can be used by the
  // vlt-json config loading module.
  #validator: Validator<ConfigFileData> = function (
    this: Config,
    c: unknown,
    file: string,
  ) {
    this.#validateConfig(c, file)
  }.bind(this)

  #validateConfig(
    c: unknown,
    file: string,
  ): asserts c is ConfigFileData {
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      throw error('invalid config, expected object', {
        path: file,
        found: c,
        wanted: 'ConfigFileData',
      })
    }

    const { command, ...values } = recordsToPairs(c as RecordPairs)
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
  }

  /**
   * if the file exists, parse and load it. returns object if data was
   * loaded, or undefined if not.
   */
  async #maybeLoadConfigFile(whichConfig: WhichConfig) {
    return load('config', this.#validator, whichConfig)
  }

  /**
   * Deletes the specified config fields from the named file
   * Returns `true` if anything was changed.
   */
  async deleteConfigKeys(
    this: LoadedConfig,
    which: WhichConfig,
    fields: string[],
  ) {
    const data = await this.#maybeLoadConfigFile(which)
    if (!data) return false
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
            if (v.length === 1) delete data[k]
            else v.splice(i, 1)
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
    if (didSomething) await this.writeConfigFile(which, data)
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
    this: LoadedConfig,
    which: WhichConfig,
    edit: (file: string) => Promise<void> | void,
  ) {
    // load the file as a backup
    // call the edit function
    // reload it
    const file = find(which)
    const backup = await readFile(file, 'utf8').catch(() => undefined)
    if (!backup) {
      await writeFile(
        file,
        JSON.stringify({ config: {} }, null, 2) + '\n',
      )
    }
    let valid = false
    try {
      await edit(file)
      // force it to reload the file and validate it again
      // if this fails, we roll back.
      const result = reload('config', which)
      save('config', result ?? {}, which)
      valid = true
    } finally {
      if (!valid) {
        // TODO: maybe write the file to a re-edit backup location?
        // then you could do `vlt config edit retry` or something.
        if (backup) {
          await writeFile(file, backup)
          reload(which)
        } else {
          await rm(file, { force: true })
        }
      }
    }
  }

  /**
   * Find the local config file and load both it and the user-level config in
   * the XDG config home.
   */
  async loadConfigFile(): Promise<this> {
    await this.#maybeLoadConfigFile('user')
    this.projectRoot = dirname(find('project', this.projectRoot))
    await this.#maybeLoadConfigFile('project')
    return this
  }

  /**
   * Clear cached config values to force re-reading from updated files.
   * @internal
   */
  async #reloadConfig() {
    // Clear the memoized options to force recalculation
    this.#options = undefined
  }

  /**
   * Force a complete reload of config files from disk.
   * This clears all caches and re-reads config files.
   * Useful for long-running processes that need to pick up config changes.
   */
  async reloadFromDisk(): Promise<void> {
    // Clear the memoized options to force recalculation
    this.#options = undefined

    // Clear the parsed state to force re-parsing
    // This is crucial because parse() returns early if already parsed
    this.values = undefined
    this.positionals = undefined
    this.command = undefined

    // Clear vlt-json caches for both user and project configs
    // This ensures that the next time config files are read, they'll be re-read from disk
    const { unload } = await import('@vltpkg/vlt-json')
    unload('user')
    unload('project')

    // Force reload of config files by calling the load methods again
    // This will re-read the files and re-apply them to the jack parser
    await this.#maybeLoadConfigFile('user')
    await this.#maybeLoadConfigFile('project')

    // Re-parse to pick up the updated config values using the original arguments
    this.parse(this.#originalArgs)
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
    this.#loaded = b.parse(argv) as LoadedConfig
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
export type LoadedConfig = ParsedConfig
