# @vltpkg/dss-breadcrumb

The Dependency Selector Syntax breadcrumb utilities used by the vlt
client.

A returned "Breadcrumb" object is a data structure that contains a
linked list of items that where parsed from a given Dependency
Selector Syntax query string that can be used to navigate through a
given graph.

## Usage

```js
import { getBreadcrumb } from '@vltpkg/dss-breadcrumb'

// Parse a selector string into a breadcrumb
const breadcrumb = getBreadcrumb(':root > #a')

// Use the breadcrumb to navigate through the query
console.log(breadcrumb.current.value) // :root
breadcrumb.next()
console.log(breadcrumb.current.value) // a
```
