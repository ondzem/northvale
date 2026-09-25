import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureVisitSource, initContactClickTracking } from './services/leadTracking'

// Musí proběhnout před vykreslením — aplikace pak přepisuje adresu a utm parametry by zmizely.
captureVisitSource()
initContactClickTracking()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
