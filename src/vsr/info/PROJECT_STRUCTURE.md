# VSR Project Directory Structure

**VSR** is a minimal "npm-compatible" registry that replicates core
features of `registry.npmjs.org` while adding new capabilities. It's
built to run on Cloudflare Workers with D1 database and R2 storage.

## 📁 Root Directory

```
registry/
├── config.ts                   # Global application configuration
├── package.json                # NPM package definition & scripts
├── wrangler.json               # Cloudflare Workers deployment config
├── drizzle.config.mjs          # Database ORM configuration
├── tsconfig.worker.json        # TypeScript config for Workers environment
├── types.ts                    # Shared TypeScript type definitions
├── README.md                   # Project documentation & setup guide
├── CONTRIBUTING.md             # Development guidelines & workflow
├── LICENSE                     # FSL-1.1-MIT license
└── src/                        # Source code directory
```

### Configuration Files

- **`config.ts`** - Central configuration hub containing:
  - API documentation settings
  - Upstream registry definitions (npm, local)
  - Authentication domains and redirect URIs
  - Cookie options and security settings
  - Development server configuration

- **`wrangler.json`** - Cloudflare Workers configuration:
  - D1 database bindings for SQLite storage
  - R2 bucket bindings for package tarballs
  - Queue configurations for background processing
  - Asset serving and development settings

- **`package.json`** - Project metadata and tooling:
  - Build scripts for dist creation and asset copying
  - Database management commands (push, migrate, studio)
  - Development server orchestration
  - TypeScript compilation for both Node.js and Workers

## 📁 Source Code (`src/`)

```
src/
├── index.ts                    # Main application entry point
├── api.ts                      # OpenAPI specification
├── routes/                     # HTTP route handlers
├── utils/                      # Shared utility functions
├── db/                         # Database layer
├── assets/                     # Static files & frontend
├── bin/                        # CLI executables
└── schemas/                    # Validation schemas
```

### Core Application

- **`index.ts`** - Main Hono application setup:
  - Middleware stack (auth, logging, CORS, security)
  - Route mounting and organization
  - Queue consumer for background package refreshing
  - Health checks and API documentation endpoints

- **`api.ts`** - OpenAPI specification:
  - REST API definitions for all endpoints
  - Request/response schemas
  - Authentication requirements
  - Used by Scalar for auto-generated documentation

## 📁 Route Handlers (`src/routes/`)

```
routes/
├── users.ts                    # User profile management
├── tokens.ts                   # Authentication token CRUD
├── packages.ts                 # Package operations (45KB - core logic)
├── search.ts                   # Package search & discovery
├── auth.ts                     # OAuth authentication flows
├── access.ts                   # Access control & permissions
└── static.ts                   # Static asset serving
```

### Route Responsibilities

- **`packages.ts`** (Primary) - Core package registry functionality:
  - Package publishing and unpublishing
  - Version management and dist-tags
  - Tarball upload/download via R2
  - Upstream registry proxying for missing packages
  - Package metadata validation and transformation

- **`tokens.ts`** - Granular Access Token (GAT) management:
  - Token creation with scoped permissions
  - CRUD operations for user tokens
  - Scope validation (pkg:read/write, user:read/write)

- **`auth.ts`** - Authentication workflows:
  - OAuth callback handling
  - Session management
  - Login/logout flows

- **`access.ts`** - Fine-grained access control:
  - Package-level permissions
  - Collaborator management
  - Access list operations

- **`search.ts`** - Package discovery:
  - Text-based package searching
  - Filtering and pagination
  - Integration with upstream registries

- **`users.ts`** - User management:
  - Profile retrieval (`/-/whoami`)
  - User information endpoints

- **`static.ts`** - Asset delivery:
  - Favicon serving
  - CSS stylesheet delivery
  - Image asset routing
  - robots.txt and manifest files

## 📁 Utilities (`src/utils/`)

```
utils/
├── auth.ts                     # Authentication & token verification
├── cache.ts                    # Package caching strategies (13KB)
├── database.ts                 # Database connection middleware
├── packages.ts                 # Package validation & processing (13KB)
├── response.ts                 # HTTP response formatting
├── routes.ts                   # Route middleware & guards
├── spa.ts                      # Single Page Application serving
├── tracing.ts                  # Request monitoring & performance
└── upstream.ts                 # Registry proxying & fallback
```

### Utility Functions

- **`cache.ts`** - Intelligent caching system:
  - Package metadata caching from upstream registries
  - Version-specific caching strategies
  - Cache invalidation and refresh logic
  - Background queue integration for cache warming

