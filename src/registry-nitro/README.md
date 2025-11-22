# @vltpkg/vsr-nitro

## Setup

Configuration is currently controlled by setting environment
variables.

To run it locall you can create a `.env` file in the root and run
`pnpm dev`.

For deployment, you should set these environment variables in your
deployment platform.

### Neon

- `VSR_DATABASE=neon`
- `NEON_DATABASE_URL=postgresql://...`

### S3

- `VSR_STORAGE=s3`
- `VSR_S3_BUCKER=<BUCKET_NAME>`
- `VSR_S3_ENDPOINT=https://...`
- `VSR_S3_REGION=<S3_REGION>`
- `VSR_S3_ACCESS_KEY_ID=`
- `VSR_S3_SECRET_ACCESS_KEY=`

### TTLs (optional)

- `VSR_PACKUMENT_TTL=5m`
- `VSR_MANIFEST_TTL=24h`
- `VSR_TARBALL_TTL=1yr`
