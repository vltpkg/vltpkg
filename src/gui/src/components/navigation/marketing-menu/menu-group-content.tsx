import {
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx'
import { isGroup, isItem } from './types.ts'
import type { MenuGroup } from './types.ts'
import { ListItem } from './list-item.tsx'

interface MenuGroupContentProps {
  group: MenuGroup
}

export function MenuGroupContent({ group }: MenuGroupContentProps) {
  const hasNestedGroups = group.children.some(child => isGroup(child))

  if (hasNestedGroups) {
    // Two-column layout for groups with nested groups (like Company)
    return (
      <NavigationMenuContent className="bg-muted/50 dark:bg-background p-1 pb-1.5">
        <div className="test grid w-lg grid-cols-2 gap-2">
          <ul className="space-y-2 p-2">
            {group.children.map((child, childIndex) => {
              if (isItem(child)) {
                return (
                  <li key={childIndex}>
                    <NavigationMenuLink
                      className="flex-row items-start gap-3 gap-y-1.5"
                      href={child.path}
                      target={child.target}>
                      {child.icon && (
                        <div className="bg-background [&>svg]:text-foreground/80 flex size-9 items-center justify-center rounded-md border [&>svg]:size-8">
                          <child.icon />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-foreground/90 font-mono text-xs font-medium">
                          {child.subtitle}
                        </span>
                        <span className="font-medium">
                          {child.label}
                        </span>
                      </div>
                    </NavigationMenuLink>
                  </li>
                )
              }
              return null
            })}
          </ul>
          <ul className="bg-popover mr-0.5 space-y-2 rounded-md border p-2 shadow">
            {group.children.map((child, childIndex) => {
              if (isGroup(child)) {
                return (
                  <li key={childIndex}>
                    {child.children.map(
                      (nestedChild, nestedIndex) => {
                        if (isItem(nestedChild)) {
                          return (
                            <ListItem
                              key={nestedIndex}
                              {...nestedChild}
                            />
                          )
                        }
                        return null
                      },
                    )}
                  </li>
                )
              }
              return null
            })}
          </ul>
        </div>
      </NavigationMenuContent>
    )
  } else {
    // Flex-col layout for groups without nested groups (like Product)
    return (
      <NavigationMenuContent className="bg-muted/50 dark:bg-background p-1 pr-1.5 pb-1.5">
        <div className="flex flex-col">
          <ul className="bg-popover flex w-lg flex-col gap-1 rounded-md border p-2 shadow">
            {group.children.map((child, childIndex) => {
              if (isItem(child)) {
                return (
                  <li key={childIndex}>
                    <ListItem {...child} />
                  </li>
                )
              }
              return null
            })}
          </ul>
          {group.description && (
            <div className="p-2">
              <p className="text-muted-foreground text-sm">
                {group.description}
              </p>
            </div>
          )}
        </div>
      </NavigationMenuContent>
    )
  }
}
