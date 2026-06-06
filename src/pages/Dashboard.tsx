import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, isToday, isTomorrow, parseISO,
  startOfMonth, endOfMonth, isWithinInterval,
  subMonths, differenceInDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users, CalendarCheck2, TrendingUp, AlertCircle,
  Plus, ChevronRight, Clock, Video, MapPin,
  CheckCircle2, XCircle, RefreshCw, Activity, AlertTriangle,
} from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './Dashboard.module.css'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function sessionStatusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    agendada:  { label: 'Agendada',  color: 'var(--blue)'  },
    realizada: { label: 'Realizada', color: 'var(--green)' },
    falta:     { label: 'Falta',     color: 'var(--red)'   },
    cancelada: { label: 'Cancelada', color: 'var(--red)'   },
    remarcada: { label: 'Remarcada', color: 'var(--amber)' },
  }
  return map[status] ?? { label: status, color: 'var(--text3)' }
}

function sessionStatusIcon(status: string) {
  if (status === 'realizada') return <CheckCircle2 size={13}/>
  if (status === 'falta' || status === 'cancelada') return <XCircle size={13}/>
  if (status === 'remarcada') return <RefreshCw size={13}/>
  return <Clock size={13}/>
}

// ── Revenue Bar Chart (SVG) ────────────────────────────────────────────────
function RevenueChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const BAR_W = 36
  const BAR_GAP = 8
  const H = 64

  return (
    <div className={styles.chartWrap}>
      <svg
        width={data.length * (BAR_W + BAR_GAP) - BAR_GAP}
        height={H}
        style={{ display: 'block' }}
      >
        {data.map((d, i) => {
          const bh = d.value > 0 ? Math.max(4, (d.value / max) * H) : 3
          const x = i * (BAR_W + BAR_GAP)
          const y = H - bh
          const isLast = i === data.length - 1
          return (
            <rect
              key={i}
              x={x} y={y}
              width={BAR_W} height={bh}
              rx={5}
              fill={isLast
                ? 'var(--accent)'
                : 'color-mix(in srgb, var(--accent) 28%, transparent)'}
            />
          )
        })}
      </svg>
      <div className={styles.chartLabels}>
        {data.map((d, i) => (
          <span
            key={i}
            className={i === data.length - 1 ? styles.chartLabelActive : styles.chartLabel}
            style={{ width: BAR_W }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export function Dashboard() {
  const navigate = useNavigate()
  const patients = usePsicoStore(s => s.patients)
  const sessions = usePsicoStore(s => s.sessions)
  const config   = usePsicoStore(s => s.config)

  const today     = new Date()
  const todayStr  = format(today, 'yyyy-MM-dd')
  const monthStart = startOfMonth(today)
  const monthEnd   = endOfMonth(today)

  // ── Stats do mês ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activePatients = patients.filter(p => p.status === 'ativo').length

    const monthSessions = sessions.filter(s =>
      isWithinInterval(parseISO(s.date), { start: monthStart, end: monthEnd })
    )
    const realizadas    = monthSessions.filter(s => s.status === 'realizada')
    const faltas        = monthSessions.filter(s => s.status === 'falta')
    const monthRevenue  = realizadas.reduce((acc, s) => acc + (s.paid ? s.value : 0), 0)
    const pendingValue  = realizadas.reduce((acc, s) => acc + (!s.paid ? s.value : 0), 0)
    const pendingCount  = realizadas.filter(s => !s.paid).length

    const attendanceDen = realizadas.length + faltas.length
    const attendanceRate = attendanceDen > 0
      ? Math.round((realizadas.length / attendanceDen) * 100)
      : null

    return { activePatients, realizadas: realizadas.length, monthRevenue, pendingValue, pendingCount, attendanceRate }
  }, [patients, sessions, monthStart, monthEnd])

  // ── Receita últimos 6 meses ───────────────────────────────────────────────
  const monthlyRevenue = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d     = subMonths(today, 5 - i)
      const start = startOfMonth(d)
      const end   = endOfMonth(d)
      const value = sessions
        .filter(s =>
          s.status === 'realizada' && s.paid &&
          isWithinInterval(parseISO(s.date), { start, end })
        )
        .reduce((acc, s) => acc + s.value, 0)
      return { label: format(d, 'MMM', { locale: ptBR }), value }
    }),
    [sessions]
  )

  // ── Pacientes inativos (ativo mas sem sessão realizada há 28+ dias) ────────
  const inactivePatients = useMemo(() => {
    return patients
      .filter(p => p.status === 'ativo')
      .map(p => {
        const last = sessions
          .filter(s => s.patientId === p.id && s.status === 'realizada')
          .sort((a, b) => b.date.localeCompare(a.date))[0]
        const daysSince = last
          ? differenceInDays(today, parseISO(last.date))
          : differenceInDays(today, parseISO(p.startDate))
        return { ...p, daysSince, lastDate: last?.date ?? null }
      })
      .filter(p => p.daysSince >= 28)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 5)
  }, [patients, sessions])

  // ── Today's sessions ──────────────────────────────────────────────────────
  const todaySessions = useMemo(() =>
    sessions
      .filter(s => s.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(s => ({ ...s, patient: patients.find(p => p.id === s.patientId) })),
    [sessions, patients, todayStr]
  )

  // ── Próximas sessões (7 dias) ─────────────────────────────────────────────
  const upcomingSessions = useMemo(() => {
    const in7 = new Date(today)
    in7.setDate(in7.getDate() + 7)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return sessions
      .filter(s => {
        const d = parseISO(s.date)
        return s.status === 'agendada' && d >= tomorrow && d <= in7
      })
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 5)
      .map(s => ({ ...s, patient: patients.find(p => p.id === s.patientId) }))
  }, [sessions, patients])

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
  const totalRevenue6m = monthlyRevenue.reduce((a, d) => a + d.value, 0)

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
        <button className={styles.btnPrimary} onClick={() => navigate('/admin/sessoes/nova')}>
          <Plus size={16}/> Nova sessão
        </button>
      </div>

      {/* KPI Cards — 5 cards */}
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

        {/* 5º KPI: Taxa de comparecimento */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{
            background: stats.attendanceRate === null
              ? 'var(--bg3)'
              : stats.attendanceRate >= 80
              ? 'color-mix(in srgb, var(--green) 14%, transparent)'
              : 'color-mix(in srgb, var(--amber) 14%, transparent)',
            color: stats.attendanceRate === null
              ? 'var(--text3)'
              : stats.attendanceRate >= 80
              ? 'var(--green)'
              : 'var(--amber)',
          }}>
            <Activity size={18}/>
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiValue}>
              {stats.attendanceRate === null ? '—' : `${stats.attendanceRate}%`}
            </span>
            <span className={styles.kpiLabel}>Taxa de comparecimento</span>
          </div>
        </div>
      </div>

      {/* Receita — últimos 6 meses */}
      {totalRevenue6m > 0 && (
        <div className={styles.revenueCard}>
          <div className={styles.revenueCardHeader}>
            <div>
              <h2 className={styles.revenueCardTitle}>Receita — últimos 6 meses</h2>
              <p className={styles.revenueCardSub}>Total recebido: {fmtBRL(totalRevenue6m)}</p>
            </div>
            <button className={styles.btnLink} onClick={() => navigate('/admin/financeiro')}>
              Ver financeiro <ChevronRight size={13}/>
            </button>
          </div>
          <div className={styles.revenueChartArea}>
            <div className={styles.revenueValues}>
              {monthlyRevenue.map((d, i) => (
                <div key={i} className={styles.revenueMonth}>
                  <span className={i === 5 ? styles.revenueValActive : styles.revenueVal}>
                    {d.value > 0 ? fmtBRL(d.value) : '—'}
                  </span>
                </div>
              ))}
            </div>
            <RevenueChart data={monthlyRevenue}/>
          </div>
        </div>
      )}

      {/* Main grid */}
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
              <button className={styles.btnGhost} onClick={() => navigate('/admin/sessoes/nova')}>
                <Plus size={14}/> Agendar sessão
              </button>
            </div>
          ) : (
            <div className={styles.sessionList}>
              {todaySessions.map(s => {
                const { label, color } = sessionStatusLabel(s.status)
                return (
                  <div key={s.id} className={styles.sessionItem} onClick={() => navigate(`/admin/sessoes/${s.id}/editar`)}>
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
                      {sessionStatusIcon(s.status)} {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>

          {/* Alerta de pacientes inativos */}
          {inactivePatients.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <AlertTriangle size={15} style={{ color: 'var(--amber)' }}/>
                  Sem atendimento recente
                </h2>
                <span className={styles.badge} style={{ background: 'color-mix(in srgb, var(--amber) 15%, transparent)', color: 'var(--amber)' }}>
                  {inactivePatients.length}
                </span>
              </div>
              <div className={styles.patientList}>
                {inactivePatients.map(p => (
                  <div key={p.id} className={styles.patientItem} onClick={() => navigate(`/admin/pacientes/${p.id}`)}>
                    <div className={styles.sessionAvatar} style={{ background: 'color-mix(in srgb, var(--amber) 18%, var(--bg3))', color: 'var(--amber)' }}>
                      {initials(p.name)}
                    </div>
                    <div className={styles.patientInfo}>
                      <span className={styles.patientName}>{p.name}</span>
                      <span className={styles.patientSub}>
                        {p.lastDate
                          ? `Última sessão há ${p.daysSince} dias`
                          : `Sem sessão realizada desde o início`
                        }
                      </span>
                    </div>
                    <ChevronRight size={15} style={{ color: 'var(--text3)', flexShrink:0 }}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximas sessões */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Próximas sessões</h2>
              <button className={styles.btnLink} onClick={() => navigate('/admin/agenda')}>
                Ver agenda <ChevronRight size={13}/>
              </button>
            </div>
            {upcomingSessions.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma sessão agendada nos próximos 7 dias.</p>
            ) : (
              <div className={styles.upcomingList}>
                {upcomingSessions.map(s => (
                  <div key={s.id} className={styles.upcomingItem} onClick={() => navigate(`/admin/sessoes/${s.id}/editar`)}>
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

          {/* Pacientes ativos */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Pacientes ativos</h2>
              <button className={styles.btnLink} onClick={() => navigate('/admin/pacientes')}>
                Ver todos <ChevronRight size={13}/>
              </button>
            </div>
            {patients.filter(p => p.status === 'ativo').length === 0 ? (
              <div className={styles.empty}>
                <Users size={28} strokeWidth={1.3} style={{ color: 'var(--text3)' }}/>
                <p>Nenhum paciente cadastrado</p>
                <button className={styles.btnGhost} onClick={() => navigate('/admin/pacientes')}>
                  <Plus size={14}/> Adicionar paciente
                </button>
              </div>
            ) : (
              <div className={styles.patientList}>
                {patients
                  .filter(p => p.status === 'ativo')
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .slice(0, 5)
                  .map(p => (
                    <div key={p.id} className={styles.patientItem} onClick={() => navigate(`/admin/pacientes/${p.id}`)}>
                      <div className={styles.sessionAvatar} style={{ background: 'color-mix(in srgb, var(--purple) 18%, var(--bg3))' }}>
                        {initials(p.name)}
                      </div>
                      <div className={styles.patientInfo}>
                        <span className={styles.patientName}>{p.name}</span>
                        <span className={styles.patientSub}>
                          {p.phone}{p.insurance ? ` · ${p.insurance}` : ''}
                        </span>
                      </div>
                      <ChevronRight size={15} style={{ color: 'var(--text3)', flexShrink:0 }}/>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

        </div>
      </div>

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
