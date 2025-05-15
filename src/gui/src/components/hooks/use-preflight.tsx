import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useGraphStore } from '@/state/index.js'
import { startAppData } from '@/lib/start-data.js'

export const usePreflight = () => {
  const navigate = useNavigate()
  const updateAppData = useGraphStore(state => state.updateAppData)
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const stamp = useGraphStore(state => state.stamp)

  useEffect(() => {
    startAppData({
      updateAppData,
      updateErrorCause,
      navigate,
      stamp,
    })
  }, [stamp])
}
