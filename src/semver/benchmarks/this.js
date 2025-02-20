// This must import the dist file since it is run in a loop by hyperfine
// and we don't want type stripping to contribute to the benchmark.
import { satisfies } from '../dist/esm/index.js'
console.log(satisfies('1.2.3', '^1.0'))
