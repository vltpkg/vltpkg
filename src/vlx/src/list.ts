import { XDG } from '@vltpkg/xdg'
import { opendir } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function* vlxList() {
  const path = new XDG('vlt/vlx').data()
  const dir = await opendir(path)
  const dirEntries: AsyncIterable<import('node:fs').Dirent> = dir
  // eslint-disable-next-line @typescript-eslint/await-thenable
  for await (const dirent of dirEntries) {
    yield resolve(path, dirent.name)
  }
}
