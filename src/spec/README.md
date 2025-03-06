![spec](https://github.com/user-attachments/assets/39f3e98d-ad31-4efc-882c-1fe75c115507)

# @vltpkg/spec

This is a library for parsing **package specifiers**.

**[Namings](#named-vs-unnamed)** ·
**[Specifiers](#types-of-specifiers)** · **[Usage](#usage)** ·
**[Properties](#properties)**

## Overview

Specifiers are primarily used in the following cases:

- On the command line, like `vlt add foo@1.x`
- In manifests (such as `package.json`) where dependencies are listed,
  like `"dependencies": { "foo": "1.x" }`
- Internally within vlt, such as lockfiles and so on.

## Named vs Unnamed

A "named" specifier is one with the full name included, separated from
the specifier by a `@` character, such as `foo@1.x` or
`@vltpkg/spec@1.0.0`. The `name` in these cases would be `foo` and
`@vltpkg/spec`, respectively.

Note that it does _not_ always correspond to the `"name"` in the
manifest of the resolved package! For example, `foo@npm:react@latest`
would resolve to the latest version of `react`, but would be named
`foo` in the dependency graph, and loaded as `import('foo')`.

## Types of Specifiers

The following specifier types are supported:

- `workspace:...` - Provide a semver range, or one of `~`, `*`, or `^`
  to match against a dependency that exists in a workspace project of
  a monorepo. The package name _must_ exist as a workspace project in
  the monorepo. If a semver range is provided, then it must match the
  referenced workspace package version. Otherwise:

  - `*` - Fill in whatever version is in the workspace, without any
    prefix. So, if `./packages/foo` depends on `bar@workspace*`, and
    `bar` is version `1.2.3`, then `foo` will be published with
    `{ "dependencies": { "bar": "1.2.3" }}`
  - `~` or `^` - Publish with the version found in the monorepo,
    prefixed by the character. So in the example above, it'd be
    `bar@~1.2.3` or `bar@^1.2.3`, respectively.

- `semver range` - A valid semver range (including the empty string or
  a single semver version). This is resolved against the default
  registry. If the spec is a valid semver range, then no further
  parsing is done.

- `git+ssh://<url>[selector]` or `git+https://<url>[selector]` - A
  `git+ssh` or `git+https` url will be checked out by git. If no 'git
  selector' is provided, then it will attempt to install from the
  default version. The git selector can be:

  - `#committish` Any valid `committish` value will be checked out.
    So, shasum, branch, tag, etc., would all work.
  - `#semver:<range>` If a semver range is provided, it will select
    over all the tags that are valid semver versions, and pick the
    highest version number that satisfies the range.
  - Additional fields can be specified by a `::`-separated series of
    `key:value` pairs. Currently only `path:<path in repo>` is
    supported, for referencing packages living below the root of the
    repository, as in a monorepo. For example,
    `tcompare@github:tapjs/tapjs#bf457f24::path:src/tcompare`

- `https://some-host.com/path/to/file.tgz` - An https or http URL to a
  tarball will resolve to itself.

- `file:///path/to/file` - A file URL will resolve to itself. If it is
  a directory, it will be reified as a symbolic link to the folder
  specified. If it is a file, it will be treated as a tarball that
  gets unpacked into place. Relative paths are resolved from the
  package with the dependency.

- `registry:<registry url>#<name>[@version range or dist-tag]` - This
  will use the specified registry url, and look up the name and
  version on that registry.

- If a registry shorthand is defined in the options, then you can use
  it as an alias for that registry. Currently, the only shorthand that
  is enabled by default is `npm:<name>[@version-range]` as a shorthand
  for `registry:https://registry.npmjs.org/#<name>[@version-range]`.

- If a git repository shorthand is defined in the options, then you
  can use that shorthand prefix as an alias for that git host.
  Currently, `github:`, `bitbucket:`, `gitlab:`, and `gist:` are
  supported by default.

- Anything else will be treated as a `dist-tag` in the registry
  packument. For example, `foo@latest` or `blah@legacy-v2`

## Usage

```js
import { Spec, type SpecOptions } from '@vltpkg/spec'

// optional: create some registry shorthands
const opts: SpecOptions = {
  registries: {
    // internal company registry or something
    acmereg: 'https://dev.acme.internal/npm',
  },
  gitHosts: {
    github: 'git+ssh://git@github.com:$1/$2',
    // the $# pieces here are replaced by the path-separated
    // portions, so eg `github:user/project#whatever
    acmegit: 'git+ssh://git@dev.acme.internal/git/$1/$2/$3',
  }
}

const lodash = Spec.parse('lodash@latest')
// which is the same as:
const lodash = Spec.parse('lodash@npm:lodash@latest')
// which is the same as:
const lodash = Spec.parse(
  'lodash@registry:https://registry.npmjs.org/#lodash@latest'
)

// pull from github
const ghProject = Spec.parse('abbrev@github:npm/abbrev-js#main', opts)

// pull from our internal hosts using the acme shorthand names
const fooFromAcmeReg = Spec.parse('foo@acmereg:foo@1.2', opts)
const fooFromAcmeReg = Spec.parse(
  'foo@acmegit:department/team/monorepo#main;directory:packages/foo',
  opts,
)
```

## Properties

- type - the type of spec that this is. One of `'registry'`, `'git'`,
  `'file'`, or `'remote'`.
- spec - the full named specifier passed to the constructor
- options - options passed to the constructor, plus defaults
- name - the name portion, so `foo` in `foo@1.x`
- bareSpec - just the part AFTER the name, so `1.x` in `foo@1.x`
- when `type` === `'git'`:
  - gitRemote - git remote url
  - gitSelector - the `::`-separated set of `key:value` fields
  - gitSelectorParsed - the `gitSelector` parsed into a Record object
  - gitCommittish - the commit sha, branch, or tag
  - namedGitHost - `github`, `gitlab`, `bitbucket`, etc.
  - remoteURL - when using a named git host with an archive url
    template, and a committish is provided, this is the url to
    download a tarball archive
  - semver - the semver range, if provided in the gitSelector
  - range - the parsed semver range, if valid
- when `type` === `'registry'`:
  - registry - the registry to look up data from
  - namedRegistry - in the case of alias specs, the named registry
  - registrySpec - the semver range or dist-tag
  - semver - the semver range, if valid
  - range - the parsed semver range, if valid
  - distTag - the registrySpec when it is not a semver range
  - subspec - the parsed spec to to be resolved against the registry
    in question, if the spec is a named registry like `npm:x@2.x` or
    an explicit registry url like
    `registry:https://registry.npmjs.org#x@2.x`.
- when `type` === `'file'`:
  - file - the path on disk to find the package
- when `type` === `'remote'`:
  - remoteURL - the url to the remote archive
