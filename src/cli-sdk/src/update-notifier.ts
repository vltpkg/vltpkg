import { spawn } from 'node:child_process'
import {
  mkdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname } from 'node:path'
import { getCompileCacheDir } from 'node:module'
import { parse } from '@vltpkg/semver'
import { XDG } from '@vltpkg/xdg'
import type { LoadedConfig } from './config/index.ts'
import { isCI, stderr } from './output.ts'
import { __CODE_SPLIT_SCRIPT_NAME } from './update-check.ts'
import { readUpdateState, writeUpdateState } from './update-state.ts'
import type { UpdateState } from './update-state.ts'

const upgradeHint = (path: string): string => {
  const normalized = path.replaceAll('\\', '/')
  if (normalized.includes('/Cellar/vlt/')) return 'brew upgrade vlt'
  if (normalized.includes('/.volta/tools/'))
    return 'volta install vlt@latest'
  if (
    normalized.includes('/lib/node_modules/vlt/') ||
    normalized.includes('/npm/node_modules/vlt/')
  )
    return 'npm install -g vlt@latest'
  return 'https://github.com/vltpkg/vltpkg/releases'
}

export const notifyUpdate = (conf: LoadedConfig, version: string) => {
  try {
    if (
      !process.stderr.isTTY ||
      isCI() ||
      process.exitCode ||
      conf.values.view !== 'human' ||
      conf.values.help ||
      !conf.values['update-notifier'] ||
      !process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON ||
      process.env.VLT_NO_UPDATE_NOTIFIER ||
      process.env.NO_UPDATE_NOTIFIER ||
      process.env.VLT_OFFLINE === '1' ||
      process.env.VLT_OFFLINE === 'true' ||
      process.env.npm_config_offline === 'true' ||
      process.env.npm_command === 'exec' ||
      conf.command === 'ci' ||
      conf.command === 'exec'
    )
      return
    const current = parse(version)
    const registry =
      conf.options.registry ??
      conf.options.registries[conf.options['default-registry-alias']]
    if (!current || !registry) return
    const executable = realpathSync(process.argv[1] ?? '')
    const normalized = executable.replaceAll('\\', '/')
    if (
      normalized.includes('/_npx/') ||
      normalized.startsWith(
        new XDG('vlt/vlx').data().replaceAll('\\', '/') + '/',
      ) ||
      normalized.startsWith(
        new XDG('vlt/vlx-local').cache().replaceAll('\\', '/') + '/',
      )
    )
      return

    const url = new URL(registry)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return
    url.pathname = url.pathname.replace(/\/?$/, '/')
    const file = new XDG('vlt').state('update-check.json')
    const interval = conf.values['update-check-interval'] * 1000
    const now = Date.now()
    const readState = (): UpdateState => {
      const saved = readUpdateState(file)
      return (
          saved?.registry === url.href && saved.version === version
        ) ?
          saved
        : { registry: url.href, version, lastCheck: 0 }
    }
    const hasNotice = (state: UpdateState) => {
      const latest = state.latest && parse(state.latest)
      return (
        latest &&
        latest.compare(current) > 0 &&
        (state.notifiedVersion !== state.latest ||
          now - (state.notifiedAt ?? 0) >= interval)
      )
    }
    const previous = readState()
    if (now - previous.lastCheck < interval && !hasNotice(previous))
      return

    mkdirSync(dirname(file), { recursive: true })
    const lock = `${file}.lock`
    try {
      if (now - statSync(lock).mtimeMs >= 30_000) rmSync(lock)
    } catch {}
    writeFileSync(lock, '', { flag: 'wx', mode: 0o600 })
    let started = false
    try {
      // re-read under the lock so concurrent commands cannot repeat a notice.
      const state = readState()
      if (hasNotice(state)) {
        state.notifiedVersion = state.latest
        state.notifiedAt = now
        writeUpdateState(file, state)
        stderr(
          `Update available: vlt ${version} -> ${state.latest}\n${upgradeHint(executable)}`,
        )
      }
      if (now - state.lastCheck < interval) return
      writeUpdateState(file, { ...state, lastCheck: now })
      const env = { ...process.env }
      const cache = getCompileCacheDir()
      if (cache) env.NODE_COMPILE_CACHE ??= cache
      const child = spawn(
        process.execPath,
        [__CODE_SPLIT_SCRIPT_NAME, file],
        {
          detached: true,
          stdio: 'ignore',
          env,
        },
      )
      child.on('error', () => {
        try {
          rmSync(lock, { force: true })
        } catch {}
      })
      child.unref()
      started = true
    } finally {
      if (!started) rmSync(lock, { force: true })
    }
  } catch {}
}
