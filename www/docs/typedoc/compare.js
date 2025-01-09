import { readdir, readFile } from 'node:fs/promises'
import { join, relative, extname, resolve } from 'node:path'
import { diff as jestDiff } from 'jest-diff'

const markdownContents = async base => {
  const files = await readdir(base, {
    withFileTypes: true,
    recursive: true,
  })
  const res = new Map()
  for (const f of files.filter(d => extname(d.name) === '.md')) {
    const fullPath = join(f.parentPath, f.name)
    res.set(
      relative(resolve(base), fullPath),
      await readFile(fullPath, { encoding: 'utf-8' }),
    )
  }
  return res
}

const diff = async (dirA, dirB) => {
  const [contentsA, contentsB] = await Promise.all(
    [dirA, dirB].map(markdownContents),
  )
  return [...contentsA.entries()]
    .filter(([name, contents]) => contents !== contentsB.get(name))
    .flatMap(([name, contents]) => [
      '='.repeat(40),
      name,
      '='.repeat(40),
      jestDiff(contents, contentsB.get(name), {
        aAnnotation: 'Base',
        bAnnotation: 'PR',
        contextLines: 0,
        expand: false,
        omitAnnotationLines: false,
      }),
    ])
    .join('\n')
    .trim()
}

const res = await diff(...process.argv.slice(2))
if (res) console.log(res)
