import { urlOpen } from '@vltpkg/url-open'
import { stderr } from './output.ts'

/**
 * Open a url in the system browser, without failing the command if the
 * opener does. The opener command may exist but still be unable to launch
 * anything, e.g: `xdg-open` on a headless server. The url was already
 * printed, so the user can open it manually.
 */
export const openUrl = async (url: string) => {
  try {
    await urlOpen(url)
  } catch {
    stderr(`Could not open a browser. Please open ${url} manually.`)
  }
}
