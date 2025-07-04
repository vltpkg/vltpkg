import { useMemo } from 'react'
import { useLocation } from 'react-router'

export const HelpHeader = () => {
  const { pathname } = useLocation()

  const pageTitle = useMemo(() => {
    return pathname.split('/').pop() || 'Help'
  }, [pathname])

  return (
    <div className="flex items-center">
      <h4 className="text-md font-medium capitalize">{pageTitle}</h4>
    </div>
  )
}
