import { exec, execFG } from '@vltpkg/run'
import { LoadedConfig } from '../config/index.js'
import { ExecCommand } from '../exec-command.js'

export const usage = `vlt exec [command]
Runs the command with all installed bins in the $PATH
If no command specified, an interactive subshell is spawned.`

export const command = async (conf: LoadedConfig) =>
  await new ExecCommand(conf, exec, execFG).run()
