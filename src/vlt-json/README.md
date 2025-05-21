# @vltpkg/vlt-json

Facilities for finding, loading, and updating the `vlt.json` vlt
project configuration file.

## Usage

```js
import { find, load, save } from '@vltpkg/xdg'

// finds the project config file.
const projectRoot = find()

// Load a bit of data, providing a typedef check for it
// If a matching field is not found, then `undefined` is returned.

const isWorkspaceConfig = (x: unknown): x is WorkspaceConfig => { ... }
const workspaceOptions = load('workspaces', isWorkspaceConfig)
// now workspaceOptions is WorkspaceConfig | undefined

// do whatever and then save it back. This organizes writes so
// that we do not clobber the file if there are multiple parts
// of vlt all trying to write to it. Once the validator function
// is established, it'll be re-used on that field when saving.
save('workspaces', workspaceConfig)

// If you need a user-level instead of project-level file, use
// the third argument to specify that file instead.
const userConfig = load('config', isValidConfig, 'user')
const projectConfig = load('config', isValidConfig)
userConfig.color = true
save('config', userConfig, 'user')

// Note that save() ALWAYS clobbers, so if you want to do
// a merge, load() first, make the change, and then save back.
// If the file was edited since it was opened, then this will
// fail.
```
