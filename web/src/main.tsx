import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Explore from './pages/Explore'
import Nearby from './pages/Nearby'
import Place from './pages/Place'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Marketplace from './pages/Marketplace'
import Navigation from './components/Navigation'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './lib/auth'

function App() {
  const ok = isSupabaseConfigured()
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navigation />
        {!ok ? (
          <div style={{ padding:16 }}>
            <h3>Configure environment</h3>
            <p>Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Create web/.env and restart dev server.</p>
          </div>
        ) : (
          <div className="container">
            <Routes>
              <Route path="/" element={<Login/>} />
              <Route path="/home" element={<Protected><Explore/></Protected>} />
              <Route path="/nearby" element={<Protected><Nearby/></Protected>} />
              <Route path="/chat" element={<Protected><Chat/></Protected>} />
              <Route path="/marketplace" element={<Protected><Marketplace/></Protected>} />
              <Route path="/place/:id" element={<Protected><Place/></Protected>} />
              <Route path="/login" element={<Login/>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        )}
      </BrowserRouter>
    </AuthProvider>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="muted">Loading...</div>
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)


