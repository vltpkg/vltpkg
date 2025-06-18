import { test } from 'tap'
import { version } from '../src/index.ts'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

test('version increments patch version', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'vlt-version-test-'))

  const packageJson = {
    name: 'test-package',
    version: '1.0.0',
  }

  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  )

  const result = await version('patch', {
    cwd: dir,
    commit: false,
    tag: false,
  })

  t.equal(result.oldVersion, '1.0.0')
  t.equal(result.newVersion, '1.0.1')

  const updatedPackageJson = JSON.parse(
    await readFile(join(dir, 'package.json'), 'utf8'),
  )

  t.equal(updatedPackageJson.version, '1.0.1')
})

test('version increments minor version', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'vlt-version-test-'))

  const packageJson = {
    name: 'test-package',
    version: '1.0.0',
  }

  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  )

  const result = await version('minor', {
    cwd: dir,
    commit: false,
    tag: false,
  })

  t.equal(result.oldVersion, '1.0.0')
  t.equal(result.newVersion, '1.1.0')
})

test('version sets specific version', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'vlt-version-test-'))

  const packageJson = {
    name: 'test-package',
    version: '1.0.0',
  }

  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  )

  const result = await version('2.3.4', {
    cwd: dir,
    commit: false,
    tag: false,
  })

  t.equal(result.oldVersion, '1.0.0')
  t.equal(result.newVersion, '2.3.4')
})
