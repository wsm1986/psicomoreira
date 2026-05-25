import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, parseISO, startOfWeek, endOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Clock, Video, MapPin } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './AgendaPage.module.css'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const STATUS_COLOR: Record<string, string> = {
  agendada:  'var(--blue)',
  realizada: 'var(--green)',
  falta:     'var(--red)',
  cancelada: 'var(--red)',
  remarcada: 'var(--amber)',
}
const STATUS_BG: Record<string, string> = {
  agendada:  'color-mix(in srgb, var(--blue) 15%, transparent)',
  realizada: 'color-mix(in srgb, var(--green) 12%, transparent)',
  falta:     'color-mix(in srgb, var(--red) 12%, transparent)',
  cancelada: 'color-mix(in srgb, var(--red) 12%, transparent)',
  remarcada: 'color-mix(in srgb, var(--amber) 15%, transparent)',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function AgendaPage() {
  const navigate = useNavigate()
  const patients = usePsicoStore(s => s.patients)
  const sessions = usePsicoStore(s => s.sessions)

  const [current,  setCurrent]  = useState(new Date())
  const [selected, setSelected] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)

  // Build calendar grid (week-aligned)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd   = endOfWeek(monthEnd,   { weekStartsOn: 0 })
  const calDays  = eachDayOfInterval({ start: calStart, end: calEnd })

  // Map date → sessions
  const sessionsByDate = useMemo(() => {
    const map: Record<string, typeof sessions> = {}
    for (const s of sessions) {
      if (!map[s.date]) map[s.date] = []
      map[s.date].push(s)
    }
    return map
  }, [sessions])

  // Selected day sessions
  const selectedSessions = useMemo(() =>
    (sessionsByDate[selected] ?? [])
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(s => ({ ...s, patient: patients.find(p => p.id === s.patientId) })),
    [sessionsByDate, selected, patients]
  )

  function prevMonth() {
    setCurrent(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })
  }
  function nextMonth() {
    setCurrent(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Agenda</h1>
          <p className={styles.sub}>{format(current, "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => navigate('/admin/sessoes/nova')}>
          <Plus size={16}/> Nova sessão
        </button>
      </div>

      <div className={styles.layout}>
        {/* ── Calendar ──────────────────────────────────────────────── */}
        <div className={styles.calCard}>
          {/* Month nav */}
          <div className={styles.calNav}>
            <button className={styles.navBtn} onClick={prevMonth}>
              <ChevronLeft size={16}/>
            </button>
            <span className={styles.calMonth}>
              {format(current, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button className={styles.navBtn} onClick={nextMonth}>
              <ChevronRight size={16}/>
            </button>
          </div>

          {/* Week day headers */}
          <div className={styles.weekHeader}>
            {WEEK_DAYS.map(d => (
              <span key={d} className={styles.weekDay}>{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className={styles.grid}>
            {calDays.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const daySessions = sessionsByDate[key] ?? []
              const inMonth = isSameMonth(day, current)
              const isSelected = key === selected
              const todayDay   = isToday(day)

              return (
                <button
                  key={key}
                  className={`${styles.dayCell}
                    ${!inMonth    ? styles.dayOtherMonth : ''}
                    ${isSelected  ? styles.daySelected   : ''}
                    ${todayDay    ? styles.dayToday       : ''}
                  `}
                  onClick={() => setSelected(key)}
                >
                  <span className={styles.dayNum}>{format(day, 'd')}</span>
                  {daySessions.length > 0 && (
                    <div className={styles.dayDots}>
                      {daySessions.slice(0, 3).map(s => (
                        <span
                          key={s.id}
                          className={styles.dot}
                          style={{ background: STATUS_COLOR[s.status] ?? 'var(--text3)' }}
                        />
                      ))}
                      {daySessions.length > 3 && (
                        <span className={styles.dotMore}>+{daySessions.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            {[
              { label: 'Agendada',  color: 'var(--blue)'  },
              { label: 'Realizada', color: 'var(--green)' },
              { label: 'Falta',     color: 'var(--red)'   },
            ].map(l => (
              <span key={l.label} className={styles.legendItem}>
                <span className={styles.dot} style={{ background: l.color }}/>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Day panel ─────────────────────────────────────────────── */}
        <div className={styles.dayPanel}>
          <div className={styles.dayPanelHeader}>
            <h2 className={styles.dayPanelTitle}>
              {format(parseISO(selected), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            <button
              className={styles.btnGhost}
              onClick={() => navigate(`/admin/sessoes/nova?data=${selected}`)}
            >
              <Plus size={13}/>
            </button>
          </div>

          {selectedSessions.length === 0 ? (
            <div className={styles.emptyDay}>
              <p>Nenhuma sessão neste dia.</p>
              <button
                className={styles.btnGhostFull}
                onClick={() => navigate(`/admin/sessoes/nova?data=${selected}`)}
              >
                <Plus size={14}/> Adicionar sessão
              </button>
            </div>
          ) : (
            <div className={styles.daySessions}>
              {selectedSessions.map(s => (
                <div
                  key={s.id}
                  className={styles.daySession}
                  style={{ background: STATUS_BG[s.status] }}
                  onClick={() => navigate(`/admin/sessoes/${s.id}/editar`)}
                >
                  <div className={styles.dsTime}>
                    <Clock size={12}/>
                    {s.time}
                    <span className={styles.dsDuration}>{s.duration}min</span>
                  </div>
                  <div className={styles.dsInfo}>
                    <div className={styles.dsAvatar}>{initials(s.patient?.name ?? '?')}</div>
                    <div>
                      <span className={styles.dsName}>{s.patient?.name ?? 'Paciente'}</span>
                      <div className={styles.dsMeta}>
                        <span style={{ color: STATUS_COLOR[s.status], fontWeight: 500 }}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                        {s.modality === 'online'
                          ? <span><Video size={10}/> Online</span>
                          : <span><MapPin size={10}/> Presencial</span>
                        }
                        {s.value > 0 && <span>R$ {s.value}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
