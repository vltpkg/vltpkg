import {
  Outlet,
  Navigate,
  createBrowserRouter,
  RouterProvider,
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

/** Help pages */
import { HelpSelectors } from '@/app/help/help-selectors.tsx'

/** Query Helpers */
import { DEFAULT_QUERY } from '@/state/index.ts'
import { encodeCompressedQuery } from '@/lib/compress-query.ts'

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
        path: 'explore/:query/:tab?/:subTab?',
        element: <Explorer />,
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
