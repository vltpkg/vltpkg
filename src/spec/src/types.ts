import type { Range } from '@vltpkg/semver'

export type SpecOptions = {
  [k in keyof SpecOptionsFilled]?: SpecOptionsFilled[k]
}

export type Scope = `@${string}`

export type SpecOptionsFilled = {
  /** the registry where a spec should be resolved against */
  registry: string
  /** shorthand prefix names for known registries */
  registries: Record<string, string>
  /** shorthand prefix names for known git hosts */
  'git-hosts': Record<string, string>
  /** tarball hosting services for hosts listed in git-hosts */
  'git-host-archives': Record<string, string>
  /** registries mapped to a `@scope` */
  'scope-registries': Record<Scope, string>
  /** registries that work like https://npm.jsr.io */
  'jsr-registries': Record<string, string>
}

export type GitSelectorParsed = {
  path?: string
  semver?: string
}

export type SpecLikeBase = {
  /** the type of spec that this is, ultimately */
  type: 'file' | 'git' | 'registry' | 'remote' | 'workspace'

  /** the full named specifier passed to the constructor */
  spec: string

  /** options passed to the constructor, plus defaults */
  options: SpecOptionsFilled

  /** the name portion, so `foo` in `foo@1.x` */
  name: string

  /** the name's scope, so `@acme` in `@acme/foo@1.x` */
  scope?: Scope

  /**
   * if the name is scoped, and there's a registry associated with the scope,
   * then this is that registry
   */
  scopeRegistry?: string

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
  gitSelectorParsed?: GitSelectorParsed
  /** the commit value we will check out */
  gitCommittish?: string
  /** github, gitlab, bitbucket, gist, etc. */
  namedGitHost?: string
  /** the path that's parsed when we have a named git host */
  namedGitHostPath?: string

  /**
   * the specifier when using `workspace:` specs
   * This can be either a semver range, `*`, `~`, or `^`,
   * if the name is not modified. Or, it can include a workspace
   * package name or path, like `workspace:packages/foo@*` or
   * `workspace:@scope/foo@*`.
   */
  workspaceSpec?: string

  /**
   * the package name or path of the workspace being referenced
   */
  workspace?: string

  /**
   * In specs like `foo@npm:bar@1`, this is the 'npm' part. Other
   * registries can be mapped using the `registries` option.
   */
  namedRegistry?: string

  /** registry to consult to resolve this spec */
  registry?: string

  /** semver range or dist-tag for resolving against a packument */
  registrySpec?: string

  /**
   * conventional location of the tarball on the registry, if it can be
   * guessed. This is only attempted if the spec is a registry type, with a
   * single version comparator. This can be used to elide resolved urls that
   * are repetitive and predictable.
   */
  conventionalRegistryTarball?: string

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
  subspec?: SpecLikeBase
  /**
   * getter that retrieves the actual spec value to be used
   */
  final: SpecLikeBase

  toString(): string
}

export type SpecLike<Type extends SpecLikeBase> = SpecLikeBase & {
  subspec?: Type
  final: Type
}
