import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './i18n'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* BrowserRouter keeps route state client-side for SPA behavior. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
