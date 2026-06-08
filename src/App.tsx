import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { usePsicoStore } from './store/store'
import { firebaseAuth, firebaseEnabled } from './config/firebase'
import { loadFromFirestore } from './services/firestore'
import { LoginPage }        from './pages/LoginPage'
import { Layout }           from './components/Layout'
import { Dashboard }        from './pages/Dashboard'
import { PatientsPage }     from './pages/PatientsPage'
import { PatientProfile }   from './pages/PatientProfile'
import { SessionForm }      from './pages/SessionForm'
import { AgendaPage }       from './pages/AgendaPage'
import { FinancialPage }    from './pages/FinancialPage'
import { SettingsPage }     from './pages/SettingsPage'
import { HelpPage }         from './pages/HelpPage'
import { PatientLayout }    from './components/PatientLayout'
import { PatientDashboard } from './pages/patient/PatientDashboard'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loggedIn, role } = usePsicoStore(s => s.auth)
  if (!loggedIn)            return <Navigate to="/login" replace/>
  if (role !== 'psicologa') return <Navigate to="/paciente" replace/>
  return <>{children}</>
}

function RequirePatient({ children }: { children: React.ReactNode }) {
  const { loggedIn, role } = usePsicoStore(s => s.auth)
  if (!loggedIn)           return <Navigate to="/login" replace/>
  if (role !== 'paciente') return <Navigate to="/admin/dashboard" replace/>
  return <>{children}</>
}

// ── Splash de carregamento ─────────────────────────────────────────────────
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

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  // Enquanto o Firebase verifica a sessão, mostramos um splash
  const [authChecking, setAuthChecking] = useState(firebaseEnabled)

  useEffect(() => {
    if (!firebaseEnabled || !firebaseAuth) {
      setAuthChecking(false)
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      const store = usePsicoStore.getState()

      if (user && !store.auth.loggedIn) {
        // Firebase tem sessão ativa mas o Zustand foi resetado (ex: reload da página)
        // Restaura os dados do Firestore e marca como logado
        const data = await loadFromFirestore(user.uid)
        store.applyFirestoreData(data)
        usePsicoStore.setState({
          auth: {
            role:        'psicologa',
            patientId:   null,
            loggedIn:    true,
            firebaseUid: user.uid,
          },
        })
      }

      setAuthChecking(false)
    })

    return unsubscribe
  }, [])

  if (authChecking) return <LoadingScreen/>

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage/>}/>

        {/* Psicóloga */}
        <Route path="/admin" element={<RequireAuth><Layout/></RequireAuth>}>
          <Route index element={<Navigate to="dashboard" replace/>}/>
          <Route path="dashboard"          element={<Dashboard/>}/>
          <Route path="pacientes"          element={<PatientsPage/>}/>
          <Route path="pacientes/:id"      element={<PatientProfile/>}/>
          <Route path="sessoes/nova"       element={<SessionForm/>}/>
          <Route path="sessoes/:id/editar" element={<SessionForm/>}/>
          <Route path="agenda"             element={<AgendaPage/>}/>
          <Route path="financeiro"         element={<FinancialPage/>}/>
          <Route path="configuracoes"      element={<SettingsPage/>}/>
          <Route path="ajuda"              element={<HelpPage/>}/>
        </Route>

        {/* Paciente portal */}
        <Route path="/paciente" element={<RequirePatient><PatientLayout/></RequirePatient>}>
          <Route index element={<PatientDashboard/>}/>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}
