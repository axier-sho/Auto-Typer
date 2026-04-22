import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import OverlayApp from './components/OverlayApp'
import './index.css'

const isOverlay =
  typeof window !== 'undefined' &&
  (window.location.hash.includes('overlay') ||
    new URLSearchParams(window.location.search).get('overlay') === '1');

if (isOverlay && typeof document !== 'undefined') {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isOverlay ? <OverlayApp /> : <App />}
  </React.StrictMode>,
)
