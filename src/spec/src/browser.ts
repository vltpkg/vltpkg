import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import { error, typeError } from '@vltpkg/error-cause'
import type { Range } from '@vltpkg/semver'
import { parseRange } from '@vltpkg/semver'
import type {
  GitSelectorParsed,
  Scope,
  SpecLike,
  SpecOptions,
  SpecOptionsFilled,
} from './types.ts'
export * from './types.ts'

export const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

export const defaultRegistry = 'https://registry.npmjs.org/'

export const defaultRegistries = {
  npm: 'https://registry.npmjs.org/',
}

export const defaultGitHosts = {
  github: 'git+ssh://git@github.com:$1/$2.git',
  bitbucket: 'git+ssh://git@bitbucket.org:$1/$2.git',
  gitlab: 'git+ssh://git@gitlab.com:$1/$2.git',
  gist: 'git+ssh://git@gist.github.com/$1.git',
}

export const defaultGitHostArchives = {
  github: 'https://codeload.github.com/$1/$2/tar.gz/$committish',
  bitbucket: 'https://bitbucket.org/$1/$2/get/$committish.tar.gz',
  gist: 'https://codeload.github.com/gist/$1/tar.gz/$committish',
  gitlab:
    'https://gitlab.com/$1/$2/repository/archive.tar.gz?ref=$committish',
}

/**
 * These are just for legacy support of urls that are supported by npm
 * and observed in the wild.
 *
 * Not configurable, because no more will be added. If you wish to define
 * custom git hosts, use it with the `'git-hosts'` and `'git-host-archives'`
 * options.
 */
export const gitHostWebsites = {
  github: 'https://github.com/',
  bitbucket: 'https://bitbucket.org/',
  gist: 'https://gist.github.com/',
  gitlab: 'https://gitlab.com/',
}

export const defaultScopeRegistries = {}

export const getOptions = (
  options?: SpecOptions,
): SpecOptionsFilled => ({
  ...options,
  registry: options?.registry ?? defaultRegistry,
  'scope-registries': options?.['scope-registries'] ?? {},
  'git-hosts':
    options?.['git-hosts'] ?
      {
        ...defaultGitHosts,
        ...options['git-hosts'],
      }
    : defaultGitHosts,
  registries:
    options?.registries ?
      {
        ...defaultRegistries,
        ...options.registries,
      }
    : defaultRegistries,
  'git-host-archives':
    options?.['git-host-archives'] ?
      {
        ...defaultGitHostArchives,
        ...options['git-host-archives'],
      }
    : defaultGitHostArchives,
})

/**
 * Various nameless scenarios that are handled in the
 * standard spec parsing and should return an unknown name.
 *
 * Returns `true` if the name can not be inferred, `false` otherwise.
 */
const startsWithSpecIdentifier = (
  spec: string,
  options: SpecOptionsFilled,
): boolean =>
  spec.startsWith('/') ||
  spec.startsWith('./') ||
  spec.startsWith('../') ||
  spec.startsWith('file:') ||
  spec.startsWith('http:') ||
  spec.startsWith('https:') ||
  spec.startsWith('workspace:') ||
  spec.startsWith('git@') ||
  spec.startsWith('git://') ||
  spec.startsWith('git+ssh://') ||
  spec.startsWith('git+http://') ||
  spec.startsWith('git+https://') ||
  spec.startsWith('git+file://') ||
  spec.startsWith('git@github.com') ||
  spec.startsWith('registry:') ||
  // anything that starts with a known git host key, or a
  // custom registered registry protocol e.g: `github:`, `custom:`
  [
    ...Object.keys(options['git-hosts']),
    ...Object.keys(options.registries),
  ].some(key => spec.startsWith(`${key}:`))

/**
 * Returns the location in which the first `@` value is found in a given
 * string, also takes into account that a string starting with @ is
 * using a scoped-name.
 */
const findFirstAt = (spec: string, hasScope: boolean) =>
  spec.indexOf('@', hasScope ? 1 : 0)

/**
 * Return `true` if a given spec string is likely to be a git spec.
 */
const findGitIdentifier = (spec: string): boolean =>
  spec.indexOf('#') > 2

