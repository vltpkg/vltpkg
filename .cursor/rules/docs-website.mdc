---
description: Documentation website development (Astro/Starlight)
globs: www/docs/src/**/*
alwaysApply: false
---
# Documentation Website (`www/docs/`)

Refer to [Astro/Starlight](https://docs.vlt.sh) for code blocks, components and front end config.


## Content Structure

```
www/docs/src/content/docs/
├── get-started/concepts/   # Core concepts (dependencies, manifests, registries)
├── migration/              # Migration guides from npm/pnpm/yarn
├── cli/                    # CLI reference (options, guides)
│   ├── commands/           # Per-command docs
│   └── selectors/          # DSS selector reference (pseudo-classes, combinators, etc.)
├── packages/               # Package API docs (auto-generated)
└── index.mdx               # Site homepage
```

## Format

MDX files with Astro/Starlight components. Frontmatter:
```mdx
---
title: Page Title
sidebar:
  label: Short Label
  order: 1
---
import { Code } from '@astrojs/starlight/components'
```

Use `<Code code="..." title="Terminal" lang="bash" />` for command examples.

## When to Update Docs

- Adding/changing CLI options → update `cli/configuring.mdx`
- Adding/changing commands → update/create `cli/commands/<cmd>.mdx`
- Adding DSS selectors → update `cli/selectors/` (index + new files)
- Changing install/build behavior → update relevant command + concept docs

## Dev

```bash
cd www/docs
pnpm dev    # local dev server
pnpm build  # production build
```
