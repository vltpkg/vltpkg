import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import {
  AsideHeader,
  AsideSection,
  AsideItem,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { Link, Smile } from 'lucide-react'

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock('@/components/ui/link.tsx', () => ({
  Link: 'gui-link',
}))

vi.mock('lucide-react', () => ({
  Smile: 'gui-smile-icon',
  Link: 'gui-link-icon',
  Copy: 'gui-copy-icon',
  Check: 'gui-check-icon',
}))

vi.mock('@/components/ui/cross.tsx', () => ({
  Cross: 'gui-cross',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('AsideHeader renders with text', () => {
  const mockContent = 'Test Header'

  const Container = () => {
    return <AsideHeader>{mockContent}</AsideHeader>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
  expect(container.innerHTML).toContain(mockContent)
})

test('AsideSection renders with children', () => {
  const mockContent = 'Test Section Content'

  const Container = () => {
    return <AsideSection>{mockContent}</AsideSection>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
  expect(container.innerHTML).toContain(mockContent)
})

test('AsideItem renders with an icon', () => {
  const mockText = 'Test Item'

  const Container = () => {
    return <AsideItem icon={Smile}>{mockText}</AsideItem>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
  expect(container.innerHTML).toContain(mockText)
  expect(container.innerHTML).toContain('gui-smile-icon')
})

test('AsideItem renders with a link', () => {
  const mockHref = 'https://www.acme.com'

  const Container = () => {
    return (
      <AsideItem icon={Link} href={mockHref}>
        {mockHref}
      </AsideItem>
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
  expect(container.innerHTML).toContain('gui-link-icon')
  expect(container.innerHTML).toContain('gui-link')
  expect(container.innerHTML).toContain(mockHref)
})

test('AsideItem renders with a count badge', () => {
  const mockCount = 5
  const mockText = 'Test Count Item'

  const Container = () => {
    return <AsideItem count={mockCount}>{mockText}</AsideItem>
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
  expect(container.innerHTML).toContain(mockText)
  expect(container.innerHTML).toContain(mockCount.toString())
  expect(container.innerHTML).toContain('gui-data-badge')
})

test('AsideItem renders with a copy to clipboard feature', () => {
  const mockCopyText = 'Copy this text'

  const Container = () => {
    return (
      <AsideItem copyToClipboard={{ copyValue: mockCopyText }}>
        {mockCopyText}
      </AsideItem>
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
