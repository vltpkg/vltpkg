/**
 * Eval harness for the dss-query skill.
 *
 * Runs each case through headless Claude Code (`claude -p`) with the repo
 * root as cwd so the skill loads exactly the way it does for users, then
 * grades deterministically:
 *   1. skill trigger — did the Skill tool fire with dss-query?
 *   2. selector validity — every extracted selector must parse
 *      (@vltpkg/dss-parser throws on invalid DSS)
 *   3. expected shape — expectSelector / expectText patterns
 *
 * Usage (from src/query/skills/dss-query/evals):
 *   node run.ts
 *
 * Requires the `claude` CLI on PATH with working auth. Each case is a real
 * agent run — expect ~30-60s and normal API cost per case.
 * Set CLAUDE_EVAL_MODEL to override the model (e.g. haiku for cheap runs).
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { parse } from '@vltpkg/dss-parser'
import { cases } from './cases.ts'
import type { EvalCase } from './cases.ts'

const repoRoot = resolve(import.meta.dirname, '../../../../..')

type RunResult = {
  resultText: string
  skillFired: boolean
}

const runCase = (c: EvalCase): RunResult => {
  const args = [
    '-p',
    c.prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--max-turns',
    '4',
    '--allowedTools',
    'Skill',
  ]
  if (process.env.CLAUDE_EVAL_MODEL) {
    args.push('--model', process.env.CLAUDE_EVAL_MODEL)
  }
  const proc = spawnSync('claude', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 180_000,
  })
  if (proc.error) {
    throw new Error(`failed to run claude CLI: ${proc.error.message}`)
  }
  let resultText = ''
  let skillFired = false
  for (const line of proc.stdout.split('\n')) {
    if (!line.trim()) continue
    let event: any
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type === 'result') {
      resultText = String(event.result ?? '')
    }
    if (event.type === 'assistant') {
      for (const block of event.message?.content ?? []) {
        if (
          block.type === 'tool_use' &&
          block.name === 'Skill' &&
          String(block.input?.skill ?? '').includes('dss-query')
        ) {
          skillFired = true
        }
      }
    }
  }
  return { resultText, skillFired }
}

/** pull DSS selectors out of `vlt query '<selector>'` occurrences */
const extractSelectors = (text: string): string[] => {
  const out: string[] = []
  for (const m of text.matchAll(/vlt query '([^']+)'/g)) {
    out.push(m[1])
  }
  return out
}

let failures = 0

for (const c of cases) {
  const errors: string[] = []
  let run: RunResult
  try {
    run = runCase(c)
  } catch (err) {
    console.error(`✗ ${c.name}: ${(err as Error).message}`)
    failures++
    continue
  }

  const expectSkill = c.expectSkill ?? true
  if (run.skillFired !== expectSkill) {
    errors.push(
      expectSkill ?
        'skill did not trigger'
      : 'skill triggered but should not have',
    )
  }

  const selectors = extractSelectors(run.resultText)
  if (expectSkill) {
    for (const sel of selectors) {
      try {
        parse(sel)
      } catch {
        errors.push(`selector does not parse: ${sel}`)
      }
    }
    if (c.expectSelector) {
      if (!selectors.some(s => c.expectSelector!.test(s))) {
        errors.push(
          `no selector matched ${c.expectSelector} — got: ${
            selectors.join(' | ') || '(none)'
          }`,
        )
      }
    }
    if (c.expectText) {
      for (const re of c.expectText) {
        if (!re.test(run.resultText)) {
          errors.push(`response did not match ${re}`)
        }
      }
    }
  }

  if (errors.length) {
    failures++
    console.error(`✗ ${c.name}`)
    for (const e of errors) console.error(`    ${e}`)
  } else {
    console.log(`✓ ${c.name}`)
  }
}

console.log(
  `\n${cases.length - failures}/${cases.length} cases passed`,
)
process.exit(failures ? 1 : 0)
