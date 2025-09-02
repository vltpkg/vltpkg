import { useState } from 'react'
import { useTheme } from '@/components/ui/theme-provider.tsx'
import {
  SettingWrapper,
  SettingSection,
  SettingField,
} from '@/components/settings/setting.tsx'
import { X, Sun, Moon, LaptopMinimal } from 'lucide-react'
import { InlineCode } from '@/components/ui/inline-code.tsx'
import { Button } from '@/components/ui/button.tsx'
import { removeDashboardRoot, setToConfig } from '@/lib/vlt-config.ts'
import { useGraphStore } from '@/state/index.ts'
import { useDashboardRootCheck } from '@/components/hooks/use-dashboard-root-check.tsx'
import { useToast } from '@/components/hooks/use-toast.ts'

const themeIconClassNames =
  '[&>svg]:stroke-neutral-500 [&>svg]:transition-all [&>svg]:duration-250 [&>svg]:fill-neutral-500'

const handleDashboardRootRemove = async (
  path: string,
  updateStamp: () => void,
  rerender: () => void,
  toast: ReturnType<typeof useToast>['toast'],
) => {
  toast({
    title: `Removing ${path} ...`,
  })
  await removeDashboardRoot(path)
  // reload dashboard.json
  updateStamp()
  // force rerender to show the new root
  rerender()
  toast({
    title: `Removed ${path}`,
  })
}

export const SettingsView = () => {
  const { theme, setTheme } = useTheme()
  const updateStamp = useGraphStore(state => state.updateStamp)
  const { dashboardRoots } = useDashboardRootCheck()
  const [_, setForceRerender] = useState<number>(0)
  const { toast } = useToast()

  const rerender = () => setForceRerender(v => v + 1)

  return (
    <SettingWrapper>
      <SettingSection title="General">
        <SettingField
          name="Theme"
          description="The current theme of the vlt gui"
          field={{
            type: 'dropdown',
            className:
              '[&>.default-icon]:stroke-neutral-500 [&>.default-icon]:transition-all [&>.default-icon]:duration-250 [&>.default-icon]:fill-neutral-500',
            optionClassName: themeIconClassNames,
            placeholder: 'Select theme',
            options: [
              {
                label: 'Light',
                icon: Sun,
                onSelect: () => setTheme('light'),
                defaultValue: theme === 'light',
              },
              {
                label: 'Dark',
                icon: Moon,
                onSelect: () => setTheme('dark'),
                defaultValue: theme === 'dark',
              },
              {
                label: 'System',
                icon: LaptopMinimal,
                onSelect: () => setTheme('system'),
                defaultValue: theme === 'system',
              },
            ],
          }}
        />
        <SettingField
          name="Dashboard root"
          description="The root directory for the dashboard"
          content={
            dashboardRoots && dashboardRoots.length > 0 ?
              <div className="mt-2 flex w-full flex-wrap gap-2">
                {dashboardRoots.map((root, idx) => (
                  <InlineCode
                    key={`${root}-${idx}`}
                    className="mx-0 inline-flex items-center gap-1.5">
                    {root}
                    <Button
                      size="icon"
                      className="mb-0.5 size-4 rounded-sm bg-neutral-100 text-muted-foreground hover:bg-neutral-200 hover:text-foreground dark:bg-neutral-800 dark:text-muted-foreground dark:hover:bg-neutral-700 dark:hover:text-foreground [&_svg]:size-3"
                      onClick={() =>
                        handleDashboardRootRemove(
                          root,
                          updateStamp,
                          rerender,
                          toast,
                        )
                      }>
                      <X />
                    </Button>
                  </InlineCode>
                ))}
              </div>
            : undefined
          }
          field={{
            type: 'directory',
            onSelect: item => {
              if (!item || item.type !== 'directory') return
              void (async () => {
                await setToConfig({
                  which: 'user',
                  pairs: [
                    {
                      key: 'dashboard-root',
                      value: JSON.stringify([item.path]),
                    },
                  ],
                })
                // force rerender to show the new root
                rerender()
                // reload dashboard.json
                updateStamp()
              })()
            },
          }}
        />
      </SettingSection>
    </SettingWrapper>
  )
}
