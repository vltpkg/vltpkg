// import { defineMiddleware } from 'nitro/h3'
// import { useRuntimeConfig } from 'nitro/runtime-config'
// import neon from '../db/neon.ts'
// import sqlite from '../db/sqlite.ts'

// export default defineMiddleware(event => {
//   console.log('MIDDLEWARE')
//   const config = useRuntimeConfig()

//   if (config.db === 'neon') {
//     event.context.db = neon(config.NEON_DATABASE_URL)
//   } else if (config.db === 'sqlite') {
//     event.context.db = sqlite(config.SQLITE_DATABASE_FILE_NAME)
//   } else {
//     throw new Error(`Invalid database type: ${config.db}`)
//   }

//   // console.log(event.context.db)
//   console.log('HASDB--------------------')
// })
