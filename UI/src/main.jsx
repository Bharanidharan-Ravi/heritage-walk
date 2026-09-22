import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 1. Import this
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App.jsx'
import { queryClient } from './queryClient.js'
import { isTestMode, TEST_BASENAME } from './testMode.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Single app-wide QueryClient — see src/queryClient.js. */}
    <QueryClientProvider client={queryClient}>
      {/* 2. Wrap your App component with BrowserRouter */}
      {/* /test serves the whole site under a basename (see src/testMode.js) */}
      <BrowserRouter basename={isTestMode ? TEST_BASENAME : undefined}>
        <App />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
