import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users, CalendarCheck2, TrendingUp, AlertCircle,
  Plus, ChevronRight, Clock, Video, MapPin,
  CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './Dashboard.module.css'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function sessionStatusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    agendada:   { label: 'Agendada',   color: 'var(--blue)'   },
    realizada:  { label: 'Realizada',  color: 'var(--green)'  },
    falta:      { label: 'Falta',      color: 'var(--red)'    },
    cancelada:  { label: 'Cancelada',  color: 'var(--red)'    },
    remarcada:  { label: 'Remarcada',  color: 'var(--amber)'  },
  }
  return map[status] ?? { label: status, color: 'var(--text3)' }
}

function sessionStatusIcon(status: string) {
  if (status === 'realizada') return <CheckCircle2 size={13}/>
  if (status === 'falta' || status === 'cancelada') return <XCircle size={13}/>
  if (status === 'remarcada') return <RefreshCw size={13}/>
  return <Clock size={13}/>
}

// ── Component ──────────────────────────────────────────────────────────────
export function Dashboard() {
  const navigate  = useNavigate()
  const patients  = usePsicoStore(s => s.patients)
  const sessions  = usePsicoStore(s => s.sessions)
  const config    = usePsicoStore(s => s.config)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const monthStart = startOfMonth(today)
  const monthEnd   = endOfMonth(today)

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activePatients = patients.filter(p => p.status === 'ativo').length

    const monthSessions = sessions.filter(s =>
      isWithinInterval(parseISO(s.date), { start: monthStart, end: monthEnd })
    )
    const realizadas = monthSessions.filter(s => s.status === 'realizada')
    const monthRevenue = realizadas.reduce((acc, s) => acc + (s.paid ? s.value : 0), 0)
    const pendingValue = realizadas.reduce((acc, s) => acc + (!s.paid ? s.value : 0), 0)
    const pendingCount = realizadas.filter(s => !s.paid).length

    return { activePatients, realizadas: realizadas.length, monthRevenue, pendingValue, pendingCount }
  }, [patients, sessions, monthStart, monthEnd])

  // ── Today's sessions ─────────────────────────────────────────────────────
  const todaySessions = useMemo(() =>
    sessions
      .filter(s => s.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(s => ({
        ...s,
        patient: patients.find(p => p.id === s.patientId),
      })),
    [sessions, patients, todayStr]
  )

  // ── Next sessions (today+1..7 days) ──────────────────────────────────────
  const upcomingSessions = useMemo(() => {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const in7 = new Date(today)
    in7.setDate(in7.getDate() + 7)

    return sessions
      .filter(s => {
        const d = parseISO(s.date)
        return s.status === 'agendada' && d >= tomorrow && d <= in7
      })
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 5)
      .map(s => ({
        ...s,
        patient: patients.find(p => p.id === s.patientId),
      }))
  }, [sessions, patients, today])

  // ── Recent patients ───────────────────────────────────────────────────────
  const recentPatients = useMemo(() =>
    [...patients]
      .filter(p => p.status === 'ativo')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
    [patients]
  )

  // ── Helpers ───────────────────────────────────────────────────────────────
  function dayLabel(dateStr: string) {
    const d = parseISO(dateStr)
    if (isToday(d))    return 'Hoje'
    if (isTomorrow(d)) return 'Amanhã'
    return format(d, "EEE, d MMM", { locale: ptBR })
  }

  function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }

  const monthLabel = format(today, 'MMMM', { locale: ptBR })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.sub}>
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => navigate('/admin/sessoes/nova')}
        >
          <Plus size={16}/>
          Nova sessão
        </button>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
            <Users size={18}/>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{stats.activePatients}</span>
            <span className={styles.kpiLabel}>Pacientes ativos</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'color-mix(in srgb, var(--green) 14%, transparent)', color: 'var(--green)' }}>
            <CalendarCheck2 size={18}/>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{stats.realizadas}</span>
            <span className={styles.kpiLabel}>Sessões em {monthLabel}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'color-mix(in srgb, var(--blue) 14%, transparent)', color: 'var(--blue)' }}>
            <TrendingUp size={18}/>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{fmtBRL(stats.monthRevenue)}</span>
            <span className={styles.kpiLabel}>Recebido em {monthLabel}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'color-mix(in srgb, var(--amber) 14%, transparent)', color: 'var(--amber)' }}>
            <AlertCircle size={18}/>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>{fmtBRL(stats.pendingValue)}</span>
            <span className={styles.kpiLabel}>
              {stats.pendingCount} pagamento{stats.pendingCount !== 1 ? 's' : ''} pendente{stats.pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Main grid: Today + Upcoming + Patients */}
      <div className={styles.mainGrid}>

        {/* Left column: Today */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Hoje · {format(today, 'd/MM')}</h2>
            {todaySessions.length > 0 && (
              <span className={styles.badge}>{todaySessions.length}</span>
            )}
          </div>

          {todaySessions.length === 0 ? (
            <div className={styles.empty}>
              <CalendarCheck2 size={28} strokeWidth={1.3} style={{ color: 'var(--text3)' }}/>
              <p>Nenhuma sessão hoje</p>
              <button
                className={styles.btnGhost}
                onClick={() => navigate('/admin/sessoes/nova')}
              >
                <Plus size={14}/> Agendar sessão
              </button>
            </div>
          ) : (
            <div className={styles.sessionList}>
              {todaySessions.map(s => {
                const { label, color } = sessionStatusLabel(s.status)
                return (
                  <div
                    key={s.id}
                    className={styles.sessionItem}
                    onClick={() => navigate(`/admin/sessoes/${s.id}/editar`)}
                  >
                    <div className={styles.sessionAvatar}>
                      {initials(s.patient?.name ?? '?')}
                    </div>
                    <div className={styles.sessionInfo}>
                      <span className={styles.sessionName}>{s.patient?.name ?? 'Paciente'}</span>
                      <div className={styles.sessionMeta}>
                        <span><Clock size={11}/> {s.time}</span>
                        {s.modality === 'online'
                          ? <span><Video size={11}/> Online</span>
                          : <span><MapPin size={11}/> Presencial</span>
                        }
                      </div>
                    </div>
                    <span className={styles.sessionStatus} style={{ color }}>
                      {sessionStatusIcon(s.status)}
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column: Upcoming + Recent patients */}
        <div className={styles.rightCol}>

          {/* Upcoming sessions */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Próximas sessões</h2>
              <button
                className={styles.btnLink}
                onClick={() => navigate('/admin/agenda')}
              >
                Ver agenda <ChevronRight size={13}/>
              </button>
            </div>

            {upcomingSessions.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma sessão agendada nos próximos 7 dias.</p>
            ) : (
              <div className={styles.upcomingList}>
                {upcomingSessions.map(s => (
                  <div
                    key={s.id}
                    className={styles.upcomingItem}
                    onClick={() => navigate(`/admin/sessoes/${s.id}/editar`)}
                  >
                    <div className={styles.upcomingDay}>
                      <span className={styles.upcomingDayLabel}>{dayLabel(s.date)}</span>
                      <span className={styles.upcomingTime}>{s.time}</span>
                    </div>
                    <div className={styles.sessionAvatar} style={{ width:30, height:30, fontSize:11 }}>
                      {initials(s.patient?.name ?? '?')}
                    </div>
                    <span className={styles.upcomingName}>{s.patient?.name ?? 'Paciente'}</span>
                    {s.modality === 'online'
                      ? <Video size={13} style={{ color:'var(--text3)', flexShrink:0 }}/>
                      : <MapPin size={13} style={{ color:'var(--text3)', flexShrink:0 }}/>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent patients */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Pacientes ativos</h2>
              <button
                className={styles.btnLink}
                onClick={() => navigate('/admin/pacientes')}
              >
                Ver todos <ChevronRight size={13}/>
              </button>
            </div>

            {recentPatients.length === 0 ? (
              <div className={styles.empty}>
                <Users size={28} strokeWidth={1.3} style={{ color: 'var(--text3)' }}/>
                <p>Nenhum paciente cadastrado</p>
                <button
                  className={styles.btnGhost}
                  onClick={() => navigate('/admin/pacientes')}
                >
                  <Plus size={14}/> Adicionar paciente
                </button>
              </div>
            ) : (
              <div className={styles.patientList}>
                {recentPatients.map(p => (
                  <div
                    key={p.id}
                    className={styles.patientItem}
                    onClick={() => navigate(`/admin/pacientes/${p.id}`)}
                  >
                    <div className={styles.sessionAvatar} style={{ background: 'color-mix(in srgb, var(--purple) 18%, var(--bg3))' }}>
                      {initials(p.name)}
                    </div>
                    <div className={styles.patientInfo}>
                      <span className={styles.patientName}>{p.name}</span>
                      <span className={styles.patientSub}>
                        {p.phone}
                        {p.insurance ? ` · ${p.insurance}` : ''}
                      </span>
                    </div>
                    <ChevronRight size={15} style={{ color: 'var(--text3)', flexShrink:0 }}/>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Quick tip when empty */}
      {patients.length === 0 && (
        <div className={styles.onboarding}>
          <span>👋</span>
          <div>
            <strong>Bem-vinda ao {config.clinicName}!</strong>
            <p>Comece cadastrando sua primeira paciente em <button className={styles.btnInline} onClick={() => navigate('/admin/pacientes')}>Pacientes</button>.</p>
          </div>
        </div>
      )}
    </div>
  )
}