/**
 * Return `true` if a given spec string is likely to be a file spec.
 */
const findFileIdentifier = (spec: string): boolean =>
  spec.includes('/')

/**
 * Injects the Node.js dependencies into the Spec class.
 */
export type NodeJSDependenciesOptions = {
  homedir: typeof import('os').homedir
  isAbsolute: typeof import('node:path').isAbsolute
  join: typeof import('node:path').join
  resolve: typeof import('node:path').resolve
  winPath: typeof import('node:path').win32
}

/**
 * The base, isomorphic Spec implementation.
 */
export class Spec implements SpecLike<Spec> {
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
    spec: Spec | string,
    bareOrOptions?: SpecOptions | string,
    options?: SpecOptions,
  ): Spec {
    return typeof spec === 'object' ? spec : (
        new this(spec, bareOrOptions, options)
      )
  }

  static parseArgs(specOrBareSpec: string, opts?: SpecOptions): Spec {
    const options = getOptions(opts ?? {})

    if (startsWithSpecIdentifier(specOrBareSpec, options)) {
      const parsed = this.parse('(unknown)', specOrBareSpec, options)
      // try to look into a potential parsed subspec for a name
      if (parsed.subspec) {
        parsed.name = parsed.subspec.name
        parsed.spec = `${parsed.name}@${parsed.bareSpec}`
      }
      return parsed
    } else {
      const hasScope = specOrBareSpec.startsWith('@')
      const at = findFirstAt(specOrBareSpec, hasScope)
      if (at > -1) {
        return this.parse(
          specOrBareSpec.substring(0, at),
          specOrBareSpec.substring(at + 1),
          options,
        )
      } else if (
        findGitIdentifier(specOrBareSpec) ||
        (!hasScope && findFileIdentifier(specOrBareSpec))
      ) {
        return this.parse('(unknown)', specOrBareSpec, options)
      } else {
        // doesn't have an @, so it's just a name with no version
        return this.parse(`${specOrBareSpec}@`, options)
      }
    }
  }

  static nodejsDependencies?: NodeJSDependenciesOptions

  type: 'file' | 'git' | 'registry' | 'remote' | 'workspace'
  spec: string
  options: SpecOptionsFilled
  name: string
  scope?: Scope
  scopeRegistry?: string
  bareSpec: string
  gitRemote?: string
  gitSelector?: string
  gitSelectorParsed?: GitSelectorParsed
  gitCommittish?: string
  namedGitHost?: string
  namedGitHostPath?: string
  workspaceSpec?: string
  workspace?: string
  namedRegistry?: string
  registry?: string
  registrySpec?: string
  conventionalRegistryTarball?: string
  semver?: string
  range?: Range
  distTag?: string
  remoteURL?: string
  file?: string
  subspec?: Spec
  #final?: Spec
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
    if (sub.subspec && sub.subspec.type !== 'registry')
      sub = sub.subspec
    return (this.#toString = this.name + '@' + sub.bareSpec)
  }

  declare ['constructor']: typeof Spec

  constructor(name: string, bareSpec: string, options?: SpecOptions)
  constructor(spec: string, options?: SpecOptions)
  constructor(
    spec: Spec | string,
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
    this.options = getOptions(options)

    if (typeof bareOrOptions === 'string') {
      this.name = spec
      this.#parseScope(spec)
      this.bareSpec = bareOrOptions
      this.spec = `${this.name}@${bareOrOptions}`
    } else {
      this.spec = spec
      const hasScope = spec.startsWith('@')
      let at = findFirstAt(spec, hasScope)
      if (at === -1) {
        // assume that an unadorned spec is just a name at the default
        // registry
        at = spec.length
        spec += '@'
      }
      this.name = spec.substring(0, at)
      if (hasScope) this.#parseScope(this.name)
      this.bareSpec = spec.substring(at + 1)
    }

    // legacy affordance: allow project urls like
    // 'https://github.com/user/project#commitish' because npm suports it and
    // this pattern is observed in the wild.
    if (this.bareSpec.startsWith('https://')) {
      for (const [name, origin] of Object.entries(gitHostWebsites)) {
        if (this.bareSpec.startsWith(origin)) {
          const parsed = new URL(this.bareSpec)
          const [user, project] = parsed.pathname
            .replace(/\.git$/, '')
            .replace(/\/+/g, ' ')
            .trim()
            .split(' ')
          if (user && project) {
            this.bareSpec = `${name}:${user}/${project}${parsed.hash}`
            this.spec = `${this.name}@${this.bareSpec}`
            break
          }
        }
      }
    }

    if (this.bareSpec.startsWith('workspace:')) {
      this.type = 'workspace'
      const ws = this.bareSpec.substring('workspace:'.length).trim()
      const w = ws.lastIndexOf('@')
      if (w === -1) {
        this.workspace = this.name
      } else {
        const wsName = ws.substring(0, w)
        if (
          !wsName ||
          wsName === '*' ||
          wsName === '~' ||
          wsName === '^' ||
          (wsName.startsWith('@') ?
            wsName.split('/').length !== 2 ||
            wsName.substring(1).includes('@')
          : wsName.includes('@'))
        ) {
          throw this.#error(
            'workspace: name must be a path or valid package name',
            { found: wsName },
          )
        }
        this.workspace = wsName
      }
      // workspace: is the same as workspace:*
      const wss = w === -1 ? ws : ws.substring(w + 1) || '*'
      const range = wss === '*' ? undefined : parseRange(wss)
      if (wss !== '*' && wss !== '~' && wss !== '^' && !range) {
        throw this.#error(
          'workspace: spec must be one of *, ~, or ^, or a valid semver range',
          {
            found: wss,
            wanted: `'*'|'~'|'^'|SemverRange`,
          },
        )
      }
      this.workspaceSpec = wss
      if (range) {
        this.semver = wss
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
      // see if it's one of the known named hosts, and if so, prefer
      // the shorter syntax.
      for (const [name, host] of Object.entries(
        this.options['git-hosts'],
      )) {
        const s = host.indexOf('$')
        if (s > 0 && this.bareSpec.startsWith(host.substring(0, s))) {
          const p = this.bareSpec
            .substring(s)
            .replace(/\.git(#.*)?$/, '$1')
          this.bareSpec = `${name}:${p}`
          this.spec = `${this.name}@${this.bareSpec}`
          this.#parseHostedGit(name, host)
          this.type = 'git'
          return
        }
      }
      this.#parseGitSelector(this.bareSpec)
      return
    }

    // spooky
    const ghosts = Object.entries(this.options['git-hosts'])
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
      this.#guessRegistryTarball()
      return
    }

    const regs = Object.entries(this.options.registries)
    for (const [host, url] of regs) {
      const h = `${host}:`
      if (this.bareSpec.startsWith(h)) {
        this.type = 'registry'
        this.namedRegistry = host
        this.#parseRegistrySpec(
          this.bareSpec.substring(h.length),
          url,
        ).namedRegistry ??= host
        this.#guessRegistryTarball()
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

    // explicit file: url
    if (this.bareSpec.startsWith('file:')) {
      this.type = 'file'
      const [path, uri] = getNormalizeFile(
        this.constructor.nodejsDependencies,
      )(this.bareSpec, this)
      this.file = path
      this.bareSpec = uri.replace(/\/+$/, '')
      this.spec = `${this.name}@${this.bareSpec}`
      return
    }

    // legacy! once upon a time, `user/project` was a shorthand for pulling
    // packages from github, instead of the more verbose and explicit
    // `github:user/project`.
    if (
      !this.bareSpec.startsWith('./') &&
      !this.bareSpec.startsWith('../') &&
      this.options['git-hosts'].github
    ) {
      const hash = this.bareSpec.indexOf('#')
      const up =
        hash === -1 ? this.bareSpec : this.bareSpec.substring(0, hash)
      if (up.split('/').length === 2) {
        this.bareSpec = `github:${this.bareSpec}`
        this.spec = `${this.name}@${this.bareSpec}`
        this.#parseHostedGit(
          'github',
          this.options['git-hosts'].github,
        )
        this.type = 'git'
        return
      }
    }

    // if it contains a / and isn't picked up in the github shorthand,
    // then convert to file: specifier
    if (
      this.bareSpec.includes('/') ||
      this.bareSpec === '.' ||
      this.bareSpec === '..'
    ) {
      this.type = 'file'
      const [file, uri] = getNormalizeFile(
        this.constructor.nodejsDependencies,
      )(`file:${this.bareSpec}`, this)
      this.bareSpec = uri
      this.spec = `${this.name}@${this.bareSpec}`
      this.file = file
      return
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
    const { 'scope-registries': scopeRegs, registry } = this.options
    const scopeReg = this.scope && scopeRegs[this.scope]
    this.registry = scopeReg ?? registry
    this.#guessRegistryTarball()
  }

  #parseScope(name: string) {
    if (!name.startsWith('@')) return
    const s = name.indexOf('/')
    if (s > 1 && s < name.length - 1) {
      const scope = name.substring(0, s) as Scope
      this.registry = this.scopeRegistry =
        this.options['scope-registries'][scope]
      this.scope = scope
    }
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
          spec: this,
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
        const archiveHost = this.options['git-host-archives'][name]
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

  /* c8 ignore start */
  [kCustomInspect](): string {
    return `@vltpkg/spec.Spec ${String(this)}`
  }
  /* c8 ignore stop */

  #guessRegistryTarball() {
    // only try to guess if it's a single comparator for a single version
    const { name, registry, range } = this.final
    if (!registry || !range?.isSingle) return
    const stripScope = /^@[^/]+\//
    this.conventionalRegistryTarball = String(
      new URL(
        `/${name}/-/${name.replace(stripScope, '')}-${range}.tgz`,
        registry,
      ),
    )
  }

  #parseRegistrySpec(s: string, url: string) {
    // note: this takes priority over the scoped registry, if set
    this.registry = url
    this.subspec = this.constructor.parse(s, {
      ...this.options,
      registry: url,
    })
    return this.subspec
  }

  #error(message: string, extra: ErrorCauseOptions = {}) {
    return error(message, { spec: this.spec, ...extra }, this.#error)
  }

  #parseGitSelector(s: string) {
    const h = s.indexOf('#')
    if (h === -1) {
      this.gitRemote = s
      return
    }
    this.gitRemote = s.substring(0, h)
    this.gitSelector = s.substring(h + 1)
    const [selectorParsed, committish, range] =
      this.constructor.parseGitSelector(this.gitSelector, this)
    this.range = range
    this.gitCommittish = committish
    this.gitSelectorParsed = selectorParsed
  }

  /**
   * Should only ever be called with the bit that comes AFTER the #
   * in the git remote url.
   */
  static parseGitSelector(
    selector: string,
    spec?: Spec,
  ): [parsed: GitSelectorParsed, committish?: string, range?: Range] {
    if (!selector) return [{}]
    const split = selector.split('::')
    const first = split[0]
    let committish: string | undefined = undefined
    let range: Range | undefined = undefined
    const parsed: GitSelectorParsed = {}

    /* c8 ignore start - for TS's benefit */
    if (typeof first !== 'string') {
      throw typeError('impossible', {
        found: first,
        wanted: String,
      })
    }
    /* c8 ignore stop */
    if (!first.includes(':')) {
      committish = first
      split.shift()
    }
    for (const kv of split) {
      const c = kv.indexOf(':')
      /* c8 ignore next */
      if (c === -1) continue
      const k = kv.substring(0, c)
      const v = kv.substring(c + 1)
      if (k === 'semver') {
        if (committish) {
          throw error(
            'Cannot specify a semver range and committish value',
            { spec },
          )
        }
        range = parseRange(v)
        if (!range) {
          throw error(`Invalid git tag semver range: ${v}`, { spec })
        }
      }
      if (k === 'semver' || k === 'path') {
        if (k === 'path') {
          if (
            /* c8 ignore next */ this.nodejsDependencies?.isAbsolute(
              v,
            ) ||
            /(^|\/|\\)\.\.($|\\|\/)/.test(v)
          ) {
            throw error('Invalid path in git selector', { spec })
          }
          // normalize
          /* c8 ignore start */
          parsed.path = (
            this.nodejsDependencies ?
              this.nodejsDependencies.join('/', v).substring(1)
            : v).replace(/\\/g, '/')
          /* c8 ignore stop */
        } else {
          parsed[k] = v
        }
      }
    }
    return [parsed, committish, range]
  }
}

