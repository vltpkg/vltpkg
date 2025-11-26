import { useRuntimeConfig } from 'nitro/runtime-config'
import { definePlugin } from 'nitro'

export default definePlugin(() => {
  const config = useRuntimeConfig()

  console.log('[db]', config.database)
})
