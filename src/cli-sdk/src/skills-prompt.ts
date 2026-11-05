import { createInterface } from 'node:readline/promises'
import { asError } from '@vltpkg/types'
import type { AllowKey } from './allow-query.ts'
import { styleTextStdout } from './output.ts'

/** Streams to prompt on; default stdin and stdout. */
export type PromptStreams = {
  input?: NodeJS.ReadableStream
  output?: NodeJS.WritableStream
}

/** Prompts can be answered: stdin is a TTY. */
export const interactive = (): boolean => process.stdin.isTTY

const open = (s: PromptStreams) => {
  const rl = createInterface({
    input: s.input ?? process.stdin,
    output: s.output ?? process.stdout,
    // prefill and line editing
    terminal: true,
  })
  // ctrl+C cancels
  rl.on('SIGINT', () => rl.close())
  let done = false
  const closed = new Promise<undefined>(r =>
    rl.once('close', () => {
      done = true
      r(undefined)
    }),
  )
  // the answer; undefined once the input is closed (EOF, ctrl+C/D)
  const ask = async (query: string, prefill?: string) => {
    if (done) return undefined
    const q = rl.question(query).catch(() => undefined)
    if (prefill) rl.write(prefill)
    return Promise.race([q, closed])
  }
  return { rl, ask }
}

/**
 * `[y/N]` question: true on `y`/`yes` (any case), else false. Closed
 * input (EOF, ctrl+C/D): undefined (cancel).
 */
export const confirm = async (
  question: string,
  s: PromptStreams = {},
): Promise<boolean | undefined> => {
  const { rl, ask } = open(s)
  try {
    const a = await ask(question)
    return a === undefined ? undefined : /^y(es)?$/i.test(a.trim())
  } finally {
    rl.close()
  }
}

export type EditQueryOptions = PromptStreams & {
  key: AllowKey
  /** stored query, shown above the prompt; unset: nothing stored */
  current?: string
  /** editable answer */
  prefill: string
  /**
   * throws on an invalid query: its message is printed and the
   * question asked again
   */
  check: (q: string) => Promise<unknown>
}

// what a narrower query drops
const dropped: Record<AllowKey, string> = {
  'allow-skills':
    'selects every skill you want: skills it no longer selects are unlinked.\n',
  'allow-scripts':
    "selects every package you trust: packages it no longer selects won't\n" +
    'run their scripts on install.\n',
}

// nothing stored: what saving the answer does
const fresh: Partial<Record<AllowKey, string>> = {
  'allow-scripts':
    '\n⚠️ The answer is saved as allow-scripts: installs run the scripts\n' +
    'of every package it selects. Select only packages you trust.\n\n',
}

/**
 * Ask for a new allow query, prefilled. Empty answer or closed input:
 * undefined (cancel).
 */
export const editQuery = async ({
  key,
  current,
  prefill,
  check,
  ...s
}: EditQueryOptions): Promise<string | undefined> => {
  const output = s.output ?? process.stdout
  if (current !== undefined) {
    output.write(
      `\n⚠️ The new ${key} replaces the current one. Make sure it still\n` +
        dropped[key] +
        '\n' +
        styleTextStdout('yellow', `Current ${key}: ${current}`) +
        '\n',
    )
  } else if (fresh[key]) output.write(fresh[key])
  const prompt = styleTextStdout('cyan', `New ${key}: `)
  const { rl, ask } = open(s)
  try {
    let fill = prefill
    for (;;) {
      const a = (await ask(prompt, fill))?.trim()
      if (!a) return undefined
      try {
        await check(a)
        return a
      } catch (e) {
        output.write(`${asError(e).message}\n`)
        fill = a
      }
    }
  } finally {
    rl.close()
  }
}
