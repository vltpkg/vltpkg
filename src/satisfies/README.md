<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/5dc35dbc-c8b2-4dac-844d-81ee5569347b" />
        <h1 align="center">
            <strong>@vltpkg/satisfies</strong>
        </h1>
    </a>
</section>

<p align="center">
    Give it a DepID and a Spec, and it'll tell you whether that dep satisfies the spec.
</p>

## Usage

```js
import { Spec } from '@vltpkg/spec'
import { satisfies } from '@vltpkg/satisfies'

const id = ';;glob@11.0.1'
const spec = Spec.parse('foo@npm:glob@11.x')

console.log(satisfies(id, spec)) // true
```
