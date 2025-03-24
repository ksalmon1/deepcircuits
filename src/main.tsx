
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import './styles/tailwind.css'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'

// Import Wokwi elements once at the application root
// This ensures the custom elements are only registered once
import '@wokwi/elements'
console.log('Wokwi elements imported in main.tsx')

// Create a client for React Query
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
        <SonnerToaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
