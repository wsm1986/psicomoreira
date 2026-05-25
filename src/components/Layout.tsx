import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Wallet,
  Settings, LogOut, Heart, ChevronLeft, ChevronRight,
  Menu, X, HelpCircle, FileText,
} from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './Layout.module.css'

const NAV_MAIN = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/admin/pacientes', icon: Users,            label: 'Pacientes'    },
  { to: '/admin/agenda',    icon: CalendarDays,     label: 'Agenda'       },
  { to: '/admin/sessoes/nova', icon: FileText,      label: 'Nova sessão'  },
]
const NAV_BOTTOM = [
  { to: '/admin/financeiro',    icon: Wallet,      label: 'Financeiro'    },
  { to: '/admin/configuracoes', icon: Settings,    label: 'Configurações' },
  { to: '/admin/ajuda',         icon: HelpCircle,  label: 'Ajuda'         },
]

export function Layout() {
  const navigate  = useNavigate()
  const logout    = usePsicoStore(s => s.logout)
  const config    = usePsicoStore(s => s.config)

  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const NavGroup = ({ items }: { items: typeof NAV_MAIN }) => (
    <>
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/admin/dashboard'}
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
          title={collapsed ? label : undefined}
          onClick={() => setMobileOpen(false)}
        >
          <Icon size={17} strokeWidth={1.7}/>
          {!collapsed && <span className={styles.navLabel}>{label}</span>}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className={styles.root}>
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)}/>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Heart size={18} strokeWidth={1.8}/>
          </div>
          {!collapsed && (
            <div className={styles.brandText}>
              <span className={styles.brandName}>{config.clinicName}</span>
              <span className={styles.brandSub}>Gestão Clínica</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {!collapsed && <span className={styles.navSection}>Principal</span>}
          <NavGroup items={NAV_MAIN}/>

          <div className={styles.navDivider}/>
          {!collapsed && <span className={styles.navSection}>Gestão</span>}
          <NavGroup items={NAV_BOTTOM}/>
        </nav>

        {/* Bottom */}
        <div className={styles.sidebarBottom}>
          <button
            className={`${styles.collapseBtn} ${styles.desktopOnly}`}
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expandir' : 'Recolher'}
          >
            {collapsed ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
            {!collapsed && <span>Recolher</span>}
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">
            <LogOut size={16} strokeWidth={1.7}/>
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className={`${styles.main} ${collapsed ? styles.mainCollapsed : ''}`}>
        {/* Mobile topbar */}
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <div className={styles.topbarBrand}>
            <Heart size={15} strokeWidth={1.8} style={{ color: '#e8c4a8' }}/>
            <span className={styles.topbarName}>{config.clinicName}</span>
          </div>
          <div/>
        </header>

        <main className={styles.content}>
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
