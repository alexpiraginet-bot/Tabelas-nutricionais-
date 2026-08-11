import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MovementSite from './movimento/MovementSite.jsx'
import { parseMovementRoute } from './movimento/movement-route.js'
import './index.css'

const movementRoute = parseMovementRoute(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {movementRoute ? <MovementSite {...movementRoute} /> : <App />}
  </React.StrictMode>,
)

// registra o service worker do app instalável (public/sw.js — passthrough, sem cache)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
