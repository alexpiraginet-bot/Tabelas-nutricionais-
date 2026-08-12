import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { parseMovementRoute } from './movimento/movement-route.js'
import './index.css'

const App = lazy(() => import('./App.jsx'))
const MovementSite = lazy(() => import('./movimento/MovementSite.jsx'))

const movementRoute = parseMovementRoute(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {movementRoute ? <MovementSite {...movementRoute} /> : <App />}
    </Suspense>
  </React.StrictMode>,
)

// registra o service worker do app instalável (public/sw.js — passthrough, sem cache)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
