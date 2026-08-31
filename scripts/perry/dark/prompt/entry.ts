// Prompt dark-test harness: the shipped prompt module, driven from piped stdin.
// Imported by relative path — this directory is not a workspace, and the
// point is to exercise the module the CLI actually uses.
import {
  question,
  readLine,
} from '../../../../src/cli-sdk/src/prompt.ts'
import { selectRegistry } from '../../../../src/cli-sdk/src/select-registry.ts'
import { Writable } from 'node:stream'

const captured: string[] = []
const sink = new Writable({
  write(chunk: Buffer, _enc, cb) {
    captured.push(String(chunk))
    cb()
  },
})

const out: Record<string, unknown> = {}
out.compiled = 'perry' in process.versions
out.answer1 = await question('first? ', { output: sink })
out.answer2 = await readLine()
out.registry = await selectRegistry(
  [
    { alias: 'a', url: 'https://a.example/' },
    { alias: 'b', url: 'https://b.example/' },
  ],
  { defaultAlias: 'b', output: sink },
)
// No end-of-input read here: compiled stdin never signals EOF, so a prompt
// with nothing left to read hangs rather than returning ''.
out.prompts = captured
out.stdinIsTTY = process.stdin.isTTY ?? null
console.log(JSON.stringify(out))
