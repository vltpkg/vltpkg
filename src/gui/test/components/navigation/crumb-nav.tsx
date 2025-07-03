import { vi, test, expect, afterEach, describe } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import {
  getBreadcrumbs,
  CrumbNav,
} from '@/components/navigation/crumb-nav.tsx'

vi.mock('@/components/query-bar/query-token.tsx', () => ({
  QueryToken: 'gui-query-token',
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
  Ellipsis: 'gui-ellipsis-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

describe('CrumbNav component', () => {
  test('does not render without breadcrumbs', () => {
    const Container = () => {
      return <CrumbNav breadcrumbs={undefined} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toBe('')
  })

  test('renders single breadcrumb item', () => {
    const breadcrumbs = getBreadcrumbs('#express')

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('renders multiple breadcrumb items with separators', () => {
    const breadcrumbs = getBreadcrumbs(':root > #express > #lodash')

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('renders breadcrumb with semver selector', () => {
    const breadcrumbs = getBreadcrumbs('#express:semver(^4.0.0)')

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('renders complex breadcrumb path', () => {
    const breadcrumbs = getBreadcrumbs(
      ':project > #express:v(4) > #lodash > #underscore',
    )

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('renders workspace breadcrumb', () => {
    const breadcrumbs = getBreadcrumbs(':workspace > #utils')

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('renders with custom className', () => {
    const breadcrumbs = getBreadcrumbs('#express > #lodash')

    const Container = () => {
      return (
        <CrumbNav
          breadcrumbs={breadcrumbs}
          className="custom-nav-class"
        />
      )
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('renders truncated breadcrumbs when more than 5 items', () => {
    // Create a long breadcrumb path with 10 items
    const longQuery =
      ':root > #a > #b > #c > #d > #e > #f > #g > #h > #i'
    const breadcrumbs = getBreadcrumbs(longQuery)

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('shows ellipsis button in truncated view', () => {
    const longQuery =
      ':root > #a > #b > #c > #d > #e > #f > #g > #h > #i'
    const breadcrumbs = getBreadcrumbs(longQuery)

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container, getByLabelText } = render(<Container />)

    // Should show ellipsis button
    const ellipsisButton = getByLabelText('Show hidden breadcrumbs')
    expect(ellipsisButton).toBeDefined()
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('expands breadcrumbs when ellipsis button is clicked', () => {
    const longQuery =
      ':root > #a > #b > #c > #d > #e > #f > #g > #h > #i'
    const breadcrumbs = getBreadcrumbs(longQuery)

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container, getByLabelText } = render(<Container />)

    // Click ellipsis button to expand
    const ellipsisButton = getByLabelText('Show hidden breadcrumbs')
    fireEvent.click(ellipsisButton)

    expect(container.innerHTML).toMatchSnapshot()
  })

  test('does not truncate when 5 or fewer breadcrumbs', () => {
    // Create exactly 5 breadcrumbs
    const mediumQuery = ':root > #a > #b > #c > #d'
    const breadcrumbs = getBreadcrumbs(mediumQuery)

    const Container = () => {
      return <CrumbNav breadcrumbs={breadcrumbs} />
    }

    const { container, queryByLabelText } = render(<Container />)

    // Should not show ellipsis button
    const ellipsisButton = queryByLabelText('Show hidden breadcrumbs')
    expect(ellipsisButton).toBeNull()
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('handles undefined breadcrumbs gracefully', () => {
    const Container = () => {
      return <CrumbNav breadcrumbs={undefined} />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toBe('')
  })
})

describe('getBreadcrumbs function', () => {
  test('returns undefined for root query', () => {
    const breadcrumbs = getBreadcrumbs(':root')
    expect(breadcrumbs).toBeUndefined()
  })

  test('returns breadcrumb for simple id selector', () => {
    const breadcrumbs = getBreadcrumbs('#express')
    expect(breadcrumbs).toBeDefined()
    expect(breadcrumbs?.single).toBe(true)
    expect(breadcrumbs?.first.value).toBe('#express')
    expect(breadcrumbs?.first.type).toBe('id')
  })

  test('returns breadcrumb for complex query', () => {
    const breadcrumbs = getBreadcrumbs(':root > #express > #lodash')
    expect(breadcrumbs).toBeDefined()
    expect(breadcrumbs?.single).toBe(false)
    expect(breadcrumbs?.first.value).toBe(':root')
    expect(breadcrumbs?.last.value).toBe('#lodash')
  })

  test('returns breadcrumb for semver query', () => {
    const breadcrumbs = getBreadcrumbs('#express:semver(^4.0.0)')
    expect(breadcrumbs).toBeDefined()
    expect(breadcrumbs?.single).toBe(true)
    expect(breadcrumbs?.first.value).toBe('#express:semver(^4.0.0)')
    expect(breadcrumbs?.first.type).toBe('id')
  })

  test('returns undefined for invalid query', () => {
    const breadcrumbs = getBreadcrumbs('[invalid-selector]')
    expect(breadcrumbs).toBeUndefined()
  })

  test('returns breadcrumb for workspace selector', () => {
    const breadcrumbs = getBreadcrumbs(':workspace')
    expect(breadcrumbs).toBeDefined()
    expect(breadcrumbs?.single).toBe(true)
    expect(breadcrumbs?.first.value).toBe(':workspace')
    expect(breadcrumbs?.first.type).toBe('pseudo')
    expect(breadcrumbs?.first.importer).toBe(true)
  })

  test('returns breadcrumb for project selector', () => {
    const breadcrumbs = getBreadcrumbs(':project')
    expect(breadcrumbs).toBeDefined()
    expect(breadcrumbs?.single).toBe(true)
    expect(breadcrumbs?.first.value).toBe(':project')
    expect(breadcrumbs?.first.type).toBe('pseudo')
    expect(breadcrumbs?.first.importer).toBe(true)
  })

  test('returns breadcrumb for long query', () => {
    const longQuery =
      ':root > #a > #b > #c > #d > #e > #f > #g > #h > #i'
    const breadcrumbs = getBreadcrumbs(longQuery)
    expect(breadcrumbs).toBeDefined()
    expect(breadcrumbs?.single).toBe(false)

    // Count breadcrumbs
    const count = breadcrumbs ? [...breadcrumbs].length : 0
    expect(count).toBe(10)
  })
})
