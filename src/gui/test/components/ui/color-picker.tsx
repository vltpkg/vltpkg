import React from 'react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { ColorPicker } from '@/components/ui/color-picker.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('color-picker', () => {
  it('should render correctly', () => {
    const setStateMock = vi.fn()
    vi.spyOn(React, 'useState').mockReturnValue(['', setStateMock])

    const Container = () => {
      return <ColorPicker onChange={setStateMock} />
    }

    const { container } = render(<Container />)

    expect(container.innerHTML).toMatchSnapshot()
  })
})
