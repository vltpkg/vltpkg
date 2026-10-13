![fast-split](https://github.com/user-attachments/assets/0181afb7-0e03-41e6-b85c-2b5095b5d263)

# @vltpkg/fast-split

This is a very fast alternative to `String.split()`, which can be used
to quickly parse a small-to-medium sized string by a given delimiter.

**[It's fast](#how-fast-is-it)** · **[Usage](#usage)**

## How Fast Is It!?

About 1.5x faster than `str.split()` for splitting short strings by a
short delimiter, about 1.1-1.3x when walking or transforming the
resulting list, and about 1.9x when limiting the result to 2 or 3
parts (a dedicated fast path, see `src/index.ts`).

Note: V8 caches `split()` results (no limit) for internalized strings
(literals, JSON keys, short JSON values), so splitting the same such
string repeatedly, as benchmarks over literals do, favors native
`split()`. Substrings, regex captures and built strings don't hit that
cache, and with many distinct internalized strings the cache is a net
cost.

Linux x64, node 26.11.1. Counts are operations per ms, splitting the
string '1.2.3-asdf+foo' (built at runtime) by the delimiter '.',
transforms calling part.toUpperCase(), and limits at 2 items

```
              split 4339.624
          fastSplit 6849.283
    splitEmptyCheck 4190.307
fastSplitEmptyCheck 4803.402
 splitTransformLoop 2772.453
  splitTransformMap 2904.390
 fastSplitTransform 3465.690
         splitLimit 5491.101
     fastSplitLimit 10384.471
```

## Usage

```js
import { fastSplit } from '@vltpkg/fast-split'

// say we want to split a string on '.' characters
const str = getSomeStringSomehow()

// basic usage, just like str.split('.'), gives us an array
const parts = fastSplit(str, '.')

// get just the first two parts, leave the rest intact
// Note: unlike str.split('.', 3), the 'rest' here will
// include the entire rest of the string.
// If you do `str.split('.', 3)`, then the last item in the
// returned array is truncated at the next delimiter
const [first, second, rest] = fastSplit(str, '.', 3)

// If you need to transform it, say if it's an IPv4 address
// that you want to turn into numbers, you can do that by
// providing the onPart method, which will be slightly faster
// than getting an array and subsequently looping over it
// pass `-1` as the limit to give us all parts
const nums = fastSplit(str, '.', -1, (part, parts, index) =>
  Number(part),
)
```
