import { resolve } from 'node:path'
import { fishPath, posixPath, shellPathCommand } from '../shell.ts'
import type { ShellOptions } from '../shell.ts'

/** `<global-dir>/env`, sourced by sh-family rc files */
export const envFile = (globalDir: string): string =>
  resolve(globalDir, 'env')

/** `<global-dir>/env.fish`, sourced by fish */
export const envFishFile = (globalDir: string): string =>
  resolve(globalDir, 'env.fish')

/** sh script adding `dir` to the `PATH` once */
export const renderEnv = (
  dir: string,
  o: ShellOptions = {},
): string =>
  [
    '# vlt global bin dir; sourced from the shell rc file. Edit with `vlt setup --path`.',
    'case ":$PATH:" in',
    `  *:${posixPath(dir, o)}:*) ;;`,
    `  *) ${shellPathCommand('sh', dir, o)} ;;`,
    'esac',
    '',
  ].join('\n')

/** fish script adding `dir` to the `PATH` of the session */
export const renderEnvFish = (
  dir: string,
  o: ShellOptions = {},
): string => {
  const d = fishPath(dir, o)
  return [
    '# vlt global bin dir; sourced from fish config. Edit with `vlt setup --path`.',
    // session only, and fish_add_path needs fish 3.2
    `contains -- ${d} $PATH; or set -gx PATH ${d} $PATH`,
    '',
  ].join('\n')
}
