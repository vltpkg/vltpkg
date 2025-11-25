import {
  test,
  expect,
  vi,
  afterEach,
  describe,
  beforeEach,
} from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SearchResults } from '@/app/search/search-results.tsx'

const mockNavigate = vi.fn()
const mockSetSearchParams = vi.fn()
let mockUseSearchParams: ReturnType<typeof vi.fn>

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>(
      'react-router',
    )
  return {
    ...actual,
    useSearchParams: () => mockUseSearchParams(),
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/components/search/search-results/results.tsx', () => ({
  SearchResults: 'gui-search-results',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  mockUseSearchParams = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SearchResults', () => {
  test('renders empty state when no query parameter is present', () => {
    const mockSearchParams = new URLSearchParams()

    mockUseSearchParams.mockReturnValue([
      mockSearchParams,
      mockSetSearchParams,
    ])

    const { container } = render(<SearchResults />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('renders SearchResultsView when query parameter is present', () => {
    const mockSearchParams = new URLSearchParams({
      q: 'react',
      page: '1',
      pageSize: '25',
      sort: 'relevance',
      dir: 'desc',
    })

    mockUseSearchParams.mockReturnValue([
      mockSearchParams,
      mockSetSearchParams,
    ])

    const { container } = render(<SearchResults />)

    // Should not navigate away
    expect(mockNavigate).not.toHaveBeenCalled()

    // Should render the SearchResultsView
    expect(container.innerHTML).toMatchSnapshot()
  })

  test('sets default parameters when query is present but params are missing', () => {
    const mockSearchParams = new URLSearchParams({
      q: 'react',
    })

    mockUseSearchParams.mockReturnValue([
      mockSearchParams,
      mockSetSearchParams,
    ])

    render(<SearchResults />)

    // Should set default parameters
    expect(mockSetSearchParams).toHaveBeenCalled()
    const setParamsCall = mockSetSearchParams.mock
      .calls[0]?.[0] as URLSearchParams
    expect(setParamsCall.get('page')).toBe('1')
    expect(setParamsCall.get('pageSize')).toBe('25')
    expect(setParamsCall.get('sort')).toBe('relevance')
    expect(setParamsCall.get('dir')).toBe('desc')
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true },
    )
  })
})
