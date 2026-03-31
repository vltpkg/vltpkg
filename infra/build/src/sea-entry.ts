import { basename } from 'node:path'

const BIN_COMMANDS: Record<string, string | undefined> = {
  vlx: 'exec',
  vlr: 'run',
  vlxl: 'exec-local',
  vlrx: 'run-exec',
}

const binName = basename(process.argv[1] ?? 'vlt')
  .replace(/\.exe$/i, '')
  .replace(/-(darwin|linux|win)-(x64|arm64)$/i, '')

const command = BIN_COMMANDS[binName]
if (command) {
  process.argv.splice(2, 0, command)
}

const vlt = await import('@vltpkg/cli-sdk')
await vlt.default()
