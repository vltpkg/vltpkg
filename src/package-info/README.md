<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/b0202cbf-a174-4b2a-b5d8-205a165db417" />
        <h1 align="center">
            <strong>@vltpkg/package-info</strong>
        </h1>
    </a>
</section>

<p align="center">
    Get information about packages.
    <br/>
    A spiritual descendant of [pacote](http://npm.im/pacote).
</p>

## Usage

```js
import {
  manifest,
  tarball,
  packument,
  resolve,
} from '@vltpkg/packge-info'

// get the full packument for the named package

// note that the '@2' part of the spec is irrelevant here,

// if it's a semver range.

console.log(await packument('bar@2'))

// get the manifest for a single version, resolving it.

console.log(await manifest('foo@latest'))

// get the tarball as a Buffer

const tarballBuffer = await tarball('foo@1.x')

// just figure out what it resolves to

const { resolved, integrity } = await resolve('bar@latest')
```
