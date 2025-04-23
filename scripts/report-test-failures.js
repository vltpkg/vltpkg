import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import chalk from 'chalk'

const summary = resolve(
  import.meta.dirname,
  '..',
  'pnpm-exec-summary.json',
)

const execStatus = () => {
  try {
    return (
      JSON.parse(readFileSync(summary, 'utf8')).executionStatus ?? {}
    )
  } catch {
    return {}
  }
}

for (const [path, result] of Object.entries(execStatus())) {
  if (result.status !== 'failure') continue

  // we had failures, so exit in failure
  process.exitCode = 1

  const pkg = JSON.parse(readFileSync(join(path, 'package.json')))

  const title = ` ${pkg.name} - ./${relative('.', path)}`
  const length = Math.max(40, title.length)
  console.log(
    [
      '',
      chalk.black.bold.bgWhiteBright('='.repeat(length)),
      chalk.black.bold.bgWhiteBright(title.padEnd(length, ' ')),
      chalk.black.bold.bgWhiteBright('='.repeat(length)),
    ].join('\n'),
  )

  if (pkg.devDependencies?.tap) {
    spawnSync('pnpm', ['tap', '-c', '-Rterse', 'replay'], {
      cwd: path,
      stdio: 'inherit',
    })
  } else {
    console.log(result)
  }
}
