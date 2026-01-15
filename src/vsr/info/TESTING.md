# VSR Registry Tests

This directory contains comprehensive tests for the VSR (vlt-specific
registry) covering all endpoints and functionality.

## Test Structure

The test suite uses a hybrid approach combining both mocked and real
Cloudflare Workers environments for optimal coverage and performance.

### Core Package Tests

#### `manifest.test.ts`

**Package manifest endpoint tests** covering both local/private
packages and upstream registry public packages.

**Covers:**

- Local package manifests (packuments, versions, tarballs)
- Upstream registry manifests (NPM, JSR, Custom)
- Version-specific requests and semver handling
- Error handling for invalid packages and versions
- Response structure validation

#### `packaument.test.ts`

**Package packument endpoint tests** for full package information
including all versions and metadata.

**Covers:**

- Local/private package packuments
- Upstream public package packuments (NPM, JSR, Custom)
- Version range filtering and semver queries
- Response structure validation (name, dist-tags, versions, time)
- Error handling and special package names
- Performance and caching behavior

### Utility Endpoint Tests

#### `ping.test.ts`

**Health check endpoint tests** for both root and upstream registries.

**Covers:**

- Root registry ping (`/-/ping`)
- Upstream registry ping (`/{upstream}/-/ping`)
- NPM compatibility headers
- Response format validation

#### `whoami.test.ts`

**User identity endpoint tests** for authentication and user
information.

**Covers:**

- Root registry whoami (`/-/whoami`)
- Upstream registry whoami (`/{upstream}/-/whoami`)
- Authentication behavior (authenticated vs unauthenticated)
- Response format consistency
- Error handling for invalid tokens

#### `search.test.ts`

**Package search endpoint tests** for finding packages across
registries.

**Covers:**

- Root registry search (`/-/search`)
- Upstream registry search (`/{upstream}/-/search`)
- Query parameter handling (text, size, from, quality, popularity,
  maintenance)
- Search response structure and pagination
- Legacy API redirects (`/-/v1/search`)
- Error handling and performance limits

### Management Endpoint Tests

#### `tokens.test.ts`

**Token management endpoint tests** for authentication token CRUD
operations.

**Covers:**

- Token listing (`GET /-/tokens`)
- Token creation (`POST /-/tokens`)
- Token updates (`PUT /-/tokens`)
- Token deletion (`DELETE /-/tokens/{token}`)
- Upstream token management
- Authentication and authorization
- Request validation and error handling

#### `access.test.ts`

**Access control endpoint tests** for package permissions and
collaborator management.

**Covers:**

- Package access status (`/-/package/{pkg}/access`)
- Collaborator management
  (`/-/package/{pkg}/collaborators/{username}`)
- Scoped package access control
- Package list access (`/-/package/list`)
- Authentication and authorization levels
- Permission validation

#### `dist-tags.test.ts`

**Distribution tags endpoint tests** for package version tagging.

**Covers:**

- Dist-tag retrieval (`/-/package/{pkg}/dist-tags`)
- Dist-tag creation/updates (`PUT /-/package/{pkg}/dist-tags/{tag}`)
- Dist-tag deletion (`DELETE /-/package/{pkg}/dist-tags/{tag}`)
- Semver validation and tag name validation
- Authentication and ownership checks
- Complete dist-tag lifecycle operations

### Security and Audit Tests

#### `audit.test.ts`

**Security audit endpoint tests** for vulnerability scanning.

**Covers:**

- Root registry audit (`/-/npm/audit`)
- Upstream registry audit (`/{upstream}/-/npm/audit`)
- Package lock format support (v1, v2, v3)
- Dependency tree validation
- Legacy API redirects
- Request validation and error handling
- Audit implementation status

### Infrastructure Tests

#### `static.test.ts`

**Static asset endpoint tests** for web interface and public files.

**Covers:**

- Public assets (`/public/*`)
- Special files (`/favicon.ico`, `/robots.txt`, `/manifest.json`)
- Content-type headers for different file types
- Cache control and compression
- Security considerations (directory traversal prevention)
- Performance optimization (range requests, conditional requests)

