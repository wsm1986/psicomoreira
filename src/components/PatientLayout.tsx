import { Outlet, useNavigate } from 'react-router-dom'
import { Heart, LogOut } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './PatientLayout.module.css'

export function PatientLayout() {
  const navigate = useNavigate()
  const logout   = usePsicoStore(s => s.logout)
  const config   = usePsicoStore(s => s.config)
  const auth     = usePsicoStore(s => s.auth)
  const patients = usePsicoStore(s => s.patients)

  const patient = patients.find(p => p.id === auth.patientId)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Heart size={16} strokeWidth={1.8}/>
          </div>
          <div>
            <span className={styles.brandName}>{config.clinicName}</span>
            <span className={styles.brandSub}>Seu espaço</span>
          </div>
        </div>

        <div className={styles.right}>
          {patient && (
            <span className={styles.greeting}>Olá, {patient.name.split(' ')[0]} 🌸</span>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">
            <LogOut size={15}/>
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className={styles.content}>
        <Outlet/>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        🔒 Seus dados são protegidos conforme a LGPD
      </footer>
    </div>
  )
}
