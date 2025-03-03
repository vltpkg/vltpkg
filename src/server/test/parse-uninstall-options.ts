import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { parseUninstallOptions } from '../src/parse-uninstall-options.ts'

const options = {
  projectRoot: t.testdirName,
  packageJson: new PackageJson(),
  scurry: new PathScurry(t.testdirName),
}
const result = parseUninstallOptions(options, {
  [joinDepIDTuple(['file', '.'])]: ['a', 'b'],
  [joinDepIDTuple(['file', './src/foo'])]: ['x', 'y'],
})
t.equal(result[0], options)

t.matchSnapshot(result[1])
