import { error, typeError } from '@vltpkg/error-cause'
import { parseRange, type Range } from '@vltpkg/semver'
import { inspect } from 'util'

export type SpecOptions = {
  [k in keyof SpecOptionsFilled]?: SpecOptionsFilled[k]
}

export const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

export type SpecOptionsFilled = {
  /** the registry where a spec should be resolved against */
  registry: string
  /** shorthand prefix names for known registries */
  registries: Record<string, string>
  /** shorthand prefix names for known git hosts */
  gitHosts: Record<string, string>
  /** tarball hosting services for hosts listed in gitHosts */
  gitHostArchives: Record<string, string>
}

export type GitSelectorParsed = {
  path?: string
  semver?: string
}

const defaultRegistry = 'https://registry.npmjs.org/'

export const defaultRegistries = {
  npm: 'https://registry.npmjs.org/',
}

export const defaultGitHosts = {
  github: 'git+ssh://git@github.com:$1/$2.git',
  bitbucket: 'git+ssh://git@bitbucket.org:$1/$2.git',
  gitlab: 'git+ssh://git@gitlab.com:$1/$2.git',
  gist: 'git+ssh://git@gist.github.coml/$1.git',
}

export const defaultGitHostArchives = {
  github: 'https://codeload.github.com/$1/$2/tar.gz/$committish',
  bitbucket: 'https://bitbucket.org/$1/$2/get/$committish.tar.gz',
  gist: 'https://codeload.github.com/gist/$1/tar.gz/$committish',
  gitlab:
    'https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish',
}

export class Spec {
  /**
   * Create a Spec object from a full spec, name+bareSpec, or Spec object
   *
   * Note: If a Spec object is provided, it is returned as-is, without
   * investigating whether the options match.
   */
  static parse(
    name: string,
    bareSpec: string,
    options?: SpecOptions,
  ): Spec
  static parse(spec: string, options?: SpecOptions): Spec
  static parse(spec: Spec, options?: SpecOptions): Spec
  static parse(
    spec: string | Spec,
    bareOrOptions?: SpecOptions | string,
    options?: SpecOptions,
  ) {
    return typeof spec === 'object' ? spec : (
        new Spec(spec, bareOrOptions, options)
      )
  }

  /** the type of spec that this is, ultimately */
  type: 'git' | 'file' | 'remote' | 'registry' | 'workspace'

  /** the full named specifier passed to the constructor */
  spec: string

  /** options passed to the constructor, plus defaults */
  options: SpecOptionsFilled

  /** the name portion, so `foo` in `foo@1.x` */
  name: string

  /** just the part AFTER the name, so `1.x` in `foo@1.x` */
  bareSpec: string

  /** the git remote to fetch from */
  gitRemote?: string

  /** the committish, semver range, and/or path portion of a git remote */
  gitSelector?: string
  /**
   * the parsed '::'-separated key/value pairs:
   * `semver:<range>` and `path:<subpath>`
   */
  gitSelectorParsed?: Record<string, string>
  /** the commit value we will check out */
  gitCommittish?: string
  /** github, gitlab, bitbucket, gist, etc. */
  namedGitHost?: string
  /** the path that's parsed when we have a named git host */
  namedGitHostPath?: string

  /**
   * the specifier when using `workspace:` specs
   * This can be either a semver range, `*`, `~`, or `^`
   */
  workspaceSpec?: string

  /**
   * In specs like `foo@npm:bar@1`, this is the 'npm' part. Other
   * registries can be mapped using the `registries` option.
   */
  namedRegistry?: string

  /** registry to consult to resolve this spec */
  registry?: string

  /** semver range or dist-tag for resolving against a packument */
  registrySpec?: string

  /** spec to resolve against available versions */
  semver?: string

  /** parsed semver range specifier */
  range?: Range

  /** a dist-tag like 'latest' */
  distTag?: string

  /**
   * URL to download a tarball from, if it can be determined.
   *
   * This is set for url specs of course, but also git remotes on known
   * hosts that provide a gitHostArchive template.
   */
  remoteURL?: string

  /** file path for file:// url specs */
  file?: string

  /** in `bar@npm:foo@1.x`, this is the spec for `foo@1.x` */
  subspec?: Spec

  // memoized Spec.final value
  #final?: Spec
  // memoized toString value
  #toString?: string

