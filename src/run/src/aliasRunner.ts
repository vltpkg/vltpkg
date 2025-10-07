import { spawn, spawnSync } from 'node:child_process'

export type RunOpts = {
  cwd: string
  env?: NodeJS.ProcessEnv
  stdio?: 'inherit' | 'pipe' | 'ignore' | any[]
  signal?: AbortSignal
}

/**
 * Runs a shell script string via bash -lc, injecting:
 *   alias node-gyp='vlx node-gyp@latest'
 *
 * Works on Linux/macOS/WSL. Requires bash in PATH.
 */
export function runWithNodeGypAlias(
  script: string,
  opts: RunOpts,
): Promise<number> {
  const { cwd, env, stdio = 'inherit', signal } = opts

  // Compose a one-line bash payload
  const bashPayload = [
    'shopt -s expand_aliases', // enable alias expansion in non-interactive shell
    "alias node-gyp='vlx node-gyp@latest'", // redirect node-gyp
    script, // run user script unchanged
  ].join(' && ')

  const child = spawn('bash', ['-lc', bashPayload], {
    cwd,
    env: { ...process.env, ...env },
    stdio,
    signal,
  })

  return new Promise<number>((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        const map: Record<string, number> = {
          SIGINT: 130,
          SIGTERM: 143,
        }
        resolve(map[signal] ?? 1)
      } else {
        resolve(code ?? 0)
      }
    })
  })
}

/**
 * Check if bash is available in PATH
 */
export function checkBashAvailable(): boolean {
  const result = spawnSync('bash', ['--version'], { stdio: 'ignore' })
  return result.status === 0
}

/**
 * Escape shell arguments to prevent injection attacks
 */
export function escapeShellArg(arg: string): string {
  // Basic shell escaping - wrap in single quotes and escape single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`
}
