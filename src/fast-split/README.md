![fast-split](https://github.com/user-attachments/assets/0181afb7-0e03-41e6-b85c-2b5095b5d263)

# @vltpkg/fast-split

This is a very fast alternative to `String.split()`, which can be used
to quickly parse a small-to-medium sized string by a given delimiter.

**[It's fast](#how-fast-is-it)** · **[Usage](#usage)**

## How Fast Is It!?

This is about 10% faster for splitting short strings by a short
delimiter. When we have to walk the resulting list for any reason, or
limit the number of items returned, it's an even bigger difference.

2024 M1 macbook pro, using node 20.11.0, v8 version 11.3.244.8-node.17
Counts are operations per ms, splitting the string '1.2.3-asdf+foo' by
the delimiter '.', transforms calling part.toUpperCase(), and limits
at 2 items

```
              split 10385.779
          fastSplit 10718.341
    splitEmptyCheck  9563.721
fastSplitEmptyCheck 11273.537
 splitTransformLoop  5722.724
  splitTransformMap  6136.161
 fastSplitTransform  6438.606
         splitLimit  7076.179
     fastSplitLimit 13257.948
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
  Number(s),
)
```
