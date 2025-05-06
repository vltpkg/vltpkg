import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Toggle } from '@/components/ui/toggle.tsx'
import type { Option } from '@/components/ui/toggle.tsx'
import { Smile, Frown } from 'lucide-react'

vi.mock('lucide-react', () => ({
  Smile: 'gui-smile-icon',
  Frown: 'gui-frown-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('toggle', () => {
  it('should render correctly', () => {
    const options: [Option, Option] = [
      {
        icon: props => <Smile {...props} />,
        toolTipContent: 'mock-option-smile',
        key: 'smile',
        callBack: () => {},
      },
      {
        icon: props => <Frown {...props} />,
        toolTipContent: 'mock-option-frown',
        key: 'frown',
        callBack: () => {},
      },
    ]

    const Container = () => {
      return <Toggle options={options} />
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