// normalize our kinda-sorta spec compliant `file:` specifiers
//
// For historical reasons, we need to support a lot of non-spec-compliant
// behaviors, but this massages the result into a *slightly* less offensive
// shape.
//
// The result will be either a fully compliant `file://` with an absolute path,
// or a `file:` with a relative path starting with `~`, `./`, or `../`.
export const getNormalizeFile =
  (opts?: NodeJSDependenciesOptions) =>
  (bareSpec: string, spec: Spec): [path: string, uri: string] => {
    const slashes = bareSpec.substring(
      'file:'.length,
      'file://'.length,
    )
    const pref = `file:${slashes === '//' ? slashes : ''}`
    const rest = bareSpec.substring(pref.length)

    // default to '/' because eol == '/' for parsing purposes
    const [a = '', b = '/', c = '/', d = '/'] = rest.split('', 4)

    if (!a) {
      // file:// => file:.
      // file: => file:.
      return ['.', 'file:.']
    }

    if (
      (a === '/' && b === '~' && c !== '/') ||
      (a === '~' && b !== '/')
    ) {
      throw error(
        `invalid file: specifier. '~username' not supported`,
        { spec },
      )
    }

    if (a === '~') {
      // file://~ => file:~
      // file://~/x => file:~/x
      return /* c8 ignore start */ opts ?
          [
            opts.resolve(opts.homedir(), rest.substring(2)),
            `file:${rest}`,
          ]
        : [rest, `file:${rest}`]
    }

    if (a === '/' && b === '~') {
      // file:///~ => file:~
      // file:/~/x => file:~/x
      /* c8 ignore start - tested in test/index.ts */
      return opts ?
          [
            opts.resolve(opts.homedir(), rest.substring(3)),
            `file:${rest.substring(1)}`,
          ]
        : /* c8 ignore stop */
          [rest.substring(1), `file:${rest.substring(1)}`]
    }

    if (
      a === '/' &&
      b === '.' &&
      (c === '/' || (c === '.' && d === '/'))
    ) {
      // file:/./x => file:./x
      // file:///./x => file:./x
      // file:/../x => file:../x
      // file://../x => file:../x
      return [rest.substring(1), `file:${rest.substring(1)}`]
    }

    if (a === '.' && (b === '/' || (b === '.' && c === '/'))) {
      // file://. => file:.
      // file://./x => file:./x
      // file://../x => file:../x
      return [rest, `file:${rest}`]
    }

    if (slashes === '//') {
      // must be valid URI, since we ruled out relative and homedir above

      // not relative, but note that file://host/share is
      // windows-specific and does not work on darwin, so disallow it.
      try {
        const parsed = new URL(bareSpec)
        if (parsed.host) {
          if (parsed.host !== 'localhost') {
            throw error(
              `invalid file:// specifier. host must be empty or 'localhost'`,
              {
                spec,
                found: parsed.host,
                validOptions: ['', 'localhost'],
              },
            )
          }
        }
        // normalize blank authority
        // file://X:/foo => file:///X:/foo
        // file://localhost/x => file:///x
        // interpret a `file:///D:/x` as `D:/x` though
        return [
          parsed.pathname.replace(/^\/([a-zA-Z]:\/)/, '$1'),
          `file://${parsed.pathname}`,
        ]
      } catch (er) {
        // invalid URI for other reasons, eg file://x\u0000y/z
        throw error('invalid file:// specifier', {
          spec,
          cause: er,
        })
      }
    }

    // no //, no authority, be ungovernable

    /* c8 ignore start */
    if (opts?.winPath.isAbsolute(rest)) {
      // file:/absolute => file:///absolute
      // file:/D:/foo => file:///D:/foo
      return [rest, `file://${rest}`]
    }
    /* c8 ignore stop */

    // file:x => file:./x
    return [`./${rest}`, `file:./${rest}`]
  }
