#!/usr/bin/env node
let time = 0
process.on('exit', () => {
  console.log(`before exit ${Date.now() - time}ms`)
})
await import('../index.js')
  .then(r => r.default())
  .then(() => {
    console.log('really really done!')
    time = Date.now()
  })
