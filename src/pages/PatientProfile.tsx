import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, differenceInYears, differenceInMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft, Phone, Mail, Calendar, MapPin, User,
  Plus, Edit2, CheckCircle2, XCircle, Clock, Video,
  FileText, ChevronDown, ChevronUp, Banknote, Wifi,
  CircleDot, AlertTriangle,
} from 'lucide-react'
import { usePsicoStore } from '../store/store'
import type { PatientStatus, Session } from '../types'
import styles from './PatientProfile.module.css'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const STATUS_LABELS: Record<PatientStatus, string> = {
  ativo:     'Ativo',
  encerrado: 'Encerrado',
  pausado:   'Pausado',
}
const STATUS_COLOR: Record<PatientStatus, string> = {
  ativo:     'var(--green)',
  encerrado: 'var(--red)',
  pausado:   'var(--amber)',
}

const SESSION_STATUS_COLOR: Record<string, string> = {
  agendada:  'var(--blue)',
  realizada: 'var(--green)',
  falta:     'var(--red)',
  cancelada: 'var(--red)',
  remarcada: 'var(--amber)',
}
const SESSION_STATUS_LABEL: Record<string, string> = {
  agendada:  'Agendada',
  realizada: 'Realizada',
  falta:     'Falta',
  cancelada: 'Cancelada',
  remarcada: 'Remarcada',
}

