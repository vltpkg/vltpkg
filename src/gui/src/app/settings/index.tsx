import { useTheme } from '@/components/ui/theme-provider.tsx'
import {
  SettingWrapper,
  SettingSection,
  SettingField,
} from '@/components/settings/setting.tsx'
import { Sun, Moon, LaptopMinimal } from 'lucide-react'

const themeIconClassNames =
  '[&>svg]:stroke-neutral-500 [&>svg]:transition-all [&>svg]:duration-250 [&>svg]:fill-neutral-500'

export const SettingsView = () => {
  const { theme, setTheme } = useTheme()

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
      </SettingSection>
    </SettingWrapper>
  )
}
