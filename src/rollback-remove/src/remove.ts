import { rimraf } from 'rimraf'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

// This is run as a background process, and all the paths to
// be removed written into stdin. We can't pass on argv, because
// it'll be a very long list in many cases.
const main = () => {
  const input: Buffer[] = []
  process.stdin.on('data', c => input.push(c))
  process.stdin.on('end', () => {
    const paths = Buffer.concat(input)
      .toString()
      .replace(/^\u0000+|\u0000+$/, '')
      .split('\u0000')
    if (paths.length) void rimraf(paths)
  })
}

if (process.argv[1] === import.meta.filename) {
  main()
}
