import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BRAND } from './config/branding'
import { migrateLegacyHashRoute } from './routes/paths'
import './studio/studio-theme.css'
import App from './App.jsx'

migrateLegacyHashRoute()

document.body.classList.add('studio-app')
document.title = BRAND.pageTitle

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
