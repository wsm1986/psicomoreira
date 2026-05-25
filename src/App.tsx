import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { usePsicoStore } from './store/store'
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
  if (!loggedIn)              return <Navigate to="/login" replace/>
  if (role !== 'psicologa')   return <Navigate to="/paciente" replace/>
  return <>{children}</>
}

function RequirePatient({ children }: { children: React.ReactNode }) {
  const { loggedIn, role } = usePsicoStore(s => s.auth)
  if (!loggedIn)             return <Navigate to="/login" replace/>
  if (role !== 'paciente')   return <Navigate to="/admin/dashboard" replace/>
  return <>{children}</>
}

export default function App() {
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
