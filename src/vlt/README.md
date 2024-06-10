# vlt

The command line interface for `vlt`.

## Module Structure

The commands are defined in `./src/commands/<name>.ts`. Each of
these modules must export a function that takes the loaded config
object as an argument and returns a `Promise<void>` or rejects
with an error, and a `usage` string to be printed when run with
`vlt <cmd> --help`.
