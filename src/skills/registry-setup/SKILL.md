---
name: registry-setup
description:
  Configure vlt as a package registry for pnpm, yarn, deno, or bun.
  Use when users ask how to set up or connect their package manager to
  vlt, need registry configuration steps, want to use the vlt.io npm
  mirror, or need to publish packages to their private vlt scope.
allowed-tools: [Read]
context: fork
---

# vlt Registry Setup Helper

Help users configure their package manager to use vlt registries for
both the npm mirror and their private scoped registry.

## Response style

**Get straight to setup:** lead with their package manager, then step-by-step walkthrough with copy-paste commands and a docs link.

Two principles:

- **Account slug matters.** Always remind users that `acme` in
  examples is a placeholder — they must replace it with their actual
  vlt account slug (visible in the vlt.io dashboard).
- **Two registries, two purposes.** Explain that the npm mirror
  (`/npm/`) is for public package caching, and the scoped registry
  (`/main/`) is for publishing private packages.

Example answer shape:

> ## Setting up pnpm with vlt
>
> Replace `acme` with your vlt account slug.
>
> **1. Configure the npm mirror**
>
> ```bash
> pnpm config set registry https://registry.vlt.io/acme/npm/ --location=project
> pnpm login
> rm -rf pnpm-lock.yaml node_modules
> pnpm install
> ```
>
> **2. Configure your private scope**
>
> ```bash
> pnpm config set @acme:registry https://registry.vlt.io/acme/main/ --location=project
> pnpm login --registry=https://registry.vlt.io/acme/main/ --scope=@acme
> ```
>
> You can now install and publish packages from your private `@acme`
> scope.
>
> Learn more: <https://docs.vlt.io/registry/>

## Workflow

1. **Identify the package manager.** Ask which one they're using if
   it's unclear: pnpm, yarn (2+), deno, or bun. Don't assume.

2. **Get their account slug.** Ask for their vlt.io account slug (not
   email) if not mentioned. This appears in their dashboard.

3. **Provide setup steps:**
   - **npm mirror first** (public package caching).
   - **Private scope second** (for publishing their own packages).
   - **Copy-paste ready:** only replace `acme` with their slug.

4. **Authentication.** Explain that they'll use the login command
   appropriate to their package manager (e.g., `pnpm login`,
   `yarn npm login`, `deno` via env var). Tokens are managed per
   registry.

5. **Verification.** Suggest they run `pnpm install` (or equivalent)
   to confirm the setup works before publishing.

6. **Edge cases:**
   - **Bun & Deno:** These require manual token setup via env vars or
     config files — they don't have interactive `login` commands.
   - **Yarn 2+:** Yarn uses `--web-login` for browser-based auth; the
     commands differ from pnpm/npm.
   - **Already using npm/vlt?** For users already on npm or the vlt
     CLI, offer quick transition steps.

## Package manager guide

### pnpm

```bash
# Set up npm mirror
pnpm config set registry https://registry.vlt.io/acme/npm/ --location=project
pnpm login
rm -rf pnpm-lock.yaml node_modules
pnpm install

# Set up private scope
pnpm config set @acme:registry https://registry.vlt.io/acme/main/ --location=project
pnpm login --registry=https://registry.vlt.io/acme/main/ --scope=@acme
```

Configuration file: `.npmrc` (project-level).

### yarn (2+)

```bash
# Set up npm mirror
yarn config set npmRegistryServer "https://registry.vlt.io/acme/npm/"
yarn npm login --web-login --always-auth
rm -rf yarn.lock
yarn install

# Set up private scope
yarn config set npmScopes.acme.npmRegistryServer "https://registry.vlt.io/acme/main/"
yarn config set npmScopes.acme.npmPublishRegistry "https://registry.vlt.io/acme/main/"
yarn npm login --scope acme --always-auth --web-login
```

Configuration file: `.yarnrc.yml` (project-level).

### bun

Bun requires token management via environment variables.

```bash
# 1. Create a token at https://www.vlt.io/tokens/acme
# 2. Add to .env (keep out of git):
VLT_TOKEN=<your-token>

# 3. Create bunfig.toml in your project root:
[install]
registry = { url = "https://registry.vlt.io/acme/npm/", token = "$VLT_TOKEN" }

[install.scopes.acme]
url = "https://registry.vlt.io/acme/main/"
token = "$VLT_TOKEN"

# 4. Install
rm -rf bun.lock node_modules
bun install
```

Configuration file: `bunfig.toml` (project-level) and `.env` (excluded
from git).

### deno

Deno also uses environment variables and `.npmrc`.

```bash
# 1. Create a token at https://www.vlt.io/tokens/acme
# 2. Add to .env (keep out of git):
VLT_TOKEN=<your-token>

# 3. Configure .npmrc:
cat >> .npmrc <<'EOF'
registry=https://registry.vlt.io/acme/npm/
//registry.vlt.io/acme/npm/:_authToken=${VLT_TOKEN}
@acme:registry=https://registry.vlt.io/acme/main/
//registry.vlt.io/acme/main/:_authToken=${VLT_TOKEN}
EOF

# 4. Install
rm -rf deno.lock node_modules
deno install --env-file
```

Configuration file: `.npmrc` (project-level) and `.env` (excluded from
git).

## Common questions

**Q: Where do I find my account slug?**  
A: Log into [vlt.io](https://www.vlt.io), open the dashboard. Your
slug appears in your account settings and in registry URLs like
`https://registry.vlt.io/acme/npm/`.

**Q: Do I need to set up both registries?**  
A: Only if you plan to both install public packages AND publish
private ones. The npm mirror alone is enough for installation; the
scoped registry is only needed if publishing to your private scope.

**Q: How do I create a token for bun/deno?**  
A: Go to [vlt.io/tokens](https://www.vlt.io/tokens/), create a new
token, and copy it into your `.env` file. Keep the `.env` file out of
git.

**Q: What if I'm switching from npm or another registry?**  
A: Update your config to point to vlt, clear your lock file and
`node_modules`, then reinstall. This ensures all dependencies resolve
from the vlt registry.

## Documentation

For complete registry documentation, scopes, and advanced auth:
<https://docs.vlt.io/registry/>

For the vlt CLI setup command (alternative to manual config):
<https://docs.vlt.io/cli/commands/setup>
