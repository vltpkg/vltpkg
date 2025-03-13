import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { InstallOptions } from '@vltpkg/graph'
import t from 'tap'
import { parseInstallOptions } from '../src/parse-install-options.ts'

const rootDepID = joinDepIDTuple(['file', '.'])
const wsADepID = joinDepIDTuple(['workspace', 'packages/a'])
t.matchSnapshot(
  parseInstallOptions({} as InstallOptions, {
    [rootDepID]: {},
  }),
  'no item added to root',
)

t.matchSnapshot(
  parseInstallOptions({} as InstallOptions, {
    [rootDepID]: {
      abbrev: { version: 'latest', type: 'dev' },
    },
  }),
  'single item added to root',
)

t.matchSnapshot(
  parseInstallOptions({} as InstallOptions, {
    [wsADepID]: {
      abbrev: { version: 'latest', type: 'optional' },
    },
  }),
  'single item added to workspace',
)

t.matchSnapshot(
  parseInstallOptions({} as InstallOptions, {
    [rootDepID]: {
      abbrev: { version: 'latest', type: 'dev' },
    },
    [wsADepID]: {
      'english-days': { version: 'latest', type: 'prod' },
      'simple-output': { version: 'latest', type: 'prod' },
    },
  }),
  'multiple item added to root and workspace',
)
