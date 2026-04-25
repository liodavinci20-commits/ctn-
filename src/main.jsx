import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { EdtProvider } from './context/EdtContext.jsx'
import { SessionsProvider } from './context/SessionsContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'
import { RattrapagesProvider } from './context/RattrapagesContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <EdtProvider>
      <SessionsProvider>
        <NotificationsProvider>
          <RattrapagesProvider>
            <App />
          </RattrapagesProvider>
        </NotificationsProvider>
      </SessionsProvider>
    </EdtProvider>
  </AuthProvider>,
)
