![promise-spawn](https://github.com/user-attachments/assets/8dcb044f-7611-4db9-8042-3a964e270d61)

# @vltpkg/promise-spawn

Spawn a process and return a promise that resolves when the process
closes. Fork of
[`@npmcli/promise-spawn`](http://npm.im/@npmcli/promise-spawn).

**[Usage](#usage)** · **[API](#api)** ·
**[Caveats](#typescript-inference-caveats)**

## Differences from `@npmcli/promise-spawn`

- A `SpawnPromise(cmd, args, options)` class is added that handles
  most of the functionality.
- `promiseSpawn.open()` is removed
- When run as root, it just runs the command as root, it doesn't try
  to infer the uid/gid based on the owner of the cwd..
- No special handling for `shell: true` processes, and thus, no
  escaping of arguments in that case. (It's just passed through to
  Node's `spawn()` method.)
- Fully type-aware, even down to inferring the presence and type of
  `stdout` and `stderr` properties, as well as the properties added
  via the optional `extra` argument.

## Usage

```js
import { promiseSpawn, SpawnPromise } from '@vltpkg/promise-spawn'

promiseSpawn(
  'ls',
  ['-laF', 'some/dir/*.js'],
  {
    cwd: '/tmp/some/path', // defaults to process.cwd()
    stdioString: true, // stdout/stderr as strings rather than buffers
    stdio: 'pipe', // any node spawn stdio arg is valid here
    // any other arguments to node child_process.spawn can go here as well,
  },
  {
    extra: 'things',
    to: 'decorate',
    the: 'result',
  },
)
  .then(result => {
    // {status === 0, signal === null, stdout, stderr, and all the extras}
    console.log('ok!', result)
  })
  .catch(er => {
    // er has all the same properties as the result, set appropriately
    console.error('failed!', er)
  })
```

## API

### `promiseSpawn(cmd, args, opts, extra)` -> `Promise`

Run the command, return a Promise that resolves/rejects based on the
process result.

Result or error will be decorated with the properties in the `extra`
object. You can use this to attach some helpful info about _why_ the
command is being run, if it makes sense for your use case.

If `stdio` is set to anything other than `'inherit'`, then the
result/error will be decorated with `stdout` and `stderr` values. If
`stdioString` is set to `true`, these will be strings. Otherwise they
will be Buffer objects.

Returned promise is decorated with the `stdin` stream if the process
is set to pipe from `stdin`. Writing to this stream writes to the
`stdin` of the spawned process.

#### Options

- `stdioString` Boolean, default `true`. Return stdout/stderr output
  as trimmed strings rather than buffers.
- `acceptFail` Boolean, default `false`. If true, then a process that
  closes with `status` other than 0, or `signal` other than `null`,
  will reject the promise. If true, then failure exits resolve the
  promise normally. This is useful when you need to run a process
  where an exit status of `>0` is informative, to avoid creating an
  Error object for it.
- Any other options for `child_process.spawn` can be passed as well.

## TypeScript Inference Caveats

_Workaround:_

If you provide a complex stdio option like `['pipe', 'inherit']`, then
this will of course mean that `stdin` is set to a writable stream,
`stderr` is set to a readable stream (because that's the default), but
`stdout` is set to `null`.

The types will accurately infer this from the type of the argument.
However, observe this incorrect result:

```
const result = await promiseSpawn(cmd, args, {
  stdio: ['pipe', 'inherit'],
})
result.stdout
//     ^? string <-- WRONG
result.stderr
//     ^? string
```

TS will infer the `options.stdio` property to be
`('pipe' | 'inherit')[]`. Since the second item of such an array
_might_ be set to `'pipe'` at some point, TS will infer the return
value to include `{ stdout: string }`.

To get around this, typecast the field to its literal value. This is a
bit noisy, but works fine:

```js
const result = await promiseSpawn(cmd, args, {
  stdio: ['pipe', 'inherit'] as ['pipe', 'inherit'],
})
result.stdout
//     ^? null <-- CORRECT!
result.stderr
//     ^? string
```

When given a single argument to apply to all `stdio` fields, this
inference happens correctly by default.
