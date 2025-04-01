import {
  Outlet,
  Navigate,
  createBrowserRouter,
  RouterProvider,
} from 'react-router'
import type { RouteObject } from 'react-router'

import Layout from '@/layout.jsx'

/** Root pages */
import { CreateNewProject } from '@/app/create-new-project.jsx'
import { Dashboard } from '@/app/dashboard.jsx'
import { ErrorFound } from '@/app/error-found.jsx'
import { Explorer } from '@/app/explorer.jsx'
import { Labels } from '@/app/labels.jsx'
import { Queries } from '@/app/queries.jsx'

/** Help pages */
import { HelpSelectors } from '@/app/help/help-selectors.jsx'

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
        path: 'create-new-project',
        element: <CreateNewProject />,
      },
      {
        path: 'error',
        element: <ErrorFound />,
      },
      {
        path: 'explore',
        element: <Explorer />,
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
