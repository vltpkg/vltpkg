<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/edbe377f-d0ae-4d48-9658-3eb91d1bd482" />
        <h1 align="center">
            <strong>@vltpkg/cache-unzip</strong>
        </h1>
    </a>
</section>

<p align="center">
This is a script that can be run as a detached background process to un-gzip any cached response bodies in the vlt cache.
</p>

<p align="center">
  <a href="#usage"><strong>Usage</strong></a>
	·
  <a href="#why-do-this"><strong>Why Do This?</strong></a>
</p>

## Usage

Whenever you get a cache entry with a gzipped body, tell this
module about it.

```js
import { register } from '@vltpkg/cache-unzip'
import { Cache } from '@vltpkg/cache'

const cache = new Cache({ path: cachePath })

// later...

const response = get_response_cache_entry_somehow()
cache.set(myKey, response.encode())

// unzip it after this process is done
if (response.isGzip) {
  register(cachePath, myKey)
}
```

On process exit, these registered keys will be passed as arguments to a detached deref'ed `vlt-cache-unzip` process. So,
the main program exits normally, but the worker ignores the `SIGHUP` and keeps going until it's done. The next time that
cache entry is read, it won't have to be unzipped.

## Why Do This

Because it's faster to not have to decompress the same content more times than necessary.
