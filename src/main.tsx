import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from "react-router-dom"
import App from './App.tsx'
import './index.css'
import './styles/tailwind.css'
import './styles/component-preview.css'
import './components/CircuitEditor/CircuitCanvas/circuit-canvas.css'
import { CircuitEditorProvider } from "./context/CircuitEditorContext"
import { Toaster } from "./components/ui/sonner"
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from './components/ErrorFallback'
// import './styles/circuit-canvas.css' // Removed as the file was deleted

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
