import { useLocation } from 'react-router'

export const useViewSidebar = () => {
  const { pathname } = useLocation()

  const isOnHelpView = () => {
    return pathname.includes('/help')
  }

  const isOnExploreView = () => {
    return pathname.includes('/explore')
  }

  return {
    isOnHelpView,
    isOnExploreView,
  }
}
