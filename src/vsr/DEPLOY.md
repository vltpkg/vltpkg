# VSR Deploy Command

The VSR CLI now includes a `deploy` subcommand that allows you to
deploy your VSR instance to Cloudflare Workers using configuration
from your `vlt.json` file.

## Usage

```bash
# Deploy to default environment (dev)
vsr deploy

# Deploy to specific environment
vsr deploy --env=prod

# Preview deployment without actually deploying
vsr deploy --dry-run

# Override specific resource names
vsr deploy --env=staging --db-name=my-custom-db --bucket-name=my-custom-bucket
```

## Configuration

Add a `deploy` section to your `vlt.json` file under the `registry`
key:

```json
{
  "registry": {
    "deploy": {
      "sentry": {
        "dsn": "https://your-default-sentry-dsn@sentry.io/project-id",
        "sampleRate": 1.0,
        "tracesSampleRate": 0.1
      },
      "environments": {
        "dev": {
          "databaseName": "vsr-dev-database",
          "bucketName": "vsr-dev-bucket",
          "queueName": "vsr-dev-cache-refresh-queue",
          "sentry": {
            "environment": "development"
          },
          "vars": {
            "CUSTOM_VAR": "dev-value"
          }
        },
        "prod": {
          "databaseName": "vsr-prod-database",
          "bucketName": "vsr-prod-bucket",
          "queueName": "vsr-prod-cache-refresh-queue",
          "sentry": {
            "environment": "production",
            "dsn": "https://your-prod-sentry-dsn@sentry.io/project-id",
            "sampleRate": 0.1,
            "tracesSampleRate": 0.01
          },
          "vars": {
            "API_BASE_URL": "https://api.example.com"
          }
        }
      }
    }
  }
}
```

## Configuration Options

### Global Deploy Settings

- `sentry.dsn`: Default Sentry DSN for error reporting
- `sentry.sampleRate`: Default error sample rate (0.0 to 1.0)
- `sentry.tracesSampleRate`: Default performance traces sample rate
  (0.0 to 1.0)

### Environment-Specific Settings

Each environment can override any global setting and specify:

- `databaseName`: D1 database name for this environment
- `bucketName`: R2 bucket name for this environment
- `queueName`: Queue name for cache refresh operations
- `sentry`: Environment-specific Sentry configuration
- `vars`: Custom environment variables to pass to the Worker

### CLI Options

- `--env=<string>`: Environment to deploy to (defaults to "dev")
- `--db-name=<string>`: Override D1 database name
- `--bucket-name=<string>`: Override R2 bucket name
- `--queue-name=<string>`: Override queue name
- `--dry-run`: Show what would be deployed without actually deploying

## Precedence

Configuration values are resolved in the following order (highest
precedence first):

1. CLI arguments (`--db-name`, `--bucket-name`, etc.)
2. Environment-specific config (`environments.prod.databaseName`)
3. Default values

## Examples

### Basic Deployment

```bash
# Deploy to development environment
vsr deploy --env=dev

# Deploy to production
vsr deploy --env=prod
```

### Custom Resource Names

```bash
# Override database and bucket names
vsr deploy --env=staging --db-name=my-staging-db --bucket-name=my-staging-bucket
```

### Preview Deployment

```bash
# See what would be deployed without actually deploying
vsr deploy --env=prod --dry-run
```

### Using Custom Config File

```bash
# Use a specific vlt.json file
vsr deploy --config=/path/to/custom-vlt.json --env=prod
```

## Generated Wrangler Command

The deploy command generates a `wrangler deploy` command with the
appropriate bindings and variables. For example:

```bash
wrangler deploy dist/index.js \
  --name vsr-prod \
  --compatibility-date 2024-09-23 \
  --var SENTRY_DSN:https://your-sentry-dsn@sentry.io/project-id \
  --var SENTRY_ENVIRONMENT:production \
  --var ARG_TELEMETRY:true \
  --d1 DB=vsr-prod-database \
  --r2 BUCKET=vsr-prod-bucket \
  --queue-producer CACHE_REFRESH_QUEUE=vsr-prod-cache-refresh-queue \
  --queue-consumer vsr-prod-cache-refresh-queue
```

## Prerequisites

- Wrangler CLI must be installed and authenticated
- Cloudflare Workers account with appropriate permissions
- D1 databases, R2 buckets, and queues must exist (or be created by
  Wrangler)
