# @vltpkg/version

Version command for vlt - increments package.json version and creates
git tags.

This package provides functionality similar to `npm version`, allowing
you to:

- Increment semantic version numbers (major, minor, patch)
- Set specific version numbers
- Automatically commit and tag changes in git

## Usage

```typescript
import { version } from '@vltpkg/version'

// Increment patch version (1.0.0 -> 1.0.1)
const result = await version('patch')

// Increment minor version (1.0.0 -> 1.1.0)
const result = await version('minor')

// Increment major version (1.0.0 -> 2.0.0)
const result = await version('major')

// Set specific version
const result = await version('2.3.4')

// With options
const result = await version('patch', {
  cwd: '/path/to/project',
  commit: true, // Create git commit (default: true)
  tag: true, // Create git tag (default: true)
  message: 'v%s', // Commit message template (default: 'v%s')
})
```

## Version Increment Types

- `major` - Increment major version (1.0.0 → 2.0.0)
- `minor` - Increment minor version (1.0.0 → 1.1.0)
- `patch` - Increment patch version (1.0.0 → 1.0.1)
- `premajor` - Increment to next major prerelease (1.0.0 → 2.0.0-0)
- `preminor` - Increment to next minor prerelease (1.0.0 → 1.1.0-0)
- `prepatch` - Increment to next patch prerelease (1.0.0 → 1.0.1-0)
- `prerelease` - Increment prerelease version (1.0.0-0 → 1.0.0-1)

## Options

- `cwd` - Working directory (default: `process.cwd()`)
- `prereleaseId` - Identifier for prerelease versions
- `commit` - Whether to create a git commit (default: `true`)
- `tag` - Whether to create a git tag (default: `true`)
- `gitTagVersion` - Whether to prefix tag with 'v' (default: `true`)
- `message` - Commit message template, %s is replaced with version
  (default: `'v%s'`)

## Return Value

The function returns a `VersionResult` object:

```typescript
type VersionResult = {
  oldVersion: string
  newVersion: string
  packageJsonPath: string
  committed?: boolean
  tagged?: boolean
}
```

## Git Integration

If the current directory is a git repository, the command will:

1. Check that the working directory is clean (no uncommitted changes)
2. Update package.json with the new version
3. Add package.json to git staging
4. Create a commit with the specified message
5. Create a git tag with the new version

## Error Handling

The function throws errors for:

- Missing package.json file
- Invalid version increment types
- Uncommitted changes in git repository
- Git operation failures
