import t from 'tap'
import type { RegistryCandidate } from '../src/select-registry.ts'

const candidates: RegistryCandidate[] = [
  { alias: 'npm', url: 'https://n/' },
  { alias: 'main', url: 'https://m/' },
]

const load = async (answers: string[]) => {
  const queue = [...answers]
  const questions: string[] = []
  const written: string[] = []
  const mod = await t.mockImport<
    typeof import('../src/select-registry.ts')
  >('../src/select-registry.ts', {
    'node:readline/promises': {
      createInterface: () => ({
        question: async (q: string) => {
          questions.push(q)
          return queue.shift() ?? ''
        },
        close: () => {},
      }),
    },
  })
  const output = {
    write: (s: string) => {
      written.push(s)
      return true
    },
  } as unknown as NodeJS.WritableStream
  return { mod, questions, written, output }
}

t.test('numbered selection', async t => {
  const { mod, output } = await load(['2'])
  t.equal(
    await mod.selectRegistry(candidates, {
      defaultAlias: 'npm',
      output,
    }),
    'https://m/',
  )
})

t.test('empty answer uses default alias', async t => {
  const { mod, output, written } = await load([''])
  t.equal(
    await mod.selectRegistry(candidates, {
      defaultAlias: 'main',
      output,
    }),
    'https://m/',
  )
  t.match(written.join(''), /main -> https:\/\/m\/ \(default\)/)
})

t.test('missing default falls back to first', async t => {
  const { mod, output } = await load([''])
  t.equal(
    await mod.selectRegistry(candidates, {
      defaultAlias: 'nope',
      output,
    }),
    'https://n/',
  )
})

t.test('invalid selection throws', async t => {
  const { mod, output } = await load(['9'])
  await t.rejects(mod.selectRegistry(candidates, { output }), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('non-numeric selection throws', async t => {
  const { mod, output } = await load(['abc'])
  await t.rejects(mod.selectRegistry(candidates, { output }), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('empty candidate list throws', async t => {
  const { mod, output } = await load([])
  await t.rejects(mod.selectRegistry([], { output }), {
    cause: { code: 'ECONFIG' },
  })
})
