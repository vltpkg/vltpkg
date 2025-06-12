import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useGraphStore } from '@/state/index.ts'
import { startAppData } from '@/lib/start-data.ts'

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
  }, [stamp, updateAppData, updateErrorCause, navigate])
}
