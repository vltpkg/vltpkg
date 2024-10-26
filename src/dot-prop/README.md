<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/2f26fc9d-5f78-49cc-bb4b-6549e2233111" />
        <h1 align="center">
            <strong>@vltpkg/dot-prop</strong>
        </h1>
    </a>
</section>

<p align="center">
    A library that allows you to easily access, set, delete, and check deeply nested properties in objects and arrays using string-based paths.
</p>

## Usage

```js
const obj = { foo: { bar: [1, 2, 3] } }

// Get a value
get(obj, 'foo.bar[0]') // 1

// Set a value
set(obj, 'foo.bar[1]', 42) // obj.foo.bar[1] is now 42

// Delete a value
del(obj, 'foo.bar[2]') // Removes obj.foo.bar[2]

// Check if a path exists
has(obj, 'foo.bar[0]') // true
```
