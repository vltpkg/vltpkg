import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DetailsInfo } from '@/lib/external-info.ts'
import type { NodeLike } from '@vltpkg/types'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec, getOptions } from '@vltpkg/spec/browser'

export const specOptions = getOptions({
  registries: {
    custom: 'https://example.com',
  },
})

export const SELECTED_ITEM = {
  title: 'item',
  name: 'item',
  version: '1.0.0',
  spec: Spec.parse('item', '^1.0.0', specOptions),
} as unknown as GridItemData

export const SELECTED_ITEM_CUSTOM_REGISTRY = {
  name: 'item',
  title: 'item',
  version: '1.0.0',
  type: 'dev',
  spec: Spec.parse('item', 'custom:item@^1.0.0', specOptions),
  to: {
    name: 'item',
    version: '1.0.0',
    id: joinDepIDTuple(['registry', 'custom', 'item@1.0.0']),
  } as NodeLike,
  from: {
    name: 'parent',
    version: '1.0.0',
  } as NodeLike,
} as unknown as GridItemData

export const SELECTED_ITEM_SCOPED_REGISTRY = {
  name: 'item',
  title: 'item',
  version: '1.0.0',
  type: 'dev',
  spec: Spec.parse('@myscope/item', '^1.0.0', {
    ...specOptions,
    'scope-registries': {
      '@myscope': 'http://custom-scope',
    },
  }),
  to: {
    name: '@myscope/item',
    version: '1.0.0',
    id: joinDepIDTuple(['registry', '', '@myscope/item@1.0.0']),
  } as NodeLike,
  from: {
    name: 'parent',
    version: '1.0.0',
  } as NodeLike,
} as unknown as GridItemData

export const SELECTED_ITEM_DEFAULT_GIT_HOST = {
  name: 'item',
  title: 'item',
  version: '1.0.0',
  type: 'dev',
  spec: Spec.parse('repo-item', 'github:a/b', specOptions),
  to: {
    name: 'repo-item',
    version: '1.0.0',
    id: joinDepIDTuple(['git', 'github:a/b', '']),
  } as NodeLike,
  from: {
    name: 'parent',
    version: '1.0.0',
  } as NodeLike,
} as unknown as GridItemData

export const SELECTED_ITEM_WITH_EDGES = {
  name: 'item',
  title: 'item',
  version: '1.0.0',
  spec: Spec.parse('item', '^1.0.0', specOptions),
  from: {
    name: 'parent',
    version: '1.0.0',
  } as NodeLike,
  to: {
    name: 'item',
    version: '1.0.0',
    id: joinDepIDTuple(['registry', '', 'item@1.0.0']),
    edgesIn: new Set([{}, {}]),
    edgesOut: new Map([['dep', {}]]),
  } as NodeLike,
} as unknown as GridItemData

export const SELECTED_ITEM_DETAILS: DetailsInfo = {
  favicon: {
    src: 'https://example.com/favicon.png',
    alt: 'Example Favicon',
  },
  downloadsPerVersion: { '1.0.0': 123456 },
  downloadsLastYear: {
    start: '2024-01-01',
    end: '2024-01-31',
    downloads: [
      { downloads: 100, day: '2024-01-01' },
      { downloads: 200, day: '2024-01-02' },
      { downloads: 300, day: '2024-01-03' },
    ],
  },
  greaterVersions: [
    {
      version: '1.0.0',
      publishedDate: '2025-04-15',
      unpackedSize: 123456,
      integrity: 'sha512-abc123',
      tarball: 'https://example.com/tarball.tgz',
      publishedAuthor: {
        name: 'John Doe',
        email: 'johndoe@acme.com',
        avatar: 'https://example.com/avatar.jpg',
      },
    },
    {
      version: '1.0.2',
      publishedDate: '2025-04-15',
      unpackedSize: 123456,
      integrity: 'sha512-abc123',
      tarball: 'https://example.com/tarball.tgz',
      publishedAuthor: {
        name: 'John Doe',
        email: 'johndoe@acme.com',
        avatar: 'https://example.com/avatar.jpg',
      },
    },
  ],
  publisher: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  publisherAvatar: {
    src: 'https://example.com/avatar.png',
    alt: 'John Doe',
  },
}

/**
 * Default loading state properties for tests.
 * Add these to mockState to satisfy SelectedItemStore type.
 */
export const MOCK_LOADING_STATE = {
  isLoadingDetails: false,
  isLoadingDependencies: false,
  dependenciesError: null,
}