  /**
   * Return the final entry in the chain of subspecs
   * When deciding which thing to actually fetch, spec.final is the thing
   * to look at.
   */
  get final(): Spec {
    if (this.#final) return this.#final
    return (this.#final = this.subspec ? this.subspec.final : this)
  }

  /**
   * Normally, the string value of a Spec is just the string passed in to
   * be parsed. However, in the case of a chain of subspecs, like
   * `foo@npm:bar@npm:baz@npm:quux@latest`, this simplifies out the middle
   * parts of the chain, returning just `foo@npm:quux@latest`
   */
  toString() {
    if (this.#toString !== undefined) return this.#toString
    let sub: Spec = this
    // we want the SECOND from the last in the chain
    while (sub.subspec?.subspec) sub = sub.subspec
    if (sub.subspec && sub.subspec.type !== 'registry') sub = sub.subspec
    return (this.#toString = this.name + '@' + sub.bareSpec)
  }

  constructor(name: string, bareSpec: string, options?: SpecOptions)
  constructor(spec: string, options?: SpecOptions)
  constructor(
    spec: string | Spec,
    bareOrOptions?: SpecOptions | string,
    options?: SpecOptions,
  )
  constructor(
    spec: string,
    bareOrOptions?: SpecOptions | string,
    options: SpecOptions = {},
  ) {
    if (bareOrOptions && typeof bareOrOptions === 'object') {
      options = bareOrOptions
      bareOrOptions = undefined
    }
    this.options = {
      registry: defaultRegistry,
      ...options,
      gitHosts:
        options.gitHosts ?
          {
            ...defaultGitHosts,
            ...options.gitHosts,
          }
        : defaultGitHosts,
      registries:
        options.registries ?
          {
            ...defaultRegistries,
            ...options.registries,
          }
        : defaultRegistries,
      gitHostArchives:
        options.gitHostArchives ?
          {
            ...defaultGitHostArchives,
            ...options.gitHostArchives,
          }
        : defaultGitHostArchives,
    }

    if (typeof bareOrOptions === 'string') {
      this.name = spec
      this.bareSpec = bareOrOptions
      this.spec = `${this.name}@${bareOrOptions}`
    } else {
      this.spec = spec
      let at = spec.indexOf('@', spec.startsWith('@') ? 1 : 0)
      if (at === -1) {
        // assume that an unadorned spec is just a name at the default
        // registry
        at = spec.length
        spec += '@'
      }
      this.name = spec.substring(0, at)
      this.bareSpec = spec.substring(at + 1)
    }

    if (this.bareSpec.startsWith('workspace:')) {
      this.type = 'workspace'
      const ws = this.bareSpec.substring('workspace:'.length).trim()
      const range = parseRange(ws)
      if (ws !== '*' && ws !== '~' && ws !== '^' && !range) {
        throw this.#error(
          'workspace: spec must be one of *, !, or ^, or a valid semver range',
        )
      }
      this.workspaceSpec = ws
      if (range) {
        this.semver = ws
        this.range = range
      }
      return
    }

    if (
      this.bareSpec.startsWith('git://') ||
      this.bareSpec.startsWith('git+ssh://') ||
      this.bareSpec.startsWith('git+http://') ||
      this.bareSpec.startsWith('git+https://') ||
      this.bareSpec.startsWith('git+file://') ||
      // legacy affordance
      this.bareSpec.startsWith('git@github.com')
    ) {
      if (this.bareSpec.startsWith('git@')) {
        this.bareSpec = `git+ssh://${this.bareSpec}`
        this.spec = `${this.name}@${this.bareSpec}`
      }
      this.type = 'git'
      this.#parseGitSelector(this.bareSpec)
      return
    }

    // spooky
    const ghosts = Object.entries(this.options.gitHosts)
    for (const [name, template] of ghosts) {
      if (this.#parseHostedGit(name, template)) {
        this.type = 'git'
        return
      }
    }

    if (this.bareSpec.startsWith('registry:')) {
      const reg = this.bareSpec.substring('registry:'.length)
      const h = reg.indexOf('#')
      if (h === -1) {
        throw this.#error('registry: must include name/version')
      }
      this.type = 'registry'
      let url = reg.substring(0, h)
      if (!url.endsWith('/')) url += '/'
      const regSpec = reg.substring(h + 1)
      for (let [name, u] of Object.entries(this.options.registries)) {
        if (!u.endsWith('/')) {
          u += '/'
          this.options.registries[name] = u
        }
        if (u === url) this.namedRegistry = name
      }
      this.#parseRegistrySpec(regSpec, url)
      return
    }

    const regs = Object.entries(this.options.registries)
    for (const [host, url] of regs) {
      const h = `${host}:`
      if (this.bareSpec.startsWith(h)) {
        this.registry = url
        this.type = 'registry'
        const sub = this.#parseRegistrySpec(
          this.bareSpec.substring(h.length),
          url,
        )
        if (sub.type === 'registry') {
          sub.namedRegistry = host
        }
        return
      }
    }

    if (
      this.bareSpec.startsWith('https://') ||
      this.bareSpec.startsWith('http://')
    ) {
      this.remoteURL = this.bareSpec
      this.type = 'remote'
      return
    }

    // legacy! once upon a time, `user/project` was a shorthand for pulling
    // packages from github, instead of the more verbose and explicit
    // `github:user/project`.
    if (
      !this.bareSpec.startsWith('./') &&
      !this.bareSpec.startsWith('../') &&
      this.bareSpec.split('/').length === 2 &&
      this.options.gitHosts.github
    ) {
      this.bareSpec = `github:${this.bareSpec}`
      this.spec = `${this.name}@${this.bareSpec}`
      this.#parseHostedGit('github', this.options.gitHosts.github)
      this.type = 'git'
      return
    }

    // explicit file: url
    if (this.bareSpec.startsWith('file://')) {
      this.file = this.bareSpec.substring('file://'.length)
      this.type = 'file'
      return
    }

    // if it contains a / and isn't picked up in the github shorthand,
    // then convert to file: specifier
    if (
      this.bareSpec.includes('/') ||
      this.bareSpec === '.' ||
      this.bareSpec === '..'
    ) {
      this.file = this.bareSpec
      this.type = 'file'
    }

    // at this point, must be either semver range or dist-tag
    this.type = 'registry'
    const range = parseRange(this.bareSpec)
    if (range) {
      this.semver = this.bareSpec.trim()
      this.range = range
    } else {
      this.distTag = this.bareSpec
    }
    this.registrySpec = this.bareSpec
    this.registry = this.options.registry
  }

  #parseHostedGit(name: string, template: string) {
    if (this.bareSpec.startsWith(`${name}:`)) {
      const h = this.bareSpec.indexOf('#')
      const bare =
        h === -1 ? this.bareSpec : this.bareSpec.substring(0, h)
      const hash = h === -1 ? '' : this.bareSpec.substring(h)
      const hostPath = bare.substring(name.length + 1)
      if (!hostPath) {
        throw error('invalid named git host specifier', {
          spec: this
        })
      }
      const split = hostPath.split('/')
      let t = template
      for (let i = 0; i < split.length; i++) {
        t = t.split(`$${i + 1}`).join(split[i])
      }
      t += hash
      this.namedGitHost = name
      this.namedGitHostPath = hostPath
      this.#parseGitSelector(t)
      if (this.gitCommittish && !this.gitSelectorParsed?.path) {
        const archiveHost = this.options.gitHostArchives[name]
        if (archiveHost) {
          this.type = 'remote'
          let t = archiveHost
          t = t.split('$committish').join(this.gitCommittish)
          for (let i = 0; i < split.length; i++) {
            t = t.split(`$${i + 1}`).join(split[i])
          }
          this.remoteURL = t
        }
      }
      return true
    }
    return false
  }

  [kCustomInspect](...args: any[]): string {
    const str = inspect(
      Object.fromEntries(
        Object.entries(this).filter(([k, v]) => {
          return k !== 'options' && v !== undefined
        }),
      ),
      ...args,
    )
    return `@vltpkg/spec.Spec ${str}`
  }

  #parseRegistrySpec(s: string, url: string) {
    this.registry = url
    this.subspec = Spec.parse(s, {
      ...this.options,
      registry: url,
    })
    return this.subspec
  }

