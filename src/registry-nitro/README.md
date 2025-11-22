# @vltpkg/vsr-nitro

## Build Configuration

Building different configurations is controlled by setting env vars
and running `pnpm build`.

The build env vars are:

- `VSR_PLATFORM=node|vercel|cloudflare` (default is `node`)
- `VSR_DATABASE=sqlite|neon` (default is `sqlite`)
- `VSR_STORAGE=fs|s3|r2` (default is `fs`)

So to build for Vercel with Neon and S3, you would run:

```
VSR_PLATFORM=vercel VSR_DATABASE=neon VSR_STORAGE=s3 pnpm build
```

This will output the built artifacts to a local directory that can
then be deployed the platform. So to deploy to Vercel you would run:

```
vercel --prebuilt --prod
```

### Runtime Configuration

Other configuration is read from `process.env` at runtime. This is to
avoid secrets being written into the built artifacts and to allow
changing certain config without rebuilding.

If you are running locally with `pnpm dev` you can set these values in
a `.env` file in the root of the workspace.

#### Neon

- `NEON_DATABASE_URL=postgresql://...`

#### Sqlite

- `SQLITE_DATABASE_FILE=file:...`

#### S3

- `S3_BUCKER=<BUCKET_NAME>`
- `S3_ENDPOINT=https://...`
- `S3_REGION=<S3_REGION>`
- `S3_ACCESS_KEY_ID=`
- `S3_SECRET_ACCESS_KEY=`

## Database Schema Changes

Run `VSR_DATABASE=sqlite|neon pnpm db:push` while also having set the
runtime configuration environment variables for that database.
