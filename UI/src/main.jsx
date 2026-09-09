import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 1. Import this
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Wrap your App component with BrowserRouter */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)