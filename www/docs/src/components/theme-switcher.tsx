'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { DropdownMenu } from 'radix-ui'
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react'

const themes = [
  { value: 'system', label: 'System', Icon: MonitorIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
]

// the theme is only known on the client, so render the neutral icon until hydrated
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

export const ThemeSwitcher = () => {
  const { theme = 'system', setTheme } = useTheme()
  const mounted = useMounted()
  const current = themes.find(t => t.value === theme) ?? themes[0]
  const Icon = mounted ? current.Icon : MonitorIcon

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Theme: ${mounted ? current.label : 'System'}`}
        className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 data-[state=open]:bg-accent data-[state=open]:text-foreground grid size-8 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2">
        <Icon aria-hidden className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={8}
          className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-36 rounded-lg border p-1 shadow-lg">
          <DropdownMenu.RadioGroup
            value={theme}
            onValueChange={setTheme}>
            {themes.map(({ value, label, Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="data-highlighted:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none">
                <Icon
                  aria-hidden
                  className="text-muted-foreground size-4"
                />
                {label}
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <CheckIcon aria-hidden className="size-4" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
