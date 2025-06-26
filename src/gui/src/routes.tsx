import {
  Outlet,
  Navigate,
  createBrowserRouter,
  RouterProvider,
  useParams,
} from 'react-router'
import type { RouteObject } from 'react-router'

import Layout from '@/layout.tsx'

/** Root pages */
import { CreateNewProject } from '@/app/create-new-project.tsx'
import { Dashboard } from '@/app/dashboard.tsx'
import { ErrorFound } from '@/app/error-found.tsx'
import { Explorer } from '@/app/explorer.tsx'
import { Labels } from '@/app/labels.tsx'
import { Queries } from '@/app/queries.tsx'

/** Explorer Tabs */
import { OverviewTabContent } from '@/components/explorer-grid/selected-item/tabs-overview.tsx'
import { TabsManifestContent } from '@/components/explorer-grid/selected-item/tabs-manifest.tsx'
import { InsightTabContent } from '@/components/explorer-grid/selected-item/tabs-insight.tsx'
import { DependenciesTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/index.tsx'
import { VersionsTabContent } from '@/components/explorer-grid/selected-item/tabs-versions.tsx'

/** Dependencies SubTabs */
import { InsightsTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-insights.tsx'
import { LicensesTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-licenses.tsx'
import { DuplicatesTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx'
import { FundingTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-funding.tsx'

/** Help pages */
import { HelpSelectors } from '@/app/help/help-selectors.tsx'

/** Query Helpers */
import { DEFAULT_QUERY } from '@/state/index.ts'
import { encodeCompressedQuery } from '@/lib/compress-query.ts'
import type {
  Tab,
  SubTabDependencies,
} from './components/explorer-grid/selected-item/context'

const TabRouter = () => {
  const { tab } = useParams<{ tab: Tab }>()
  switch (tab) {
    case 'overview':
      return <OverviewTabContent />
    case 'manifest':
      return <TabsManifestContent />
    case 'versions':
      return <VersionsTabContent />
    case 'insights':
      return <InsightTabContent />
    case 'dependencies':
      return <DependenciesTabContent />
    default:
      return <Navigate to="overview" replace />
  }
}

const SubTabRouter = () => {
  const { subTab } = useParams<{ subTab: SubTabDependencies }>()
  switch (subTab) {
    case 'insights':
      return <InsightsTabContent />
    case 'licenses':
      return <LicensesTabContent />
    case 'duplicates':
      return <DuplicatesTabContent />
    case 'funding':
      return <FundingTabContent />
    default:
      return <Navigate to="insights" replace />
  }
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorFound />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'explore',
        element: (
          <Navigate
            to={`${encodeCompressedQuery(DEFAULT_QUERY)}/overview`}
            replace
          />
        ),
      },
      {
        path: 'explore/:query',
        element: <Explorer />,
        children: [
          {
            index: true,
            element: <Navigate to="overview" replace />,
          },
          {
            path: ':tab',
            element: <TabRouter />,
          },
          {
            path: 'dependencies',
            element: <DependenciesTabContent />,
            children: [
              {
                index: true,
                element: <Navigate to="insights" replace />,
              },
              {
                path: ':subTab',
                element: <SubTabRouter />,
              },
            ],
          },
        ],
      },
      {
        path: 'create-new-project',
        element: <CreateNewProject />,
      },
      {
        path: 'error',
        element: <ErrorFound />,
      },
      {
        path: 'labels',
        element: <Labels />,
      },
      {
        path: 'queries',
        element: <Queries />,
      },
      {
        path: 'help',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Navigate to="selectors" replace />,
          },
          {
            path: 'selectors',
            element: <HelpSelectors />,
          },
        ],
      },
    ],
  },
]

const router = createBrowserRouter(routes, { basename: '/' })

export const Router = () => {
  return <RouterProvider router={router} />
}
