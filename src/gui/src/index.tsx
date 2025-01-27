import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/components/ui/theme-provider.jsx'
import Layout from './layout.jsx'

const App = () => <Layout />

const rootElement = document.getElementById('app')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}

if (process.env.NODE_ENV === 'development') {
  const sse = new EventSource('/esbuild')
  sse.addEventListener('change', () => location.reload())
  sse.addEventListener('error', () => {
    console.log(
      'Live reload is not enabled. Start the GUI dev server to enable it.',
    )
    sse.close()
  })
}
