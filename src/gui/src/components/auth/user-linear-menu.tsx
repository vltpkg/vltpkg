import { Fragment } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/components/hooks/use-auth.tsx'
import {
  Tooltip,
  TooltipPortal,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.tsx'
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu.tsx'
import { Button } from '@/components/ui/button.tsx'
import { menuItems } from './menu.tsx'

import type { ComponentProps } from 'react'
import type {
  MenuItem as MenuItemData,
  MenuGroup as MenuGroupData,
} from './menu'

export const UserLinearMenu = () => {
  const { isSignedIn, user, signIn, signOut } = useAuth()

  const handleMenuAction = async (action?: string) => {
    switch (action) {
      case 'login':
        signIn()
        break
      case 'logout':
        await signOut()
        break
      case 'profile':
        window.open(
          'https://accounts.vlt.io/user',
          '_blank',
          'noopener,noreferrer',
        )
        break
    }
  }

  const userInitials =
    user ?
      `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() ||
      user.username?.[0]?.toUpperCase() ||
      'U'
    : 'U'

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={signIn}
                className="rounded-xl border px-3 py-1 hover:border-neutral-300 hover:bg-neutral-200 hover:dark:border-neutral-800 hover:dark:bg-neutral-900"
                variant="outline">
                <span>Log In</span>
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Sign in to your account</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={signIn}
                className="rounded-xl px-3 py-1"
                variant="default">
                <span>Sign Up</span>
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Sign up for an account</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="group/login size-10 items-center justify-center rounded-xl border-none bg-transparent p-0"
                variant="outline">
                {user?.imageUrl ?
                  <div className="flex size-10 items-center justify-center">
                    <img
                      src={user.imageUrl}
                      alt={userInitials}
                      className="size-10 rounded-xl border border-muted grayscale transition-colors duration-100 group-hover/login:grayscale-0"
                    />
                  </div>
                : <div className="flex aspect-square size-10 items-center justify-center rounded-xl border border-muted bg-white dark:bg-black">
                    <span className="text-sm font-medium uppercase">
                      {userInitials}
                    </span>
                  </div>
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[200px] rounded-xl"
              onCloseAutoFocus={e => e.preventDefault()}>
              <div className="flex cursor-default items-center gap-3 px-2 py-2">
                {user?.imageUrl ?
                  <img
                    src={user.imageUrl}
                    alt={userInitials}
                    className="aspect-square size-8 rounded-lg border border-muted object-cover grayscale"
                  />
                : <div className="flex aspect-square size-8 items-center justify-center rounded-lg border border-muted bg-white dark:bg-black">
                    <span className="text-base font-medium uppercase">
                      {userInitials}
                    </span>
                  </div>
                }
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              {menuItems.map((group, idx) => (
                <Fragment key={`auth-linear-menu-group-${idx}`}>
                  <MenuGroup
                    group={group}
                    onAction={handleMenuAction}
                  />
                  {idx !== menuItems.length - 1 && (
                    <DropdownMenuSeparator />
                  )}
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>
            {user?.fullName || 'User menu'}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}

interface MenuGroupProps
  extends ComponentProps<typeof DropdownMenuGroup> {
  group: MenuGroupData
  onAction: (action?: string) => void
}

const MenuGroup = ({ group, onAction }: MenuGroupProps) => {
  return (
    <DropdownMenuGroup>
      {group.label && (
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {group.label}
        </DropdownMenuLabel>
      )}
      {group.children.map((item, idx) => (
        <MenuItem
          key={`auth-linear-menu-item-${idx}`}
          item={item}
          onAction={onAction}
        />
      ))}
    </DropdownMenuGroup>
  )
}

interface MenuItemProps
  extends ComponentProps<typeof DropdownMenuItem> {
  item: MenuItemData
  onAction: (action?: string) => void
}

const MenuItem = ({ item, onAction }: MenuItemProps) => {
  const navigate = useNavigate()

  const handleClick = async () => {
    if (item.action) {
      onAction(item.action)
    } else if (item.to) {
      // Check if it's an external link
      if (item.to.startsWith('http')) {
        window.open(item.to, '_blank', 'noopener,noreferrer')
      } else {
        void navigate(item.to)
      }
    }
  }

  return (
    <DropdownMenuItem
      className="rounded-lg font-normal text-muted-foreground hover:text-foreground"
      onClick={handleClick}>
      <span className="text-sm font-medium text-foreground">
        {item.label}
      </span>
      {item.icon && (
        <div className="ml-auto flex size-5 items-center justify-center [&_svg]:size-4">
          <item.icon className="transition-colors duration-100" />
        </div>
      )}
    </DropdownMenuItem>
  )
}
