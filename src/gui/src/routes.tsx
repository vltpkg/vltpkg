import { createBrowserRouter, RouterProvider } from 'react-router'
import type { RouteObject } from 'react-router'

import Layout from '@/layout.jsx'

import { CreateNewProject } from '@/app/create-new-project.jsx'
import { Dashboard } from '@/app/dashboard.jsx'
import { ErrorFound } from '@/app/error-found.jsx'
import { Explorer } from '@/app/explorer.jsx'
import { Labels } from '@/app/labels.jsx'
import { Queries } from '@/app/queries.jsx'

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
    ],
  },
]

const router = createBrowserRouter(routes)

export const Router = () => {
  return <RouterProvider router={router} />
}
