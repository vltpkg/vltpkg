![vlt](https://github.com/user-attachments/assets/345949ff-7150-4b97-856d-c7e42c2a4db5)

# @vltpkg/cli-sdk

The SDK for the `vlt` command line interface.

## Usage

```ts
import vlt from '@vltpkg/cli-sdk'
process.argv.splice(2, 0, '--version')
await vlt()
```

```ts
import vlt from '@vltpkg/cli-sdk'
process.chdir('/some/vlt/project')
process.argv.splice(2, 0, 'install')
await vlt()
```
