import { semver } from 'bun'
console.log(semver.satisfies('1.2.3', '^1.0'))
