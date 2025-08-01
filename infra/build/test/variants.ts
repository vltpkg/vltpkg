import t from 'tap'
import {
  createVariants,
  createArtifacts,
  isVariant,
} from '../src/variants.ts'
import type { VariantWithArtifact } from '../src/variants.ts'
import type { Bin } from '../src/bins.ts'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

t.test('snapshot', async t => {
  const bin = '__BIN__' as Bin
  const dirs = {
    Source: '__DIR__',
    Bundle: '__DIR__',
    Compile: '__DIR__',
  }
  const snap = ({ artifact, env, ...v }: VariantWithArtifact) => ({
    ...v,
    ...env,
    args: v.args(bin).join(' '),
    dir: artifact.dir,
    bin: artifact.bin(bin),
  })

  for (const [type, v] of Object.entries(
    createVariants({
      artifacts: createArtifacts({
        windows: false,
        dirs,
      }),
    }),
  )) {
    t.matchSnapshot(snap(v), type)
  }

  for (const [type, v] of Object.entries(
    createVariants({
      artifacts: createArtifacts({
        windows: true,
        dirs,
      }),
    }),
  )) {
    t.matchSnapshot(snap(v), `${type} windows`)
  }
})

t.test('isVariant', async t => {
  t.ok(isVariant('Source'))
  t.ok(!isVariant('Unknown'))
})

t.test('cleanup=true', async t => {
  const dir = t.testdir()
  const { Source, Bundle, Compile } = createArtifacts({
    cleanup: true,
    bins: ['vlt'],
    dirs: {
      Source: join(dir, 'source'),
      Bundle: join(dir, 'bundle'),
      Compile: join(dir, 'compile'),
    },
  })

  t.notOk(Source.cleanup)
  t.ok(Bundle.cleanup)
  t.ok(Compile.cleanup)

  await Bundle.prepare?.()
  t.ok(existsSync(Bundle.dir))
  await Compile.prepare?.()
  t.ok(existsSync(Compile.dir))
  await Bundle.cleanup?.()
  t.notOk(existsSync(Bundle.dir))
  await Compile.cleanup?.()
  t.notOk(existsSync(Compile.dir))
})

t.test('cleanup=false', async t => {
  const { Source, Bundle, Compile } = createArtifacts({
    cleanup: false,
    dirs: {
      Source: '__DIR__',
      Bundle: '__DIR__',
      Compile: '__DIR__',
    },
  })

  t.notOk(Source.cleanup)
  t.notOk(Bundle.cleanup)
  t.notOk(Compile.cleanup)
})
