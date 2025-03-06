![workspaces](https://github.com/user-attachments/assets/1f6f73ad-bb51-461a-9f2f-efcf1b884a1a)

# @vltpkg/workspaces

Utilities for working with vlt workspaces.

**[Usage](#usage)** · **[Run Order](#run-order)**

## Usage

```js
import { Monorepo, Workspace } from '@vltpkg/workspaces'

const m = await Monorepo.load()
// Can also provide a path option, defaults to process.cwd()
// m = await Monorepo.load(someOtherPath)
// Constructor can be used directly, but less convenient:
//   const m = new Monorepo()
//   await m.load()

const appWS = m.get('@acme/app')
console.log(appWS.path) // packages/apps/app
console.log(appWS.groups) // ['apps', 'frontend']
console.log(await appWS.manifest()) // { name: "@acme/app", version: etc }
console.log(appWS.inGroup('frontend')) // true
console.log(appWS.inGroup('datalayer')) // false
assert.equal(m.get('packages/apps/app'), appWS) // can get by path

for (const workspace of m) {
  // iterate over the workspaces in topological dependency order
}

// run a script or some other async operation, in topological
// dependency graph order. Eg, for a project containing
// workspaces a, b, c, d, where a depends on b and c, and b
// and c both depend on d, it will run first for d, then for b
// and c in parallel, then for a when c and b are both resolved.
// depResults is a map of [ws, result] of all dependency
// workspaces that were completed prior to this one
// AbortSignal can be used to stop the operation.
m.run(async (ws, signal, depResults) => {
  await doSomethingAsync(ws, signal)
})

// methods that return a set of Workspace objects actually return
// Monorepo object with all the same methods.
console.log(m.group('app')) // Monorepo object containing only those keys
m.group('app').run(async ([name, ws]) => {
  // logs all the workspaces in the 'app' group
  console.log(name, ws)
})

// Since loading everything can be slow, and some actions don't
// require loading the entire set, you can use this method if you
// want to just want to load a single workspace or those matching
// a specific pattern.
const apps = new Monorepo()
apps.load({ groups: 'apps' })
const { manifest } = app.get('packages/my-app')

// get workspace names in no particular order
for (const name of m.names()) {
  // @vltpkg/cache, @vltpkg/semver, etc.
}

// get workspace paths in no particular order
for (const path of m.paths()) {
  // apps/webapp, utils/is-even, etc.
}
```

Configuration is stored in the project root at `vlt-workspaces.json`.
The type of the object in the file must be:

```ts
type WorkspaceConfiguration =
  | string
  | string[]
  | { [group: string]: string | string[] }
```

If it's an object, each key is a group name, and each value is a path,
glob, or array of paths and globs, which specify the location of the
workspace projects. Glob matches are only considered if they are a
directory containing a `package.json` file.

A `string` or `string[]` in the file is interpreted as
`{"packages": <value>}`. Ie, the default group is `packages`.

Workspaces are allowed to be in multiple groups, so something like
this is fine:

```json
{
  "apps": "apps/*",
  "frontend": ["utils/frontend", "apps/website"],
  "utils": ["utils/**"]
}
```

If the glob patterns result in a situation where one workspace folder
is contained within another workspace folder, an error will be raised.

## Run Order

The `monorepo.run` method can run an async function for each workspace
in the project, visiting each exactly once.

When workspaces depend on one another, it will walk dependencies
before dependents, _unless_ there is a cycle, as that would be
impossible, and vlt does not prevent workspace dependency cycles.
