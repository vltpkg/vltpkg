import { useState } from 'react'
import {
  SettingWrapper,
  SettingSplit,
  SettingSection,
  SettingField,
} from '@/components/settings/setting.tsx'

export const SettingsView = () => {
  const [value, setValue] = useState<string>('')

  return (
    <SettingWrapper>
      <SettingSection title="General">
        <SettingField
          name="Input option"
          description="This is an input option"
          field={{
            placeholder: 'placeholder',
            type: 'input',
            value: value,
            onValueChange: setValue,
          }}
        />
        <SettingSplit />
        <SettingField
          name="Dropdown option"
          description="This is a dropdown option"
          field={{
            placeholder: 'Select an option',
            type: 'dropdown',
            options: [
              {
                label: 'Option 1',
                onSelect: () => console.log('Selected Option 1'),
                defaultValue: true,
              },
            ],
          }}
        />
        <SettingField
          name="Dropdown option"
          description="This is a dropdown option"
          field={{
            placeholder: 'Select an option',
            type: 'dropdown',
            options: [
              {
                label: 'Option 1',
                onSelect: () => console.log('Selected Option 1'),
              },
            ],
          }}
        />
        <SettingSplit />
        <SettingField
          name="Toggle option"
          description="This is a toggle option"
          field={{
            type: 'toggle',
            defaultValue: false,
            onActive: () => console.log('Toggle activated'),
            onInactive: () => console.log('Toggle deactivated'),
          }}
        />
      </SettingSection>
    </SettingWrapper>
  )
}
