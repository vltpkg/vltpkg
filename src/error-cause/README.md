![error-cause](https://github.com/user-attachments/assets/5fa00d7e-19dd-400e-9a77-6d37ded3fe2d)

# @vltpkg/error-cause

Utility functions for `Error` creation to help enforce vlt's
`Error.cause` conventions.

**[Usage](#usage)** ·
**[Error Reporting](#challenges-of-error-reporting)** ·
**[Conventions](#conventions)** · **[Error Types](#error-types)**

## Why

Most node programs have a mishmash of error codes and various `Error`
subtypes, all in different shapes, making error handling and reporting
more difficult at the top level. This negatively impacts debugging and
user experience.

The JavaScript `Error` constructor has a
[`cause` option](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)
which is supported since Node 16.9. We should use it!

This module makes that easy.

## Usage

```js
import { error, typeError } from '@vltpkg/error-cause'

// create an error when a lower-level thing fails
try {
  doSomethign()
} catch (er) {
  throw error('The something for the whatever failed', er)
}

// create an error with some extra information
if (!thing.valid) {
  throw error('the thing is not valid', {
    code: 'EINVAL',
    found: thing,
  })
}

// create an error from a lower-level error with extra info
try {
  doSomethign(thing)
} catch (er) {
  throw error('the thing is not valid', {
    code: 'EINVAL',
    found: thing,
    cause: er,
  })
}

// create an error and prune some stack frames
// use this when we want to report the location of a
// function call, not its internals.
const checkBar = () => {
  if (!bar) {
    // will report from the checkBar() call, not here.
    throw error('no bar', { found: bar, wanted: true }, checkBar)
  }
  // ...
}
```

The functions will create an error object with a `cause` property if
set, and the type checks will ensure that the `cause` object matches
vlt's conventions.

## Challenges of Error Reporting

- Provide enough information to be useful. On full inspection, we
  should ideally always get back to not just the initial error that
  was thrown, but also all locations where the error might have been
  caught and handled in some way.
- Do not provide more information than is useful. Eg,
  `console.error(er)` should not fill the entire scrollback buffer.
- New modules and libraries should have minimal friction in creating a
  new style of error when needed. This means, minimize the amount that
  any module needs to know about the errors raised by any other
  module, including especially top-level error handling.
- _Some_ information about the error must be known to our top-level
  error handler, so that it can usefully report errors and suggest
  corrections.

## Solution

- A strictly upheld convention of Error object creation using the
  `cause` property.
- Top level error handler can have special logic where necessary for
  known error codes, but will still be able to do something more
  useful when an Error object follows our conventions, even if it's
  not a code that it knows.

## Conventions

The following conventions should be followed for all `Error` creation
and handling throughout the vlt codebase.

- **If you can't help, get out of the way.** Just let throws pass
  through to the top when nothing can be done to assist.
- **Add information by using thrown error as `cause`.** Use a
  previously-thrown error as the `cause` option.
- **Add even more info with a double-`cause`.** If more info can be
  added to a prior throw, nest the `cause` properties like
  `{ some, other, info, cause: priorError }`.
- **Always set `cause`, even if no prior error.** Use a plain-old
  JavaScript object following our field conventions.
- **Rare exception: synthetic ErrnoException style errors.** If we are
  doing something that is similar to a system operation, it's
  sometimes ok to mimic node's pattern.
- **Do not subclass `Error`.** Just create a plain old Error, and set
  the `cause` with additional information.

### If you can't help, don't get in the way.

Whenever possible, if no remediation or extra information can usefully
be added, it's best to just not handle errors and let them be raised
at the higher level. For example, instead of this:

```
let data
try {
  data = await readFile(someFile)
} catch (er) {
  throw new Error('could not read some file!')
}
```

this is preferred:

```js
const data = await readFile(someFile)
```

### Add information by using thrown error as `cause`.

If we can add information or do something else useful for the user in
understanding the problem, do so by creating a new `Error` and setting
the original thrown error as the `cause`.

```js
let data
try {
  data = await readFile(someFile, 'utf8')
} catch (er) {
  // adds semantic information about what the file was for
  throw error('The lock file was not found', er)
}
```

### Add even more info with a double-`cause`.

If we can add even more information, that should ideally _not_ be put
on the Error we throw, but on a `cause` object. Because `cause`
objects can nest, we can do something like this:

```js
let data
try {
  data = await readFile(someFile, 'utf8')
} catch (er) {
  throw error(`could not resolve '${name}'`, {
    // extra data about the situation
    // it's ok to put big noisy objects in here, not on the error
    // object itself!
    name,
    spec,
    target,
    // original error that was thrown
    cause: er,
  })
}
```

### Always set `cause`, even if no prior error.

Instead of this:

```
throw Object.assign(new Error('could not resolve'), {
  code: 'ERESOLVE',
  from,
  spec,
  registry,
})
```

Do this instead:

```js
throw error('could not resolve', {
  code: 'ERESOLVE',
  from,
  spec,
  registry,
})
```

This makes any big objects easily skipped if we want to just output
the error with `console.error()` or something, but still preserves any
debugging information that might be useful all the way down the chain.

### Rare exception: synthetic ErrnoException style errors.

In some rare low-level cases, there are operations we perform that are
very similar to a node filesystem operation.

For example, the `@vltpkg/which` module raises an error that is
intentionally similar to node's filesystem `ENOENT` errors, because
that is semantically sensible.

In those cases, the error _must_ follow node's conventions as close as
possible. If we feel the need to add additional information beyond a
known system error code, string path, etc., or if the message isn't
one that is typically raised by the underlying system, then it's a
good sign that we ought to be creating an `Error` with a `cause` so
that it can be reported more usefully.

In such cases, this is fine:

```js
// identical to the error thrown by node's fs
throw Object.assign(new Error('not found'), {
  path: someFile,
  code: 'ENOENT',
})
```

But this is way out of bounds and makes no sense:

```
throw Object.assign(new Error('could not resolve'), {
  code: 'EPERM',
  spec,
  config: someHugeConfigObjectOrSomething,
})
```

**Do not** copy properties from a lower-level error or cause onto the
new cause object. That is unnecessary, and obscures the origin of
problems. Instead, just include the lower-level error as the `cause`
property. If you already have a low-level error, you don't need to
invent a synthetic one!

For example, do not do this:

```
let data
try {
  data = await readFile(lockFile, 'utf8')
} catch (er) {
  throw error('lockfile not found', {
    code: er.code,
    path: er.path,
  })
}
```

Instead, do this:

```js
let data
try {
  data = await readFile(lockFile, 'utf8')
} catch (er) {
  throw new Error('lockfile not found', { cause: er })
}
```

### Do not subclass `Error`.

Just use the `Error` classes defined in the language. Additional
information about error causes should be on the `cause` property, not
implicit in the constructor type.

I.e. do not do this:

```
class VersionError extends Error {
  version?: Version
  constructor(version: Version | string) {
    super('Could not version')
    this.version = Version.parse(version)
  }
}
// ...
throw new VersionError(myVersion)
```

Instead, do this:

```js
throw error('Could not version', { version })
```

## `cause` Field Conventions

All of these are optional. Additional fields may be used where
appropriate, and should be added to this list over time.

- `cause` - The `cause` field within a `cause` object should always be
  an `Error` object that was previously thrown. Note that the `cause`
  on an Error itself might _also_ be a previously thrown error, if no
  additional information could be usefully added beyond improving the
  message.
- `name` - String. The name of something.
- `offset` - Number. The offset in a Buffer or file where we are
  trying to read or write.
- `registry` - String or URL. A package registry.
- `code` - This must be a string if set, and should only be present if
  it's one of our creation, not a code raised on a system error. Eg,
  `ERESOLVE`, not `ENOENT`.
- `path` - The target of a file system operation.
- `target` - path on disk that is being written or extracted to
- `spec` - a `@vltpkg/spec.Spec` object relevant to the operation that
  failed.
- `from` - string. The file path origin of a resolution that failed,
  for example in the case of relative `file:` specifiers.
- `status` - Number or null. Either the exit code of a process or an
  HTTP response status code.
- `signal` - `NodeJS.Signals` string or null, indicating the signal
  that terminated a process.
- `validOptions` - Array of valid options when something is not a
  valid option. (For use in `did you mean X?` output.)
- `todo` - String message indicating what bit of work this might be a
  part of, what feature needs to be implemented, etc. Eg,
  `{ todo: 'nested workspace support' }`.
- `wanted` - A desired value that was not found, or a regular
  expression or other pattern describing it.
- `found` - The actual value, which was not wanted.
- `max` - A maximum value, which was exceeded.
- `min` - A minimum value, which was not met.
- `response` - An HTTP response or
  `@vltpkg/registry-client.CacheEntry`
- `url` - A string or URL object
- `repository` - String git repository remote
- `version` - string or `@vltpkg/semver.Version`
- `range` - string or `@vltpkg/semver.Range`
- `manifest` - `@vltpkg/pick-manifest.Manifest`
- `packument` - `@vltpkg/pick-manifest.Packument`
- `cwd` - The current working directory of a process that failed

## Error Types

- If there is a _type_ problem with an argument, for example a
  `string` was expected and a `number` was provided, throw a
  `TypeError`. **Do not** use it for a value that is the correct type
  but otherwise invalid, such as a `string` argument that is actually
  a `string` but does not match an expected pattern.
- If the type is fine, but a parsed string is invalid and not
  parseable, use `SyntaxError`.
- In all other cases, use `Error`.
