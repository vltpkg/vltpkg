import { error } from '@vltpkg/error-cause'
import { question } from './prompt.ts'

/** A configured registry the user can act against. */
export type RegistryCandidate = {
  /** the configured alias name (a key in `registries`) */
  alias: string
  /** the resolved registry URL */
  url: string
}

export type SelectStreams = {
  input: NodeJS.ReadableStream
  output: NodeJS.WritableStream
}

/**
 * Interactively prompt the user to choose one of the configured
 * registries. `defaultAlias` (when present in `candidates`) is
 * pre-selected so pressing enter accepts it.
 *
 * Streams are injectable so tests can drive the prompt deterministically.
 */
export const selectRegistry = async (
  candidates: RegistryCandidate[],
  {
    defaultAlias,
    input = process.stdin,
    output = process.stdout,
  }: {
    defaultAlias?: string
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
  } = {},
): Promise<string> => {
  const defaultIndex = Math.max(
    candidates.findIndex(c => c.alias === defaultAlias),
    0,
  )
  const fallback = candidates[defaultIndex] ?? candidates[0]
  if (!fallback) {
    throw error('No registries to select from', { code: 'ECONFIG' })
  }

  output.write('Multiple registries are configured. Select one:\n')
  for (const [i, c] of candidates.entries()) {
    const marker = i === defaultIndex ? ' (default)' : ''
    output.write(`  ${i + 1}) ${c.alias} -> ${c.url}${marker}\n`)
  }

  const answer = (
    await question(`Registry [${defaultIndex + 1}]: `, {
      input,
      output,
    })
  ).trim()

  if (!answer) return fallback.url

  const choice = Number(answer)
  const picked = candidates[choice - 1]
  if (!Number.isInteger(choice) || !picked) {
    throw error('Invalid registry selection', {
      found: answer,
      validOptions: candidates.map((_, i) => String(i + 1)),
      code: 'EUSAGE',
    })
  }
  return picked.url
}
