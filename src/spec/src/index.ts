import { parseRange, type Range } from '@vltpkg/semver'

export type SpecOptions = {
  [k in keyof SpecOptionsFilled]?: SpecOptionsFilled[k]
}

export const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

export type SpecOptionsFilled = {
  /**
   * the registry we don't bother listing
   * default https://registry.npmjs.org
   */
  defaultRegistry: string
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

export const defaultRegistry = 'https://registry.npmjs.org/'

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
  static parse(spec: string, options: SpecOptions = {}) {
    return new Spec(spec, options)
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

  get [Symbol.toStringTag]() {
    return `@vltpkg/spec.Spec {${this.spec}}`
  }

  constructor(spec: string, options: SpecOptions = {}) {
    this.spec = spec
    this.options = {
      registry: defaultRegistry,
      defaultRegistry,
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

    let at = spec.indexOf('@', spec.startsWith('@') ? 1 : 0)
    if (at === -1) {
      // assume that an unadorned spec is just a name at the default
      // registry
      at = spec.length
      spec += '@'
    }
    this.name = spec.substring(0, at)
    this.bareSpec = spec.substring(at + 1)

    if (this.bareSpec.startsWith('workspace:')) {
      this.type = 'workspace'
      const ws = this.bareSpec.substring('workspace:'.length).trim()
      const range = parseRange(ws)
      if (ws !== '*' && ws !== '~' && ws !== '^' && !range) {
        throw this.#error(
          'workspace: spec must be one of *, !, or ^, or a valid semver range',
        )
      }
      if (range) {
        this.semver = ws
        this.range = range
      }
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
      const url = reg.substring(0, h)
      const regSpec = reg.substring(h + 1)
      this.type = 'registry'
      this.#parseRegistrySpec(regSpec, url)
      return
    }

    const regs = Object.entries(this.options.registries)
    for (const [host, url] of regs) {
      const h = `${host}:`
      if (this.bareSpec.startsWith(h)) {
        this.namedRegistry = host
        this.registry = url
        this.type = 'registry'
        this.#parseRegistrySpec(
          this.bareSpec.substring(h.length),
          url,
        )
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
      const split = bare.substring(name.length + 1).split('/')
      let t = template
      for (let i = 0; i < split.length; i++) {
        t = t.split(`$${i + 1}`).join(split[i])
      }
      t += hash
      this.namedGitHost = name
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

  [kCustomInspect](): Record<string, any> {
    return Object.fromEntries(
      Object.entries(this)
        .filter(([k, v]) => {
          return k !== 'options' && v !== undefined
        })
        .map(([k, v]) => [
          k,
          k === 'subspec' ? this.subspec?.[kCustomInspect]() : v,
        ]),
    )
  }

  #parseRegistrySpec(s: string, url: string) {
    this.registry = url
    this.subspec = Spec.parse(s, {
      ...this.options,
      // we don't need to say what registry it is again
      registry: url,
      defaultRegistry: url,
    })
  }

  #error(message: string) {
    return Object.assign(new Error(message), {
      spec: this.spec,
    })
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
    if (typeof first !== 'string') throw new Error('impossible')
    if (!first.includes(':')) {
      this.gitCommittish = first
      split.shift()
    }
    this.gitSelectorParsed = {}
    for (const kv of split) {
      const c = kv.indexOf(':')
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
