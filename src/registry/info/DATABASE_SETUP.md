# VSR Database Setup Guide

This guide explains how to set up the local database for the vlt
serverless registry.

## Quick Setup

For a fresh installation, run:

```bash
pnpm run db:setup
```

This command will:

1. Create the initial database tables (`packages`, `tokens`,
   `versions`)
2. Apply all necessary schema migrations
3. Insert a default admin token

## Manual Setup

If you need to set up the database manually:

```bash
# Create initial tables
pnpm exec wrangler d1 execute vsr-local-database --file=src/db/migrations/0000_initial.sql --local --persist-to=local-store --no-remote

# Apply schema updates (adds columns: last_updated, origin, upstream, cached_at)
pnpm exec wrangler d1 execute vsr-local-database --file=src/db/migrations/0001_wealthy_magdalene.sql --local --persist-to=local-store --no-remote
```

## Database Schema

The database includes three main tables:

### `packages`

- `name` (TEXT, PRIMARY KEY) - Package name (e.g., "lodash",
  "@types/node")
- `tags` (TEXT) - JSON string of dist-tags (e.g.,
  `{"latest": "1.0.0"}`)
- `last_updated` (TEXT) - ISO timestamp of last update
- `origin` (TEXT) - Either "local" or "upstream"
- `upstream` (TEXT) - Name of upstream registry (for cached packages)
- `cached_at` (TEXT) - ISO timestamp when cached from upstream

### `tokens`

- `token` (TEXT, PRIMARY KEY) - Authentication token
- `uuid` (TEXT) - User identifier
- `scope` (TEXT) - JSON string of token permissions

### `versions`

- `spec` (TEXT, PRIMARY KEY) - Package version spec (e.g.,
  "lodash@4.17.21")
- `manifest` (TEXT) - JSON string of package.json manifest
- `published_at` (TEXT) - ISO timestamp when version was published
- `origin` (TEXT) - Either "local" or "upstream"
- `upstream` (TEXT) - Name of upstream registry (for cached versions)
- `cached_at` (TEXT) - ISO timestamp when cached from upstream

## Common Issues

### "no such table: packages"

This error means the database hasn't been initialized. Run:

```bash
pnpm run db:setup
```

### "table packages has no column named last_updated"

This means the initial migration ran but the schema update didn't.
Run:

```bash
pnpm exec wrangler d1 execute vsr-local-database --file=src/db/migrations/0001_wealthy_magdalene.sql --local --persist-to=local-store --no-remote
```

### Reset Database

To completely reset the database:

```bash
pnpm run db:drop
pnpm run db:setup
```

## Database Location

The local database is stored in:

```
./local-store/v3/d1/miniflare-D1DatabaseObject/
```

## Default Admin Token

The setup creates a default admin token:

- **Token**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **UUID**: `admin`
- **Permissions**: Full read/write access to all packages and users

⚠️ **Security Note**: Change this token in production environments!
