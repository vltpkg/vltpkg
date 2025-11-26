import { NavLink } from 'react-router'
import { Vlt } from '@/components/icons/index.ts'
import { isHostedEnvironment } from '@/lib/environment.ts'
import { useAuth } from '@/components/hooks/use-auth.tsx'

export const SidebarLogo = () => {
  const isHostedMode = isHostedEnvironment()
  const { isSignedIn } = useAuth()

  const homeUrl = !isSignedIn && isHostedMode ? '/' : '/dashboard'

  return (
    <div className="relative mt-2 flex w-full min-w-0 p-2">
      <NavLink
        to={homeUrl}
        className="flex aspect-square h-8 w-fit items-center justify-center rounded-md p-2 [&_svg]:size-6 [&_svg]:shrink-0">
        <Vlt />
      </NavLink>
    </div>
  )
}
