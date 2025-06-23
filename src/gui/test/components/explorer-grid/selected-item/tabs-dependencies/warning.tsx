import { test, describe, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Smile } from 'lucide-react'
import { Warning } from '@/components/explorer-grid/selected-item/tabs-dependencies/warning.tsx'
import type { SocketSecurityDetails } from '@/lib/constants/index.ts'

vi.mock('lucide-react', () => ({
  AlertTriangle: 'gui-alert-triangle-icon',
  Smile: 'gui-smile-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('Warning renders with different severity levels', () => {
  const severityLevels: SocketSecurityDetails['severity'][] = [
    'low',
    'medium',
    'high',
    'critical',
  ]

  test.each(severityLevels)(
    'Warning renders with severity: %s',
    severity => {
      const Container = () => {
        return <Warning severity={severity} warning="test warning" />
      }

      const { container } = render(<Container />)
      expect(container.innerHTML).toMatchSnapshot()
    },
  )
})

test('Warning renders with basic options', () => {
  const Container = () => {
    return <Warning warning="test warning" />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('Warning renders with custom className', () => {
  const Container = () => {
    return (
      <Warning className="test-classname" warning="test warning" />
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
  expect(container.querySelector('.test-classname')).not.toBeNull()
})

test('Warning renders with custom icon', () => {
  const Container = () => {
    return <Warning icon={Smile} warning="test warning" />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
  expect(
    container.querySelector('gui-alert-triangle-icon'),
  ).toBeNull()
  expect(container.querySelector('gui-smile-icon')).not.toBeNull()
})

test('Warning renders with a count', () => {
  const Container = () => {
    return <Warning count={1} warning="test warning" />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
