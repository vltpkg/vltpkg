<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/b91bae89-456d-4841-853a-e3655aa34ac4" />
        <h1 align="center">
            <strong>@vltpkg/package-json</strong>
        </h1>
    </a>
</section>

<p align="center">
    Manages reading `package.json` files.
    <br/>
    Caches previously seen files and augments error messages for clarity.
</p>

## Usage

```js
import { PackageJson } from '@vltpkg/package-json'

const packageJson = new PackageJson()
const dir = process.cwd()
const pkg = await packageJson.read(dir)
```
