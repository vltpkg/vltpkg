# @vltpkg/tar

If you are unpacking anything other than npm packages, in
precisely the way that [vlt](https://vlt.sh) does, then this is
probably not what you're looking for.

For a very complete and battle-tested generic tar implementation
in JavaScript, see [node-tar](http://npm.im/tar).

## USAGE

Pass your uncompressed JavaScript package tarball in a Buffer (or
Uint8Array) into the function, along with the folder you want to
drop it in.

It will unpack as fast as possible, using synchronous I/O.

```js
import { unpack } from '@vltpkg/tar'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const gzipped = readFileSync('my-package.tgz')
const unzipped = gunzipSync(gzipped)

unpack(unzipped, 'node_modules/target')
```

## CAVEATS

As stated above, **this is not a general purpose tar
implementation**. It does not handle symbolic links at all (those
aren't allowed in JavaScript packages). It does not respect
uid/gid ownership flags. All files are with a mode of `0o644` (or
`0o666` on Windows - technically it's `0o666` xor'ed with the
system umask, so that'll often be `0o664` on linux systems). All
directories are created with a mode of `0o755` by default (with
the same windows/umask caveats as files, so maybe that's `0o775`
or some such.)

It does not do any of the binary linking or other stuff that a
package manager will need to do. It *just* does the unpack, as
ruthlessly fast as possible, and that's all.

Synchronous IO is used because that's faster and requires less
CPU utilization. The `vlt` executable manages multiple worker
threads doing this work, so faster sync IO for the whole thing is
much more optimal.
