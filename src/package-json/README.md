<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/c1320cba-b069-40b3-ac3a-c0853445b91c" />
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
