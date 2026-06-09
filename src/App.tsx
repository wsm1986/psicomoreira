import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { usePsicoStore } from './store/store'
import { firebaseAuth } from './config/firebase'
import { LoginPage }     from './pages/LoginPage'
import { Layout }        from './components/Layout'
import { Dashboard }     from './pages/Dashboard'
import { PatientsPage }  from './pages/PatientsPage'
import { PatientProfile } from './pages/PatientProfile'
import { SessionForm }   from './pages/SessionForm'
import { AgendaPage }    from './pages/AgendaPage'
import { FinancialPage } from './pages/FinancialPage'
import { SettingsPage }  from './pages/SettingsPage'
import { HelpPage }      from './pages/HelpPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loggedIn, role } = usePsicoStore(s => s.auth)
  const loading            = usePsicoStore(s => s.loading)
  if (loading)              return <LoadingScreen/>
  if (!loggedIn || role !== 'psicologa') return <Navigate to="/login" replace/>
  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg2, #faf7f5)',
      flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid var(--border, #e8e0d8)',
        borderTopColor: 'var(--accent, #c4906e)',
        animation: 'spin 0.8s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 13, color: 'var(--text3, #a0968f)' }}>Carregando…</p>
    </div>
  )
}

export default function App() {
  // Guarda se já processou o primeiro onAuthStateChanged
  // para não mostrar login em flash antes do Firebase responder
  const authResolved = useRef(false)
  const isAuthResolvedStore = usePsicoStore(s => s.authResolved)

  useEffect(() => {
    if (!firebaseAuth) return

    // Trata retorno do signInWithRedirect (mobile/iOS)
    getRedirectResult(firebaseAuth).catch(() => {})

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      const store = usePsicoStore.getState()

      if (user) {
        // Só recarrega se não estiver logado com esse UID
        if (!store.auth.loggedIn || store.auth.firebaseUid !== user.uid) {
          await store.loginWithFirebase(user.uid)
        }
      } else {
        // Firebase não tem sessão — limpa store se havia
        if (store.auth.loggedIn) {
          store.logout()
        }
      }

      // Marca que o Firebase já respondeu (libera as rotas)
      if (!authResolved.current) {
        authResolved.current = true
        usePsicoStore.setState({ authResolved: true })
      }
    })

    return unsubscribe
  }, [])

  // Enquanto Firebase não respondeu, mostra loading
  if (!isAuthResolvedStore) return <LoadingScreen/>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage/>}/>

        <Route path="/admin" element={<RequireAuth><Layout/></RequireAuth>}>
          <Route index                      element={<Navigate to="dashboard" replace/>}/>
          <Route path="dashboard"           element={<Dashboard/>}/>
          <Route path="pacientes"           element={<PatientsPage/>}/>
          <Route path="pacientes/:id"       element={<PatientProfile/>}/>
          <Route path="sessoes/nova"        element={<SessionForm/>}/>
          <Route path="sessoes/:id/editar"  element={<SessionForm/>}/>
          <Route path="agenda"              element={<AgendaPage/>}/>
          <Route path="financeiro"          element={<FinancialPage/>}/>
          <Route path="configuracoes"       element={<SettingsPage/>}/>
          <Route path="ajuda"               element={<HelpPage/>}/>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}
