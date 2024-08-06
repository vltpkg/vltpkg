// @ts-check

import tseslint from 'typescript-eslint'

export default tseslint.config({
  ignores: ['**/tap-snapshots/**', '**/dist/**', '**/.tshy-build/**'],
})
