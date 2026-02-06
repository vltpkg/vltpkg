---
description: CLI SDK architecture, commands, and config system
globs: src/cli-sdk/src/**/*,src/cli-sdk/test/**/*
alwaysApply: false
---
# CLI SDK Workspace

## Architecture

- `src/cli-sdk/src/config/definition.ts` — **Central file**: all CLI options, flags, commands defined here (jackspeak)
- `src/cli-sdk/src/config/index.ts` — Config parsing, option resolution
- `src/cli-sdk/src/config/usage.ts` — Help text generation
- `src/cli-sdk/src/commands/` — Command implementations
- `src/cli-sdk/src/exec-command.ts` — Shared run/exec logic

## Adding CLI Options

Define in `definition.ts`, access via `conf.values['option-name']` or `conf.get('option-name')`:
```typescript
.opt({
  'your-option': {
    hint: 'value', short: 'y',
    description: 'Description', default: 'default-value',
  },
})
```

## Command Structure

Every command exports: `usage` (CommandUsage), `views` (Views), `command` (CommandFn). Pattern:
```typescript
const usageDef = { command: 'name', usage: '<args>', description: '...' } as const satisfies CommandUsageDefinition
export const usage: CommandUsage = () => commandUsage(usageDef)
export const views: Views<ReturnType> = { human: ViewClass, json: result => result }
export const command: CommandFn<ReturnType> = async conf => { /* impl */ }
```

## Adding Commands

1. Add to `canonicalCommands` in `definition.ts`
2. Create `src/cli-sdk/src/commands/your-command.ts`
3. Add tests in `src/cli-sdk/test/commands/your-command.ts`

## Config Precedence

CLI args → project vlt.json → user vlt.json → defaults. Command-specific: `command.{name}` in vlt.json.

## Testing

Uses `t.mockImport` for mocking. Config objects typed as `LoadedConfig`.
