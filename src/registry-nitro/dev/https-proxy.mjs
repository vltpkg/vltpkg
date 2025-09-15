#!/usr/bin/env node

import httpProxy from 'http-proxy'
import https from 'node:https'
import fs from 'node:fs'
import { join } from 'node:path'

const PROXY_PORT = process.env.HTTPS_PORT || 3001
const TARGET_PORT = process.env.TARGET_PORT || 3000
const TARGET_HOST = process.env.TARGET_HOST || 'localhost'

const proxy = httpProxy.createProxyServer({
  target: `http://${TARGET_HOST}:${TARGET_PORT}`,
  changeOrigin: true,
})

proxy.on('error', (err, _req, res) => {
  console.error('Proxy error:', err.message)
  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        error: 'Bad Gateway',
        message: err.message,
      }),
    )
  }
})

const server = https.createServer(
  {
    key: fs.readFileSync(join(import.meta.dirname, 'key.pem')),
    cert: fs.readFileSync(join(import.meta.dirname, 'cert.pem')),
  },
  (req, res) => {
    proxy.web(req, res)
  },
)

server.listen(PROXY_PORT, () => {
  console.log(`🔒 HTTPS Proxy started successfully`)
  console.log(`   Listening on: https://localhost:${PROXY_PORT}`)
  console.log(`   Proxying to:  http://${TARGET_HOST}:${TARGET_PORT}`)
})

// process.on('SIGINT', () => {
//   console.log('\n🛑 Shutting down HTTPS proxy...')
//   server.close(() => {
//     proxy.close()
//     process.exit(0)
//   })
// })
