import { promiseSpawn } from '@vltpkg/promise-spawn'
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

export const urlOpen = async (
  url: string,
  { signal }: OpenOptions = {},
) => {
  const cmd =
    platform === 'win32' ? 'start ""'
    : platform === 'darwin' ? 'open'
    : 'xdg-open'
  const args = platform === 'win32' ? ['""', url] : [url]

  // print as hyperlink if we think it's a TTY
  // TODO: only do if chalk says the support level is high enough
  const link =
    process.stderr.isTTY ?
      `\u001b]8;;${url}\u001b\\${url}\u001b]8;;\u001b\\`
    : url
  // eslint-disable-next-line no-console
  console.error(`Opening a web browser to: ${link}`)

  return promiseSpawn(cmd, args, {
    signal,
    shell: true,
    stdio: 'inherit',
  })
}
