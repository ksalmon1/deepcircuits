
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/tailwind.css'
import './styles/component-preview.css'  // Add the new component preview styles

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
