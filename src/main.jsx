import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
)

// Signaler à la landing statique que React est prêt
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.__onReactReady && window.__onReactReady()
  })
})
