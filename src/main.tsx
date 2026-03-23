import React from 'react'
import ReactDOM from 'react-dom/client'

import App from '@/App'
import '@/i18n/index'
import '@/styles/globals.css'
import '@/styles/codemirror-theme.css'
import { initLogger } from '@/lib/logger'

initLogger()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