// ── Component ──────────────────────────────────────────────────────────────
export function PatientProfile() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const patients   = usePsicoStore(s => s.patients)
  const sessions   = usePsicoStore(s => s.sessions)
  const setStatus  = usePsicoStore(s => s.setStatus)

  const patient = patients.find(p => p.id === id)
  const [activeTab, setActiveTab] = useState<'resumo' | 'sessoes' | 'financeiro'>('resumo')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  // ── Patient sessions sorted newest first ─────────────────────────────────
  const patientSessions = useMemo(() =>
    sessions
      .filter(s => s.patientId === id)
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
    [sessions, id]
  )

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const realizadas = patientSessions.filter(s => s.status === 'realizada')
    const totalPago  = realizadas.reduce((a, s) => a + (s.paid ? s.value : 0), 0)
    const totalPend  = realizadas.reduce((a, s) => a + (!s.paid ? s.value : 0), 0)
    const faltas     = patientSessions.filter(s => s.status === 'falta').length
    return { total: patientSessions.length, realizadas: realizadas.length, faltas, totalPago, totalPend }
  }, [patientSessions])

  if (!patient) {
    return (
      <div className={styles.notFound}>
        <AlertTriangle size={32} style={{ color: 'var(--amber)' }}/>
        <p>Paciente não encontrado.</p>
        <button className={styles.btnBack} onClick={() => navigate('/admin/pacientes')}>
          <ArrowLeft size={14}/> Voltar
        </button>
      </div>
    )
  }

  const followupMonths = differenceInMonths(new Date(), parseISO(patient.startDate))
  const ageStr = patient.birthDate
    ? `${differenceInYears(new Date(), parseISO(patient.birthDate))} anos`
    : null

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── Back + actions ──────────────────────────────────────────────── */}
      <div className={styles.topRow}>
        <button className={styles.btnBack} onClick={() => navigate('/admin/pacientes')}>
          <ArrowLeft size={15}/> Pacientes
        </button>
        <div className={styles.actions}>
          <select
            className={styles.statusSelect}
            value={patient.status}
            onChange={e => setStatus(patient.id, e.target.value as PatientStatus)}
            style={{ color: STATUS_COLOR[patient.status] }}
          >
            {(['ativo', 'pausado', 'encerrado'] as PatientStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate(`/admin/sessoes/nova?paciente=${patient.id}`)}
          >
            <Plus size={15}/> Nova sessão
          </button>
        </div>
      </div>

      {/* ── Patient hero ────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroAvatar}>{initials(patient.name)}</div>
        <div className={styles.heroInfo}>
          <div className={styles.heroNameRow}>
            <h1 className={styles.heroName}>{patient.name}</h1>
            <span className={styles.heroBadge} style={{ color: STATUS_COLOR[patient.status], borderColor: STATUS_COLOR[patient.status] }}>
              <CircleDot size={10}/> {STATUS_LABELS[patient.status]}
            </span>
          </div>
          <div className={styles.heroMeta}>
            {ageStr && <span><User size={13}/> {ageStr}</span>}
            {patient.phone && <span><Phone size={13}/> {patient.phone}</span>}
            {patient.email && <span><Mail size={13}/> {patient.email}</span>}
            {patient.address && <span><MapPin size={13}/> {patient.address}</span>}
          </div>
          <div className={styles.heroSub}>
            <span>
              <Calendar size={12}/>
              Acompanhamento desde {format(parseISO(patient.startDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {' '}· {followupMonths} {followupMonths === 1 ? 'mês' : 'meses'}
            </span>
            {patient.accessCode && (
              <span className={styles.codeChip}>{patient.accessCode}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statVal}>{stats.total}</span>
          <span className={styles.statLabel}>Sessões</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statVal}>{stats.realizadas}</span>
          <span className={styles.statLabel}>Realizadas</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statVal} style={{ color: stats.faltas > 0 ? 'var(--red)' : undefined }}>{stats.faltas}</span>
          <span className={styles.statLabel}>Faltas</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statVal} style={{ color: 'var(--green)' }}>{fmtBRL(stats.totalPago)}</span>
          <span className={styles.statLabel}>Recebido</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statVal} style={{ color: stats.totalPend > 0 ? 'var(--amber)' : undefined }}>{fmtBRL(stats.totalPend)}</span>
          <span className={styles.statLabel}>Pendente</span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        {(['resumo', 'sessoes', 'financeiro'] as const).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t === 'resumo' ? 'Resumo' : t === 'sessoes' ? 'Sessões' : 'Financeiro'}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumo ─────────────────────────────────────────────────── */}
      {activeTab === 'resumo' && (
        <div className={styles.resumeGrid}>
          {/* Dados pessoais */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}><User size={14}/> Dados pessoais</h3>
            <div className={styles.dataList}>
              <Row label="Nome" value={patient.name}/>
              {patient.birthDate && (
                <Row label="Nascimento" value={format(parseISO(patient.birthDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}/>
              )}
              {patient.cpf && <Row label="CPF" value={patient.cpf}/>}
              <Row label="Telefone" value={patient.phone}/>
              {patient.email && <Row label="E-mail" value={patient.email}/>}
              {patient.address && <Row label="Endereço" value={patient.address}/>}
              {patient.emergencyContact && (
                <Row label="Contato emergência" value={`${patient.emergencyContact}${patient.emergencyPhone ? ` · ${patient.emergencyPhone}` : ''}`}/>
              )}
              {patient.insurance && <Row label="Convênio" value={patient.insurance}/>}
              {patient.referral && <Row label="Encaminhamento" value={patient.referral}/>}
            </div>
          </div>

          {/* Notas clínicas */}
          {patient.notes && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}><FileText size={14}/> Observações</h3>
              <p className={styles.notesText}>{patient.notes}</p>
            </div>
          )}

          {/* Portal access */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}><Wifi size={14}/> Portal da paciente</h3>
            {patient.accessCode ? (
              <div className={styles.dataList}>
                <Row label="Código de acesso" value={<span className={styles.codeMono}>{patient.accessCode}</span>}/>
                <p className={styles.hint}>A paciente pode usar este código para acessar o portal em <strong>psicomoreira.vercel.app</strong></p>
              </div>
            ) : (
              <p className={styles.hint}>Nenhum código de acesso configurado. Edite o cadastro para adicionar.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Sessões ────────────────────────────────────────────────── */}
      {activeTab === 'sessoes' && (
        <div className={styles.sessionSection}>
          {patientSessions.length === 0 ? (
            <div className={styles.empty}>
              <FileText size={32} strokeWidth={1.2} style={{ color: 'var(--text3)' }}/>
              <p>Nenhuma sessão registrada.</p>
              <button
                className={styles.btnGhost}
                onClick={() => navigate(`/admin/sessoes/nova?paciente=${patient.id}`)}
              >
                <Plus size={14}/> Registrar sessão
              </button>
            </div>
          ) : (
            <div className={styles.sessionList}>
              {patientSessions.map((s, idx) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  sessionNumber={stats.realizadas - patientSessions.filter((ss, i) => i >= idx && ss.status === 'realizada').length + 1}
                  expanded={expandedSession === s.id}
                  onToggle={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                  onEdit={() => navigate(`/admin/sessoes/${s.id}/editar`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Financeiro ─────────────────────────────────────────────── */}
      {activeTab === 'financeiro' && (
        <div className={styles.financialSection}>
          <div className={styles.finGrid}>
            <FinCard label="Total faturado" value={fmtBRL(stats.totalPago + stats.totalPend)} color="var(--text)"/>
            <FinCard label="Recebido"        value={fmtBRL(stats.totalPago)}  color="var(--green)"/>
            <FinCard label="Pendente"        value={fmtBRL(stats.totalPend)}  color={stats.totalPend > 0 ? 'var(--amber)' : 'var(--text3)'}/>
          </div>

          <div className={styles.card} style={{ marginTop: 0 }}>
            <h3 className={styles.cardTitle}><Banknote size={14}/> Histórico de pagamentos</h3>
            {patientSessions.filter(s => s.status === 'realizada').length === 0 ? (
              <p className={styles.hint} style={{ padding: '12px 0' }}>Nenhuma sessão realizada ainda.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Forma</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patientSessions
                    .filter(s => s.status === 'realizada')
                    .map(s => (
                      <tr key={s.id}>
                        <td>{format(parseISO(s.date), "d/MM/yyyy")}</td>
                        <td>{fmtBRL(s.value)}</td>
                        <td>{s.paymentMethod ?? '—'}</td>
                        <td>
                          <span style={{ color: s.paid ? 'var(--green)' : 'var(--amber)', fontWeight: 500, display:'flex', alignItems:'center', gap:4 }}>
                            {s.paid
                              ? <><CheckCircle2 size={12}/> Pago</>
                              : <><Clock size={12}/> Pendente</>
                            }
                          </span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.dataRow}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={styles.dataValue}>{value}</span>
    </div>
  )
}

function FinCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={styles.finCard}>
      <span className={styles.finVal} style={{ color }}>{value}</span>
      <span className={styles.finLabel}>{label}</span>
    </div>
  )
}

function SessionRow({
  session, sessionNumber, expanded, onToggle, onEdit,
}: {
  session: Session
  sessionNumber: number
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const color = SESSION_STATUS_COLOR[session.status] ?? 'var(--text3)'
  const label = SESSION_STATUS_LABEL[session.status] ?? session.status

  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionCardHeader} onClick={onToggle}>
        <div className={styles.sessionCardLeft}>
          <span className={styles.sessionDate}>
            {format(parseISO(session.date), "d MMM yyyy", { locale: ptBR })} · {session.time}
          </span>
          <div className={styles.sessionCardMeta}>
            {session.status === 'realizada' && (
              <span className={styles.sessionNum}>Sessão #{sessionNumber}</span>
            )}
            <span style={{ color, display:'flex', alignItems:'center', gap:3, fontSize:12, fontWeight:500 }}>
              {session.status === 'realizada'
                ? <CheckCircle2 size={12}/>
                : session.status === 'falta' || session.status === 'cancelada'
                ? <XCircle size={12}/>
                : <Clock size={12}/>
              }
              {label}
            </span>
            {session.modality === 'online'
              ? <span className={styles.modalChip}><Video size={11}/> Online</span>
              : <span className={styles.modalChip}><MapPin size={11}/> Presencial</span>
            }
            {session.paid
              ? <span style={{ fontSize:11, color:'var(--green)', display:'flex', alignItems:'center', gap:3 }}>
                  <CheckCircle2 size={10}/> Pago
                </span>
              : session.status === 'realizada'
              ? <span style={{ fontSize:11, color:'var(--amber)', display:'flex', alignItems:'center', gap:3 }}>
                  <Clock size={10}/> Pendente
                </span>
              : null
            }
          </div>
        </div>
        <div className={styles.sessionCardRight}>
          <span className={styles.sessionValue}>{session.value > 0 ? `R$ ${session.value}` : ''}</span>
          <button className={styles.editBtn} onClick={e => { e.stopPropagation(); onEdit() }}>
            <Edit2 size={13}/>
          </button>
          {expanded ? <ChevronUp size={15} style={{ color: 'var(--text3)' }}/> : <ChevronDown size={15} style={{ color: 'var(--text3)' }}/>}
        </div>
      </div>

      {expanded && (
        <div className={styles.sessionCardBody}>
          {session.demands && (
            <Note label="Demanda / Queixa" text={session.demands}/>
          )}
          {session.mood && (
            <Note label="Estado emocional" text={session.mood}/>
          )}
          {session.interventions && (
            <Note label="Intervenções" text={session.interventions}/>
          )}
          {session.clinicalNotes && (
            <Note label="Notas clínicas" text={session.clinicalNotes}/>
          )}
          {session.nextGoals && (
            <Note label="Próximos objetivos" text={session.nextGoals}/>
          )}
          {session.evolution && (
            <Note label="Evolução" text={session.evolution}/>
          )}
          {!session.demands && !session.clinicalNotes && !session.interventions && (
            <p className={styles.noNotes}>Nenhuma nota clínica registrada.</p>
          )}
        </div>
      )}
    </div>
  )
}

function Note({ label, text }: { label: string; text: string }) {
  return (
    <div className={styles.note}>
      <span className={styles.noteLabel}>{label}</span>
      <p className={styles.noteText}>{text}</p>
    </div>
  )
}
