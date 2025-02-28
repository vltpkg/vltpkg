import type { Manifest } from '@vltpkg/types'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import {
  asProjectTools,
  inferTools,
  isProjectTools,
} from '../src/project-tools.ts'

t.equal(isProjectTools('hello'), false)
t.equal(isProjectTools('vlt'), true)
t.equal(asProjectTools('vlt'), 'vlt')
t.throws(() => asProjectTools('hello'), {
  cause: { found: 'hello', validOptions: Array },
})

t.test('inferTools', async t => {
  const manifest: Manifest & { deno: unknown } = {
    name: 'my-project',
    version: '1.2.3',
    deno: {},
    engines: { bun: '*' },
  }
  const dir = t.testdir({
    npm: { 'package-lock.json': JSON.stringify({}) },
    vlt: { 'vlt.json': JSON.stringify({}) },
    pnpm: { node_modules: { '.pnpm': {} } },
    jsOnly: {},
  })
  const scurry = new PathScurry(dir)
  t.strictSame(
    new Set(inferTools(manifest, scurry.cwd, scurry)),
    new Set(['deno', 'bun']),
  )
  t.strictSame(
    new Set(inferTools(manifest, scurry.cwd.resolve('vlt'), scurry)),
    new Set(['deno', 'bun', 'vlt']),
  )
  t.strictSame(
    new Set(inferTools(manifest, scurry.cwd.resolve('npm'), scurry)),
    new Set(['deno', 'bun', 'npm']),
  )
  t.strictSame(
    new Set(inferTools(manifest, scurry.cwd.resolve('pnpm'), scurry)),
    new Set(['deno', 'bun', 'pnpm']),
  )
  t.strictSame(
    new Set(inferTools({}, scurry.cwd.resolve('jsOnly'), scurry)),
    new Set(['js']),
  )
})
