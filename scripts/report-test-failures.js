import { spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import { relative } from 'path'
import chalk from 'chalk'

const execStatus = () => {
  try {
    return (
      JSON.parse(readFileSync('./pnpm-exec-summary.json', 'utf8'))
        .executionStatus ?? {}
    )
  } catch {
    return {}
  }
}

for (const [path, { status }] of Object.entries(execStatus())) {
  if (status !== 'failure') continue
  // we had failures, so exit in failure
  process.exitCode = 1
  const rel = './' + relative('.', path)
  console.log('\n' + chalk.black.bold.bgWhiteBright(rel))
  spawnSync('tap', ['-c', '-Rterse', 'replay'], {
    cwd: path,
    stdio: 'inherit',
  })
}
