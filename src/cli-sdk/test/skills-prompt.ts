import { PassThrough } from 'node:stream'
import t from 'tap'
import {
  confirm,
  editQuery,
  interactive,
} from '../src/skills-prompt.ts'

const tick = () => new Promise(r => setImmediate(r))

// real readline on in-memory streams; keys are typed once the given
// text shows up in the output
const io = () => {
  const input = new PassThrough()
  const output = new PassThrough()
  let out = ''
  let from = 0
  output.on('data', d => (out += String(d)))
  const type = async (after: string, keys: string) => {
    while (!out.includes(after, from)) await tick()
    from = out.indexOf(after, from) + after.length
    await tick()
    input.write(keys)
  }
  return { input, output, out: () => out, type }
}

t.test('interactive', async t => {
  t.intercept(process.stdin, 'isTTY', { value: true })
  t.equal(interactive(), true)
  t.intercept(process.stdin, 'isTTY', { value: undefined })
  t.notOk(interactive())
})

t.test('confirm', async t => {
  const q = 'Replace it? [y/N] '
  for (const [keys, want] of [
    ['y\n', true],
    ['Y\n', true],
    [' yes \n', true],
    ['\n', false],
    ['n\n', false],
    ['nope\n', false],
    ['\x04', undefined],
    ['\x03', undefined],
  ] as const) {
    const { input, output, out, type } = io()
    const p = confirm(q, { input, output })
    await type(q, keys)
    t.equal(await p, want, JSON.stringify(keys))
    t.match(out(), q)
  }
  const { input, output } = io()
  const p = confirm(q, { input, output })
  input.end()
  t.equal(await p, undefined, 'closed input')
})

t.test('editQuery', async t => {
  const prompt = 'New allow-skills: '
  const ok = async () => {}
  const edit = async (keys: string, current?: string) => {
    const { input, output, out, type } = io()
    const p = editQuery({
      key: 'allow-skills',
      input,
      output,
      prefill: ':not(:malware)',
      check: ok,
      ...(current !== undefined && { current }),
    })
    await type(prompt, keys)
    return { answer: await p, out: out() }
  }
  const accept = await edit('\n')
  t.equal(
    accept.answer,
    ':not(:malware)',
    'enter accepts the prefill',
  )
  t.notMatch(accept.out, 'Current allow-skills')
  t.notMatch(accept.out, 'replaces the current one')
  t.notMatch(accept.out, '⚠️')
  t.equal((await edit('\x15abc \n')).answer, 'abc', 'edited')
  t.equal((await edit('\x15\n')).answer, undefined, 'empty: cancel')
  t.equal(
    (await edit('\x15\x04')).answer,
    undefined,
    'ctrl+D on an empty line: cancel',
  )
  t.equal((await edit('\x03')).answer, undefined, 'ctrl+C: cancel')
  const cur = await edit('\n', ':root > *')
  t.ok(
    cur.out.startsWith(
      '\n⚠️ The new allow-skills replaces the current one. Make sure it still\n' +
        'selects every skill you want: skills it no longer selects are unlinked.\n\n' +
        'Current allow-skills: :root > *\n',
    ),
    'padded intro and current query',
  )

  t.test('allow-scripts', async t => {
    const { input, output, out, type } = io()
    const p = editQuery({
      key: 'allow-scripts',
      input,
      output,
      current: '#a',
      prefill: '#a, #b',
      check: ok,
    })
    await type('New allow-scripts: ', '\n')
    t.equal(await p, '#a, #b')
    t.ok(
      out().startsWith(
        '\n⚠️ The new allow-scripts replaces the current one. Make sure it still\n' +
          "selects every package you trust: packages it no longer selects won't\n" +
          'run their scripts on install.\n\n' +
          'Current allow-scripts: #a\n',
      ),
      'no unbuild warning',
    )
  })

  t.test('allow-scripts, nothing stored', async t => {
    const { input, output, out, type } = io()
    const p = editQuery({
      key: 'allow-scripts',
      input,
      output,
      prefill: '#a',
      check: ok,
    })
    await type('New allow-scripts: ', '\n')
    t.equal(await p, '#a')
    t.ok(
      out().startsWith(
        '\n⚠️ The answer is saved as allow-scripts: installs run the scripts\n' +
          'of every package it selects. Select only packages you trust.\n\n',
      ),
      'save warning',
    )
    t.notMatch(out(), 'replaces the current one')
  })

  t.test('colors', async t => {
    const { editQuery } = await t.mockImport<
      typeof import('../src/skills-prompt.ts')
    >('../src/skills-prompt.ts', {
      '../src/output.ts': {
        styleTextStdout: (f: string, s: string) =>
          `<${f}>${s}</${f}>`,
      },
    })
    const { input, output, out, type } = io()
    const p = editQuery({
      key: 'allow-skills',
      input,
      output,
      current: 'S',
      prefill: 'p',
      check: ok,
    })
    await type('New allow-skills: </cyan>', '\n')
    t.equal(await p, 'p')
    t.match(out(), '<yellow>Current allow-skills: S</yellow>\n')
    t.match(out(), '<cyan>New allow-skills: </cyan>')
  })

  t.test('closed input', async t => {
    const { input, output } = io()
    const p = editQuery({
      key: 'allow-skills',
      input,
      output,
      prefill: 'x',
      check: ok,
    })
    input.end()
    t.equal(await p, undefined)
  })

  t.test('invalid: message, asked again prefilled', async t => {
    const { input, output, type } = io()
    const checked: string[] = []
    const p = editQuery({
      key: 'allow-skills',
      input,
      output,
      prefill: 'p',
      check: async q => {
        checked.push(q)
        if (checked.length === 1) throw new Error('bad query')
      },
    })
    await type(prompt, '\x15bad\n')
    await type('bad query\n', '\n')
    t.equal(await p, 'bad', 'the bad answer is the new prefill')
    t.strictSame(checked, ['bad', 'bad'])
  })

  t.test('input closed while checking', async t => {
    const { input, output, type } = io()
    const p = editQuery({
      key: 'allow-skills',
      input,
      output,
      prefill: 'p',
      check: async () => {
        input.end()
        await new Promise(r => setTimeout(r, 50))
        throw new Error('bad query')
      },
    })
    await type(prompt, '\n')
    t.equal(await p, undefined)
  })
})

t.test('default streams', async t => {
  const opened: unknown[] = []
  let answer = 'y'
  const { confirm, editQuery } = await t.mockImport<
    typeof import('../src/skills-prompt.ts')
  >('../src/skills-prompt.ts', {
    'node:readline/promises': {
      createInterface: (o: unknown) => {
        opened.push(o)
        return {
          on: () => {},
          once: () => {},
          question: async () => answer,
          write: () => {},
          close: () => {},
        }
      },
    },
  })
  t.equal(await confirm('Q? '), true)
  answer = 'q'
  // tap writes to stdout too: restore before asserting
  const written = t.capture(process.stdout, 'write', () => true)
  const edited = await editQuery({
    key: 'allow-skills',
    current: 'S',
    prefill: 'p',
    check: async () => {},
  })
  written.restore()
  t.equal(edited, 'q')
  t.match(
    written
      .args()
      .map(a => String(a[0]))
      .join(''),
    'Current allow-skills: S',
  )
  t.strictSame(opened, [
    { input: process.stdin, output: process.stdout, terminal: true },
    { input: process.stdin, output: process.stdout, terminal: true },
  ])
})
