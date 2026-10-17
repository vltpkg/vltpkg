import { parse } from '@vltpkg/semver'
import { isObject } from '@vltpkg/types'
import { rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { readUpdateState, writeUpdateState } from './update-state.ts'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).href

export const checkForUpdate = async (file: string) => {
  if (!file) return
  try {
    const state = readUpdateState(file)
    const current = state && parse(state.version)
    if (!state || !current) return

    const response = await fetch(
      new URL('-/package/vlt/dist-tags', state.registry),
      {
        signal: AbortSignal.timeout(2500),
        redirect: 'error',
        headers: {
          accept: 'application/json',
          'cache-control': 'no-cache',
        },
      },
    )
    if (!response.ok) return
    const tags: unknown = await response.json()
    if (!isObject(tags)) return

    const channel = current.prerelease?.find(
      p => typeof p === 'string',
    )
    const candidates: unknown[] = [tags.latest]
    if (channel) {
      candidates.push(channel in tags ? tags[channel] : tags.next)
    }
    let latest = current
    for (const candidate of candidates) {
      const version =
        typeof candidate === 'string' ? parse(candidate) : undefined
      if (version && version.compare(latest) > 0) latest = version
    }

    const saved = readUpdateState(file)
    if (
      saved?.registry !== state.registry ||
      saved.version !== state.version ||
      saved.lastCheck !== state.lastCheck
    )
      return
    writeUpdateState(file, { ...saved, latest: String(latest) })
  } catch {
  } finally {
    try {
      rmSync(`${file}.lock`, { force: true })
    } catch {}
  }
}

if (isMain(process.argv[1])) {
  process.title = 'vlt-update-check'
  await checkForUpdate(process.argv[2] ?? '')
}
