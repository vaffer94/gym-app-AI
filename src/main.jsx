import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './styles/global.css'
import { applicaTema } from './lib/tema'

// Prima di montare React: se si aspettasse il primo render, aprendo l'app col
// tema scuro si vedrebbe un lampo di schermata chiara.
applicaTema()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