#### `dashboard.test.ts`

**Dashboard endpoint tests** for daemon-mode web interface data.

**Covers:**

- Dashboard configuration (`/dashboard.json`)
- Application data (`/app-data.json`)
- Daemon enable/disable behavior
- Data structure validation
- Feature flag integration
- Performance and concurrent request handling

## Testing Approach

### Hybrid Testing Strategy

The test suite uses two complementary approaches:

1. **Mocked Environment Tests** (`app.request()` with `mockEnv`)
   - Used for complex endpoints (manifest, packument, search, tokens,
     access, etc.)
   - Fast execution with comprehensive mocking
   - Reliable and deterministic results
   - Covers edge cases and error conditions

2. **Real Cloudflare Workers Tests** (`SELF.fetch()` with real
   bindings)
   - Used for simple endpoints (ping, whoami)
   - Real database and environment integration
   - End-to-end validation with actual Workers runtime
   - Configured via `@cloudflare/vitest-pool-workers`

### Mock Environment Structure

```typescript
const mockEnv = {
  DB: {
    // Minimal D1 interface with Drizzle ORM compatibility
    prepare: () => ({ bind: () => ({ get, all, run, raw }) }),
    batch: () => Promise.resolve([]),
    exec: () => Promise.resolve(),
  },
  BUCKET: { get, put, delete },
  KV: { get, put, delete },
  // Additional bindings as needed
}
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test files
pnpm test test/manifest.test.ts
pnpm test test/tokens.test.ts
pnpm test test/search.test.ts

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage

# Run linting
pnpm lint
```

## Test Results

Current test coverage includes **8 comprehensive test files** with
**300+ individual tests**:

- ✅ **manifest.test.ts** - 33 tests (Package manifests)
- ✅ **packaument.test.ts** - 40 tests (Package packuments)
- ✅ **ping.test.ts** - 5 tests (Health checks)
- ✅ **whoami.test.ts** - 10 tests (User identity)
- ✅ **search.test.ts** - 50+ tests (Package search)
- ✅ **tokens.test.ts** - 40+ tests (Token management)
- ✅ **access.test.ts** - 60+ tests (Access control)
- ✅ **dist-tags.test.ts** - 50+ tests (Distribution tags)
- ✅ **audit.test.ts** - 40+ tests (Security audits)
- ✅ **static.test.ts** - 60+ tests (Static assets)
- ✅ **dashboard.test.ts** - 40+ tests (Dashboard data)

## Key Features Tested

### NPM Registry Compatibility

- Full npm client compatibility for all utility endpoints
- Proper HTTP status codes and response formats
- Legacy API redirect support
- Semver validation and handling

### Multi-Registry Support

- Root/local registry functionality
- Upstream registry proxying (NPM, JSR, Custom)
- Registry-specific endpoint behavior
- Upstream configuration validation

### Security and Authentication

- Token-based authentication
- Package access control and permissions
- Collaborator management
- Security audit functionality
- Input validation and sanitization

### Performance and Reliability

- Response time validation
- Concurrent request handling
- Error handling and edge cases
- Cache control and optimization
- Resource limits and validation

## Configuration

Tests are configured in `vitest.config.ts` with:

- **Cloudflare Workers pool** for real environment testing
- **30-second timeout** for upstream requests
- **Real bindings setup** in `test/setup.ts`
- **Database schema creation** for isolated test environments
- **Environment variable configuration**

## Future Improvements

1. **Enhanced Integration Testing**
   - More real Cloudflare Workers tests as the framework matures
   - End-to-end workflow testing
   - Performance benchmarking

2. **Advanced Test Scenarios**
   - Load testing for high-traffic scenarios
   - Chaos engineering for resilience testing
   - Cross-registry interaction testing

3. **Test Automation**
   - Automated test generation for new endpoints
   - Contract testing for API compatibility
   - Visual regression testing for web interface
