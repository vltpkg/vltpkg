import assert from 'node:assert'
import { readdirSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { request } from 'node:http'
import { relative, resolve } from 'node:path'
import handler from 'serve-handler'

export type HandleStaticOptions = {
  publicDir: string
  assetsDir: string
}

const errHandler = (err: unknown, res: ServerResponse) => {
  // eslint-disable-next-line no-console
  console.error(err)
  res.statusCode = 500
  res.end('Internal server error')
}

export const handleStatic = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: HandleStaticOptions,
): Promise<void> => {
  const { publicDir, assetsDir } = options
  const opts = {
    cleanUrls: true,
    public: publicDir,
    rewrites: [{ source: '**', destination: '/index.html' }],
  }

  const handle = () =>
    handler(req, res, opts).catch((err: unknown) =>
      errHandler(err, res),
    )

  // It's important for this guard to check to not be destructured
  // because `infra/build` will replace the whole thing with `false`
  // causing it to be stripped entirely from production builds.
  if (!process.env.__VLT_INTERNAL_LIVE_RELOAD) {
    return handle()
  }

  // TODO: memoize this and only read it once, for stability if the folder
  // gets ruined or whatever

  // Generate a set of routes that should be proxied to the esbuild server
  const proxyRoutes = new Set(
    [
      // `/esbuild` is an SSE endpoint served by esbuild
      'esbuild',
      // Also proxy anything that currently exists in the assets dir
      ...readdirSync(assetsDir, {
        withFileTypes: true,
        recursive: true,
      })
        .filter(f => f.isFile())
        .map(f => relative(assetsDir, resolve(f.parentPath, f.name))),
    ].map(p => `/${p}`),
  )

  if (!req.url || !proxyRoutes.has(req.url)) {
    return handle()
  }

  // proxying
  req.pipe(
    request(
      {
        hostname: 'localhost',
        port: 7018,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      proxy => {
        assert(proxy.statusCode, 'proxy status code is required')
        res.writeHead(proxy.statusCode, proxy.headers)
        proxy.pipe(res, { end: true })
      },
    ).on('error', (err: unknown) => {
      // If we get an ECONNREFUSED error, fallback to the static handler
      // since the esbuild server is not running
      if (
        !!err &&
        (err as NodeJS.ErrnoException).code === 'ECONNREFUSED'
      ) {
        // In this case the /esbuild route is expected to fail so the
        // EventSource in the browser will be closed
        if (req.url === '/esbuild') {
          res.statusCode = 404
          return res.end()
        }
        return handle()
      }
      errHandler(err, res)
    }),
    { end: true },
  )
}
