// The binary's entry. A one-line shim on purpose: the compiler reads its
// build config (`perry.compilePackages`) from the package.json nearest the
// entry file, and that has to be the repo root's, not a published package's.
// The entry itself lives with the CLI, in src/cli-sdk.
import '../../src/cli-sdk/src/perry.ts'
