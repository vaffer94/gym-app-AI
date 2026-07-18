import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'
import SchedeListPage from './pages/SchedeListPage'
import PlanEditorPage from './pages/PlanEditorPage'
import PlanDetailPage from './pages/PlanDetailPage'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="page center" style={{ paddingTop: '40vh' }}>
        <span className="emoji-xl">🏋️</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><HomePage /></Protected>} />
      <Route path="/schede" element={<Protected><SchedeListPage /></Protected>} />
      <Route path="/schede/nuova" element={<Protected><PlanEditorPage /></Protected>} />
      <Route path="/schede/:id" element={<Protected><PlanDetailPage /></Protected>} />
      <Route path="/schede/:id/modifica" element={<Protected><PlanEditorPage /></Protected>} />
      <Route
        path="/storico"
        element={<Protected><PlaceholderPage emoji="📊" title="Storico" text="Qui vedrai i tuoi allenamenti passati e le statistiche. Arriva nello Step 4!" /></Protected>}
      />
      <Route
        path="/allenamento"
        element={<Protected><PlaceholderPage emoji="🔥" title="Allenamento" text="Da qui avvierai il tuo allenamento. Arriva nello Step 3!" /></Protected>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
