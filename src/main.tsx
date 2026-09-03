import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Amplify } from 'aws-amplify'
import '@aws-amplify/ui-react/styles.css'
import { App } from './app/App'
import { ThemeProvider } from './app/ThemeContext'
import { GlobalStyles } from './design-system/GlobalStyles'
import { ToastProvider } from './design-system/Toast/Toast'
import { queryClient } from './lib/queryClient'
import outputs from '../amplify_outputs.json'
import './i18n'

Amplify.configure(outputs)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <GlobalStyles />
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
