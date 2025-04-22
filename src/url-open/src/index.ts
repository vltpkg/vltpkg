import { promiseSpawn } from '@vltpkg/promise-spawn'
import { which } from '@vltpkg/which'
import { release } from 'node:os'

let { platform } = process
if (
  platform === 'linux' &&
  release().toLowerCase().includes('microsoft')
) {
  platform = 'win32'
}

export type OpenOptions = {
  signal?: AbortSignal
}

// eslint-disable-next-line no-console
const log = (msg: string) => console.error(msg)

export const urlOpen = async (
  url: string,
  { signal }: OpenOptions = {},
) => {
  const cmd =
    platform === 'win32' ? 'start'
    : platform === 'darwin' ? 'open'
    : 'xdg-open'
  const args = [url]

  // print as hyperlink if we think it's a TTY
  // TODO: only do if chalk says the support level is high enough
  const link =
    process.stderr.isTTY ?
      `\u001b]8;;${url}\u001b\\${url}\u001b]8;;\u001b\\`
    : url

  if (
    // Use stdin.isTTY to detect if we should attempt to open
    // a browser or not
    !process.stdin.isTTY ||
    // Also check if the command is available since we don't
    // want the process to exit if we aren't able to open a browser.
    (await which(cmd, { nothrow: true })) === null
  ) {
    log(`Could not open a browser. Please open ${link} manually.`)
    return
  }

  log(`Opening a web browser to: ${link}`)

  return promiseSpawn(
    platform === 'win32' ? `${cmd} ""` : cmd,
    platform === 'win32' ? ['""', ...args] : args,
    {
      signal,
      shell: true,
      stdio: 'inherit',
    },
  )
}
