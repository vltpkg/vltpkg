![query](https://github.com/user-attachments/assets/5b4802b7-7567-4f50-8f77-7ee398f58d43)

# @vltpkg/query

The **vlt** query syntax engine.

**[Usage](#usage)** · **[Examples](#examples)** ·
**[Supported Syntax Reference](#supported-syntax-reference)**

## Usage

```js
import { Query } from '@vltpkg/query'

const query = new Query({ nodes })
query.search(':root > *')
```

## Examples

Querying nodes from a local `node_modules` folder.

```js
import { actual } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'

const graph = await actual.load({ projectRoot: process.cwd() })
const query = new Query([...graph.nodes.values()])
query.search(':root > *')
```

## Supported Syntax Reference

The vlt query syntax enable usage of css-selector-like strings to
filter packages.

Many of the common elements of the CSS language are available,
notably:

- `*` Universal selector, matches all selected items.
- `&` Nesting selector, allows for nesting selectors.
- `{}` Curly braces, when querying can be used to nest selectors.

Split by group of selectors below is the complete reference to
supported elements.

### Attribute selectors

Attribute selectors are used to match a value found in the
`package.json` metadata for each of the nodes being queried to a
arbitrary value you choose.

- `[attr]` Matches elements with an `attr` property in its
  `package.json`.
- `[attr=value]` Matches elements with a property `attr` whose value
  is exactly `value`.
- `[attr^=value]` Matches elements with a property `attr` whose value
  starts with `value`.
- `[attr$=value]` Matches elements with a property `attr` whose value
  ends with `value`.
- `[attr~=value]` Matches elements with a property `attr` whose value
  is a whitespace-separated list of words, one of which is exactly
  `value`.
- `[attr|=value]` Matches elements with a property `attr` whose value
  is either `value` or starts with `value-`.
- `[attr*=value]` Matches elements with a property `attr`.
- `[attr=value i]` Case-insensitive flag, setting it will cause any
  comparison to be case-insensitive.
- `[attr=value s]` Case-sensitive flag, setting it will cause
  comparisons to be case-sensitive, this is the default behavior.

### Class selectors

- `.prod` Matches prod dependencies to your current project.
- `.dev` Matches packages that are only used as dev dependencies in
  your current project.
- `.optional` Matches packages that are optional to your current
  project.
- `.peer` Matches peer dependencies to your current project.
- `.workspace` Matches the current project worksacpes (listed in your
  `vlt-workspaces.json` file).

### Combinators

- `>` Child combinator, matches packages that are direct dependencies
  of the previously selected nodes.
- ` ` Descendant combinator, matches all packages that are direct &
  transitive dependencies of the previously selected nodes.
- `~` Sibling combinator, matches packages that are direct
  dependencies of all dependents of the previously selected nodes.

### ID Selectors

Identifiers are a shortcut to retrieving packages by name,
unfortunately this shortcut only works for unscoped packages, with
that in mind it's advised to rely on using **Attribute selectors**
(showed above) instead.

e.g: `#foo` is the same as `[name=foo]`

### Pseudo class selectors

- `:attr(key, [attr=value])` The attribute pseudo-class allows for
  selecting packages based on nested properties of its `package.json`
  metadata. As an example, here is a query that filters only packages
  that declares an optional peer dependency named `foo`:
  `:attr(peerDependenciesMeta, foo, [optional=true])`
- `:empty` Matches packages that have no dependencies installed.
- `:has(<selector-list>)` Matches only packages that have valid
  results for the selector expression used. As an example, here is a
  query that matches all packages that have a peer dependency on
  `react`: `:has(.peer[name=react])`
- `:is(<forgiving-selector-list>)` Useful for writing large selectors
  in a more compact form, the `:is()` pseudo-class takes a selector
  list as its arguments and selects any element that can be selected
  by one of the selectors in that list. As an example, let's say I
  want to select packages named `a` & `b` that are direct dependencies
  of my project root: `:root > [name=a], :root > [name=b]` using the
  `:is()` pseudo-class, that same expression can be shortened to:
  `:root > :is([name=a], [name=b])`. Similar to the css pseudo-class
  of the same name, this selector has a forgiving behavior regarding
  its nested selector list ignoring any usage of non-existing ids,
  classes, combinators, operators and pseudo-selectors.
- `:not(<selector-list>)` Negation pseudo-class, select packages that
  do not match a list of selectors.
- `:outdated(<type>)` Matches packages that are outdated, the type
  parameter is optional and can be one of the following:
  - `any` (default) a version exists that is greater than the current
    one
  - `in-range` a version exists that is greater than the current one,
    and satisfies at least one if its parent's dependencies
  - `out-of-range` a version exists that is greater than the current
    one, does not satisfy at least one of its parent's dependencies
  - `major` a version exists that is a semver major greater than the
    current one
  - `minor` a version exists that is a semver minor greater than the
    current one
  - `patch` a version exists that is a semver patch greater than the
    current one
- `:private` Matches packages that have the property `private` set on
  their `package.json` file.
- `:semver(<value>, <function>, <custom-attribute-selector>)` Matches
  packages based on a semver value, e.g, to retrieve all packages that
  have a `version` satisfied by the semver value `^1.0.0`:
  `:semver(^1.0.0)`. It's also possible to define the type of semver
  comparison function to use by defining a second parameter, e.g:
  `:semver(^1.0.0, eq)` for an exact match, valid comparison types
  are: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `satisfies` (default). A
  third parameter allows for specifying a different `package.json`
  property to use for the comparison, e.g:
  `:semver(^22, satisfies, :attr(engines, [node]))` for comparing the
  value of `engines.node`.
- `:type(registry|file|git|remote|workspace)` Matches packages based
  on their type, e.g, to retrieve all git dependencies: `:type(git)`.

### Pseudo Elements

- `:project` Returns both the root node (as defined below) along with
  any workspace declared in your project.
- `:root` Returns the root node, that represents the package defined
  at the top-level `package.json` of your project folder.
- `:scope` Returns the current scope of a given selector
