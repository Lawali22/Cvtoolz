import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Cacher le splash dès que React a rendu
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.__hideSplash && window.__hideSplash()
  })
})
