import { vi, expect, afterEach, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SettingsView } from '@/app/settings/index.tsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

vi.mock('@/components/settings/setting.tsx', () => ({
  SettingWrapper: 'gui-setting-wrapper',
  SettingSplit: 'gui-setting-split',
  SettingSection: 'gui-setting-section',
  SettingField: 'gui-setting-field',
}))

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('SettingsView renders default', () => {
  const Container = () => {
    return <SettingsView />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
