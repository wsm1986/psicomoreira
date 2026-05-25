import { useMemo } from 'react'
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarCheck2, CheckCircle2, Clock, Video, MapPin,
  Heart, FileText,
} from 'lucide-react'
import { usePsicoStore } from '../../store/store'
import styles from './PatientDashboard.module.css'

export function PatientDashboard() {
  const auth      = usePsicoStore(s => s.auth)
  const patients  = usePsicoStore(s => s.patients)
  const sessions  = usePsicoStore(s => s.sessions)
  const config    = usePsicoStore(s => s.config)

  const patient = patients.find(p => p.id === auth.patientId)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // ── Patient's sessions (hide clinical notes) ──────────────────────────────
  const patientSessions = useMemo(() =>
    sessions
      .filter(s => s.patientId === auth.patientId)
      .map(s => ({
        id:       s.id,
        date:     s.date,
        time:     s.time,
        status:   s.status,
        modality: s.modality,
        duration: s.duration,
        paid:     s.paid,
        value:    s.value,
        paymentMethod: s.paymentMethod,
      }))
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
    [sessions, auth.patientId]
  )

  // ── Next session ──────────────────────────────────────────────────────────
  const nextSession = useMemo(() =>
    patientSessions.find(s =>
      s.status === 'agendada' &&
      (s.date > todayStr || (s.date === todayStr))
    ),
    [patientSessions, todayStr]
  )

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     patientSessions.filter(s => s.status === 'realizada').length,
    pending:   patientSessions.filter(s => s.status === 'agendada' && s.date >= todayStr).length,
    pendingVal:patientSessions.filter(s => s.status === 'realizada' && !s.paid).reduce((a,s) => a + s.value, 0),
  }), [patientSessions, todayStr])

  // ── Recent sessions (realized, last 5) ────────────────────────────────────
  const recentSessions = useMemo(() =>
    patientSessions
      .filter(s => s.status === 'realizada' || (s.date <= todayStr && s.status !== 'agendada'))
      .slice(0, 5),
    [patientSessions, todayStr]
  )

  const firstName = patient?.name.split(' ')[0] ?? 'Paciente'

  if (!patient) {
    return (
      <div className={styles.error}>
        <Heart size={32} style={{ color: 'var(--accent)' }}/>
        <p>Paciente não encontrado.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Welcome */}
      <div className={styles.welcome}>
        <div className={styles.welcomeIcon}>🌸</div>
        <div>
          <h1 className={styles.welcomeTitle}>Olá, {firstName}!</h1>
          <p className={styles.welcomeSub}>
            Seu acompanhamento com {config.psychologistName}
            {config.crp ? ` · CRP ${config.crp}` : ''}
          </p>
        </div>
      </div>

      {/* Next session highlight */}
      {nextSession ? (
        <div className={styles.nextCard}>
          <div className={styles.nextCardIcon}>
            <CalendarCheck2 size={20}/>
          </div>
          <div className={styles.nextCardInfo}>
            <span className={styles.nextCardLabel}>Próxima sessão</span>
            <span className={styles.nextCardDate}>
              {format(parseISO(nextSession.date), "EEEE, d 'de' MMMM", { locale: ptBR })} às {nextSession.time}
            </span>
            <span className={styles.nextCardMeta}>
              {nextSession.modality === 'online'
                ? <><Video size={12}/> Online</>
                : <><MapPin size={12}/> Presencial</>
              }
              {' · '}{nextSession.duration} minutos
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.noNext}>
          <CalendarCheck2 size={22} strokeWidth={1.4} style={{ color: 'var(--text3)' }}/>
          <span>Nenhuma sessão agendada</span>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{stats.total}</span>
          <span className={styles.statLabel}>Sessões realizadas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{stats.pending}</span>
          <span className={styles.statLabel}>Próximas agendadas</span>
        </div>
        {stats.pendingVal > 0 && (
          <div className={styles.statCard}>
            <span className={styles.statVal} style={{ color: 'var(--amber)', fontSize: 16 }}>
              {stats.pendingVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <span className={styles.statLabel}>Pagamento pendente</span>
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}><FileText size={14}/> Histórico de sessões</h2>
        {recentSessions.length === 0 ? (
          <p className={styles.empty}>Nenhuma sessão registrada ainda.</p>
        ) : (
          <div className={styles.sessionList}>
            {recentSessions.map(s => (
              <div key={s.id} className={styles.sessionRow}>
                <div className={styles.sessionDateCol}>
                  <span className={styles.sessionDate}>
                    {format(parseISO(s.date), "d 'de' MMM", { locale: ptBR })}
                  </span>
                  <span className={styles.sessionTime}>{s.time}</span>
                </div>
                <div className={styles.sessionMeta}>
                  {s.modality === 'online'
                    ? <span className={styles.modalTag}><Video size={10}/> Online</span>
                    : <span className={styles.modalTag}><MapPin size={10}/> Presencial</span>
                  }
                  {s.status === 'realizada' && (
                    <span className={styles.statusTag} style={{ color: 'var(--green)' }}>
                      <CheckCircle2 size={11}/> Realizada
                    </span>
                  )}
                  {s.status === 'falta' && (
                    <span className={styles.statusTag} style={{ color: 'var(--red)' }}>
                      Falta
                    </span>
                  )}
                  {s.status === 'cancelada' && (
                    <span className={styles.statusTag} style={{ color: 'var(--red)' }}>
                      Cancelada
                    </span>
                  )}
                </div>
                <div className={styles.sessionRight}>
                  {s.status === 'realizada' && (
                    s.paid
                      ? <span className={styles.paidTag}><CheckCircle2 size={10}/> Pago</span>
                      : <span className={styles.pendingTag}><Clock size={10}/> Pendente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confidentiality note */}
      <div className={styles.privacyNote}>
        <span>🔒</span>
        <p>Suas notas de sessão são confidenciais e ficam sob sigilo profissional. Apenas informações de agendamento e pagamento estão disponíveis aqui.</p>
      </div>
    </div>
  )
}
