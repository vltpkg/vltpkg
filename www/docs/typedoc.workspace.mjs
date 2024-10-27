import { join } from 'path'
import { readFileSync } from 'fs'

export default cwd => {
  const {
    private: isPrivate,
    tshy: { exports },
  } = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  if (isPrivate) {
    return
  }
  return {
    excludeInternal: true,
    excludePrivate: true,
    excludeExternals: true,
    readme: join(cwd, './README.md'),
    entryPoints: Object.values(exports)
      .filter(p => !p.endsWith('package.json'))
      .map(p => join(cwd, p)),
  }
}
