![smoke-test](https://github.com/user-attachments/assets/4ceaa394-8707-4bb3-935a-b29cd2c397ee)

# @vltpkg/smoke-test

> An internal only workspace that is not published to any registry.

Utilized for smoke testing the source and bundled versions of the CLI.

## Usage

This workspace use `child_process.spawn` to test all the variants of
the CLI.

This is necessary because we compile the CLI for publishing which has
some fundamental differences from how the source is run when
developing.

For example, detached processes normally can be called with
`spawn(process.execPath, fileName)` in development, but when compiled
`process.execPath` is the CLI so a different mechanism is needed to
route the process to the `fileName` entry point.

We are also currently doing all our development with Node and
experimenting with other runtimes like Deno for compilation.

In general, most of our tests should be co-located in the workspace
for the functionality they are testing. But when there is specific
behavior that can only be tested when compiled or bundled, write a
smoke test in this workspace.

### Variants

The following variants of the CLI can be tested:

```ts
export const allVariants = ['source', 'bundle', 'compile'] as const
```

Not all of these are meant to be published, but they should all behave
the same. And it is helpful for debugging to be able to test some of
the intermediate variants specifically.

For example, `bundle` is the code after is has been bundled by
`esbuild` but before it has been compiled to a single binary. So it
can be helpful to test only that variant if a bug is suspected to be
caused by bundling and not compilation.

## API

Here is a simple test that installs a package and tests that it
appears in the lockfile:

```ts
import t from 'tap'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  runMultiple,
  allVariants,
  defaultVariants,
} from './fixtures/run.ts'

t.test('install a package', async t => {
  const { status, stdout } = await runMultiple(t, ['i', 'eslint'], {
    test: async (t, { dirs }) => {
      const lock = JSON.parse(
        readFileSync(join(dirs.project, 'vlt-lock.json'), 'utf-8'),
      )
      t.ok(
        lock.edges['file~. eslint'],
        'eslint should be in the lockfile',
      )
    },
  })
  t.equal(status, 0, 'command exited successfully')
  t.ok(stdout, 'something was written to stdout')
})
```

## Caveats

- Smoke tests must be run sequentially in CI. This is handled by the
  `smoke-test.yml` workflow. Locally, it is fine to run them in
  parallel, but there has been flakiness in CI caused by some of the
  spawned `vlt` processes hanging. This should be investigated more
  once we have debug logging in place.
