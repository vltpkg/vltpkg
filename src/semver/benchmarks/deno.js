import { parse, parseRange, satisfies } from '@std/semver'
console.log(satisfies(parse('1.2.3'), parseRange('^1.0')))
