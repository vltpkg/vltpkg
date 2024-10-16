import type {
  SpecLike,
  SpecOptions,
  SpecOptionsFilled,
} from './types.js'
export * from './types.js'

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
 * Very simplistic isomorphic Spec implementation that transforms
 * name + bareSpec + type values into a conforming {@link SpecLike} object.
 */
export class Spec implements SpecLike<Spec> {
  static fromLockfileInfo(
    name: string,
    bareSpec: string,
    type: Spec['type'],
    options?: SpecOptions,
  ) {
    return new Spec(name, bareSpec, type, options)
  }
  spec: string
  name: string
  bareSpec: string
  options: SpecOptionsFilled
  type: SpecLike<Spec>['type']
  final: Spec
  constructor(
    name: string,
    bareSpec: string,
    type: Spec['type'],
    options?: SpecOptions,
  ) {
    this.options = getOptions(options)
    this.spec = `${name}@${bareSpec}`
    this.name = name
    this.bareSpec = bareSpec
    this.type = type
    this.final = this
  }
}