- **`packages.ts`** - Package processing utilities:
  - NPM package validation
  - Tarball extraction and analysis
  - Manifest transformation and normalization
  - Semver handling and version resolution

- **`upstream.ts`** - Multi-registry support:
  - Configuration-driven upstream definitions
  - Fallback logic for missing packages
  - Request proxying and response transformation
  - Error handling for upstream failures

- **`auth.ts`** - Security utilities:
  - Bearer token verification
  - Scope-based authorization
  - JWT handling and validation

## 📁 Database Layer (`src/db/`)

```
db/
├── client.ts                   # Database client & operations
├── schema.ts                   # Drizzle schema definitions
└── migrations/                 # Database migrations
    ├── 0000_initial.sql       # Base schema creation
    ├── 0001_uuid_validation.sql # UUID constraints
    ├── drop.sql               # Development reset script
    └── meta/                  # Drizzle migration metadata
        ├── _journal.json      # Migration history
        ├── 0000_snapshot.json # Schema snapshots
        └── 0001_snapshot.json
```

### Database Architecture

- **`schema.ts`** - Core data model:
  - `packages` table: Package metadata and tags
  - `versions` table: Version-specific manifests
  - `tokens` table: Authentication tokens with scoped permissions
  - Origin tracking (local vs upstream)
  - Caching timestamps for upstream data

- **`client.ts`** - Database operations:
  - Drizzle ORM integration
  - CRUD operations for all entities
  - Transaction management
  - Connection pooling for Workers environment

## 📁 Static Assets (`src/assets/`)

```
assets/
└── public/
    ├── images/
    │   ├── bg.png             # Background image
    │   ├── clients/           # Package manager logos
    │   │   ├── logo-npm.png
    │   │   ├── logo-yarn.png
    │   │   ├── logo-pnpm.png
    │   │   ├── logo-bun.png
    │   │   ├── logo-deno.png
    │   │   └── logo-vlt.png
    │   └── favicon/           # Browser icons (multiple formats)
    │       ├── favicon.ico
    │       ├── favicon.svg
    │       ├── apple-touch-icon.png
    │       ├── favicon-96x96.png
    │       ├── site.webmanifest
    │       ├── web-app-manifest-192x192.png
    │       └── web-app-manifest-512x512.png
    └── styles/
        └── styles.css         # Application CSS
```

### Asset Organization

- **`images/clients/`** - Package manager branding:
  - Logos for supported package managers
  - Used in web interface for client recognition
  - Consistent sizing and format

- **`images/favicon/`** - Browser integration:
  - Multiple icon formats for cross-platform support
  - Progressive Web App manifest
  - Apple touch icons for iOS devices

## 📁 CLI Tools (`src/bin/`)

```
bin/
├── vsr.ts                      # Main CLI entry point
└── demo/                       # Demo project workspace
    ├── package.json           # Demo dependencies
    └── vlt.json               # VLT configuration
```

### Command Line Interface

- **`vsr.ts`** - Development server orchestration:
  - Spawns wrangler dev (port 1337)
  - Manages local development environment
  - Debug mode for verbose logging
  - Automatic path resolution for monorepo structure

- **`demo/`** - Testing workspace:
  - Minimal project for vlt server requirements
  - Used during development to simulate real package operations
  - Contains basic package.json and vlt configuration

## 📁 Validation (`src/schemas/`)

```
schemas/
└── [Currently empty - reserved for future validation schemas]
```

**Purpose**: Reserved directory for request/response validation
schemas, likely to be populated with Zod or similar validation
libraries.

## 🏗️ Architecture Overview

### Request Flow

1. **Static Assets** → Direct serving via Cloudflare Workers
2. **Package Requests** → Local DB check → Upstream fallback if needed
3. **Authentication** → Bearer token validation → Scope checking
4. **Publishing** → Validation → R2 storage → DB metadata update

### Data Flow

- **Local Packages**: Stored in D1 (metadata) + R2 (tarballs)
- **Upstream Packages**: Cached in D1 with TTL, proxied from npm
- **Background Jobs**: Queue-based cache refresh for popular packages

### Security Model

- **Granular Access Tokens**: Scoped permissions per package/user
- **Origin Tracking**: Distinguish local vs upstream packages
- **Scope Validation**: Package-level and user-level access control

This architecture provides a scalable, serverless npm registry that
can serve as both a private registry and an intelligent proxy to
upstream registries like npmjs.org.