  #error(message: string) {
    return error(message, { spec: this.spec }, this.#error)
  }

  #parseGitSelector(s: string) {
    const h = s.indexOf('#')
    if (h === -1) {
      this.gitRemote = s
      return
    }
    this.gitRemote = s.substring(0, h)
    this.gitSelector = s.substring(h + 1)
    const split = this.gitSelector.split('::')
    const first = split[0]
    /* c8 ignore start - for TS's benefit */
    if (typeof first !== 'string') {
      throw typeError('impossible', {
        found: first,
        wanted: String,
      })
    }
    /* c8 ignore stop */
    if (!first.includes(':')) {
      this.gitCommittish = first
      split.shift()
    }
    this.gitSelectorParsed = {}
    for (const kv of split) {
      const c = kv.indexOf(':')
      /* c8 ignore next */
      if (c === -1) continue
      const k = kv.substring(0, c)
      const v = kv.substring(c + 1)
      if (k === 'semver') {
        if (this.gitCommittish) {
          throw this.#error(
            'Cannot specify a semver range and committish value',
          )
        }
        const range = parseRange(v)
        if (!range) {
          throw this.#error(`Invalid git tag semver range: ${v}`)
        }
        this.range = range
      }
      if (k === 'semver' || k === 'path') {
        this.gitSelectorParsed[k] = v
      }
    }
  }
}
