import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft, Phone, Mail, Calendar, MapPin, User,
  Plus, Edit2, CheckCircle2, XCircle, Clock, Video,
  FileText, ChevronDown, ChevronUp, Banknote, Wifi,
  CircleDot, AlertTriangle, Download, Paperclip, Save, X,
} from 'lucide-react'
import { usePsicoStore } from '../store/store'
import type { PatientStatus, Session, Patient, ClinicConfig } from '../types'
import { generateEvolutionReport, generateReferralReport, generateSessionPDF } from '../utils/pdfGenerator'
import { AnamneseTab } from './AnamneseTab'
import { PlanoTab } from './PlanoTab'
import { AttachmentsTab } from './AttachmentsTab'
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

type TabId = 'resumo' | 'anamnese' | 'sessoes' | 'plano' | 'anexos' | 'financeiro'

// ── Component ──────────────────────────────────────────────────────────────
export function PatientProfile() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const patients    = usePsicoStore(s => s.patients)
  const sessions    = usePsicoStore(s => s.sessions)
  const anamneses   = usePsicoStore(s => s.anamneses)
  const plans       = usePsicoStore(s => s.plans)
  const attachments = usePsicoStore(s => s.attachments)
  const config      = usePsicoStore(s => s.config)
  const setStatus   = usePsicoStore(s => s.setStatus)
  const editSession = usePsicoStore(s => s.editSession)

  const patient = patients.find(p => p.id === id)
  const [activeTab, setActiveTab] = useState<TabId>('resumo')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  // ── Patient sessions sorted oldest → newest (cronológico) ────────────────
  const patientSessions = useMemo(() =>
    sessions
      .filter(s => s.patientId === id)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [sessions, id]
  )

  // ── Mapa de número sequencial para sessões realizadas ────────────────────
  const sessionNumberMap = useMemo(() => {
    const map: Record<string, number> = {}
    let num = 0
    patientSessions.forEach(s => {
      if (s.status === 'realizada') {
        num++
        map[s.id] = num
      }
    })
    return map
  }, [patientSessions])

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const realizadas  = patientSessions.filter(s => s.status === 'realizada')
    const totalPago   = realizadas.reduce((a, s) => a + (s.paid ? s.value : 0), 0)
    const totalPend   = realizadas.reduce((a, s) => a + (!s.paid ? s.value : 0), 0)
    const faltas      = patientSessions.filter(s => s.status === 'falta').length
    const lastSession = realizadas[realizadas.length - 1]
    const daysSince   = lastSession
      ? differenceInDays(new Date(), parseISO(lastSession.date))
      : null
    return { total: patientSessions.length, realizadas: realizadas.length, faltas, totalPago, totalPend, daysSince }
  }, [patientSessions])

  const anamnese       = anamneses.find(a => a.patientId === id)
  const plano          = plans.find(p => p.patientId === id)
  const patientFiles   = attachments.filter(a => a.patientId === id)

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

  // ── PDF actions ──────────────────────────────────────────────────────────
  function handleEvolutionPDF() {
    if (!patient) return
    const realizadas = patientSessions.filter(s => s.status === 'realizada')
    generateEvolutionReport(patient, realizadas, config)
  }
  function handleReferralPDF() {
    if (!patient) return
    generateReferralReport(patient, anamnese, plano, patientSessions, config)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── Back + actions ──────────────────────────────────────────────── */}
      <div className={styles.topRow}>
        <button className={styles.btnBack} onClick={() => navigate('/admin/pacientes')}>
          <ArrowLeft size={15}/> Pacientes
        </button>
        <div className={styles.actions}>
          <div className={styles.pdfGroup}>
            <button className={styles.btnPdf} onClick={handleEvolutionPDF} title="Relatório de evolução">
              <Download size={14}/> Evolução
            </button>
            <button className={styles.btnPdf} onClick={handleReferralPDF} title="Relatório de encaminhamento">
              <FileText size={14}/> Encaminhamento
            </button>
          </div>
          <select
            className={styles.statusSelect}
            value={patient.status}
            onChange={e => {
              const s = e.target.value as PatientStatus
              setStatus(patient.id, s)
              toast.success(`Status atualizado para ${s === 'ativo' ? 'Ativo' : s === 'pausado' ? 'Pausado' : 'Encerrado'}`)
            }}
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
        <div className={styles.statItem}>
          <span className={styles.statVal} style={{
            color: stats.daysSince === null ? 'var(--text3)'
              : stats.daysSince > 30 ? 'var(--amber)'
              : 'var(--text)',
          }}>
            {stats.daysSince === null ? '—'
              : stats.daysSince === 0 ? 'Hoje'
              : `${stats.daysSince}d`}
          </span>
          <span className={styles.statLabel}>Última sessão</span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className={styles.tabsWrap}>
        <div className={styles.tabs}>
          <TabBtn id="resumo"    label="Resumo"    active={activeTab} onClick={setActiveTab}/>
          <TabBtn id="anamnese"  label="Anamnese"  active={activeTab} onClick={setActiveTab}/>
          <TabBtn id="sessoes"   label="Sessões"   active={activeTab} onClick={setActiveTab} badge={stats.total}/>
          <TabBtn id="plano"     label="Plano"     active={activeTab} onClick={setActiveTab}/>
          <TabBtn id="anexos"    label="Anexos"    active={activeTab} onClick={setActiveTab} badge={patientFiles.length}/>
          <TabBtn id="financeiro" label="Financeiro" active={activeTab} onClick={setActiveTab}/>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className={styles.tabContent}>

        {/* ── Tab: Resumo ───────────────────────────────────────────────── */}
        {activeTab === 'resumo' && (
          <div className={styles.resumeGrid}>
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

            {anamnese?.queixaPrincipal && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}><FileText size={14}/> Queixa principal</h3>
                <p className={styles.notesText}>{anamnese.queixaPrincipal}</p>
                {anamnese.hipotesesDiagnosticas && (
                  <>
                    <h4 className={styles.subTitle}>Hipóteses diagnósticas</h4>
                    <p className={styles.notesText}>{anamnese.hipotesesDiagnosticas}</p>
                  </>
                )}
                {anamnese.cid10 && (
                  <>
                    <h4 className={styles.subTitle}>CID-10</h4>
                    <p className={styles.notesText}>{anamnese.cid10}</p>
                  </>
                )}
              </div>
            )}

            {plano?.objetivos && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}><CheckCircle2 size={14}/> Objetivos terapêuticos</h3>
                <p className={styles.notesText}>{plano.objetivos}</p>
                {plano.modalidadeTratamento && (
                  <>
                    <h4 className={styles.subTitle}>Modalidade</h4>
                    <p className={styles.notesText}>{plano.modalidadeTratamento}</p>
                  </>
                )}
                {plano.frequenciaSessoes && (
                  <>
                    <h4 className={styles.subTitle}>Frequência</h4>
                    <p className={styles.notesText}>{plano.frequenciaSessoes}</p>
                  </>
                )}
              </div>
            )}

            {patient.notes && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}><FileText size={14}/> Observações</h3>
                <p className={styles.notesText}>{patient.notes}</p>
              </div>
            )}

            {patientFiles.length > 0 && (
              <div className={styles.card} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('anexos')}>
                <h3 className={styles.cardTitle}><Paperclip size={14}/> Anexos</h3>
                <p className={styles.hint}>{patientFiles.length} arquivo{patientFiles.length !== 1 ? 's' : ''} anexado{patientFiles.length !== 1 ? 's' : ''}. Clique para visualizar.</p>
              </div>
            )}

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

        {/* ── Tab: Anamnese ─────────────────────────────────────────────── */}
        {activeTab === 'anamnese' && id && (
          <AnamneseTab patientId={id}/>
        )}

        {/* ── Tab: Sessões ──────────────────────────────────────────────── */}
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
              <>
                <div className={styles.sessionListHeader}>
                  <span className={styles.sessionListCount}>
                    {patientSessions.length} sessão{patientSessions.length !== 1 ? 'ões' : ''} · {stats.realizadas} realizada{stats.realizadas !== 1 ? 's' : ''}
                  </span>
                  <button
                    className={styles.btnPdfSm}
                    onClick={handleEvolutionPDF}
                    title="Exportar histórico completo em PDF"
                  >
                    <Download size={13}/> PDF histórico completo
                  </button>
                </div>
                <div className={styles.sessionList}>
                  {patientSessions.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      sessionNumber={sessionNumberMap[s.id] ?? 0}
                      expanded={expandedSession === s.id}
                      onToggle={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                      onEdit={() => navigate(`/admin/sessoes/${s.id}/editar`)}
                      onEditNotes={(sid, patch) => editSession(sid, patch)}
                      patient={patient}
                      config={config}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab: Plano ────────────────────────────────────────────────── */}
        {activeTab === 'plano' && id && (
          <PlanoTab patientId={id}/>
        )}

        {/* ── Tab: Anexos ───────────────────────────────────────────────── */}
        {activeTab === 'anexos' && id && (
          <AttachmentsTab patientId={id}/>
        )}

        {/* ── Tab: Financeiro ───────────────────────────────────────────── */}
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
                      .slice()
                      .reverse()
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
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────
function TabBtn({
  id, label, active, onClick, badge,
}: {
  id: TabId
  label: string
  active: TabId
  onClick: (id: TabId) => void
  badge?: number
}) {
  return (
    <button
      className={`${styles.tab} ${active === id ? styles.tabActive : ''}`}
      onClick={() => onClick(id)}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={styles.tabBadge}>{badge}</span>
      )}
    </button>
  )
}

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

// ── SessionRow ─────────────────────────────────────────────────────────────
type NotesDraft = {
  mood:             string
  demands:          string
  descricaoDemanda: string
  resumoSessao:     string
  interventions:    string
  evolution:        string
  clinicalNotes:    string
  nextGoals:        string
  observacoes:      string
}

function sessionToDraft(s: Session): NotesDraft {
  return {
    mood:             s.mood             ?? '',
    demands:          s.demands          ?? '',
    descricaoDemanda: s.descricaoDemanda ?? '',
    resumoSessao:     s.resumoSessao     ?? '',
    interventions:    s.interventions    ?? '',
    evolution:        s.evolution        ?? '',
    clinicalNotes:    s.clinicalNotes    ?? '',
    nextGoals:        s.nextGoals        ?? '',
    observacoes:      s.observacoes      ?? '',
  }
}

function SessionRow({
  session, sessionNumber, expanded, onToggle, onEdit, onEditNotes, patient, config,
}: {
  session:       Session
  sessionNumber: number
  expanded:      boolean
  onToggle:      () => void
  onEdit:        () => void
  onEditNotes:   (id: string, patch: Partial<Session>) => void
  patient:       Patient
  config:        ClinicConfig
}) {
  const color = SESSION_STATUS_COLOR[session.status] ?? 'var(--text3)'
  const label = SESSION_STATUS_LABEL[session.status] ?? session.status

  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<NotesDraft>(() => sessionToDraft(session))

  useEffect(() => {
    setDraft(sessionToDraft(session))
    setEditing(false)
  }, [session.id])

  function handleSave() {
    onEditNotes(session.id, {
      mood:             draft.mood             || undefined,
      demands:          draft.demands          || undefined,
      descricaoDemanda: draft.descricaoDemanda || undefined,
      resumoSessao:     draft.resumoSessao     || undefined,
      interventions:    draft.interventions    || undefined,
      evolution:        draft.evolution        || undefined,
      clinicalNotes:    draft.clinicalNotes    || undefined,
      nextGoals:        draft.nextGoals        || undefined,
      observacoes:      draft.observacoes      || undefined,
    })
    setEditing(false)
  }

  function handleCancel() {
    setDraft(sessionToDraft(session))
    setEditing(false)
  }

  function handlePDF(e: React.MouseEvent) {
    e.stopPropagation()
    generateSessionPDF(patient, session, sessionNumber, config)
  }

  const hasNotes = !!(
    session.mood || session.demands || session.descricaoDemanda ||
    session.resumoSessao || session.interventions || session.evolution ||
    session.clinicalNotes || session.nextGoals || session.observacoes
  )

  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionCardHeader} onClick={onToggle}>
        <div className={styles.sessionCardLeft}>
          <span className={styles.sessionDate}>
            {format(parseISO(session.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })} · {session.time}
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
            {hasNotes && !expanded && (
              <span className={styles.notesDot} title="Possui anotações clínicas"/>
            )}
          </div>
        </div>
        <div className={styles.sessionCardRight}>
          <span className={styles.sessionValue}>{session.value > 0 ? `R$ ${session.value}` : ''}</span>
          <button className={styles.editBtn} title="Editar dados da sessão" onClick={e => { e.stopPropagation(); onEdit() }}>
            <Edit2 size={13}/>
          </button>
          {expanded ? <ChevronUp size={15} style={{ color: 'var(--text3)' }}/> : <ChevronDown size={15} style={{ color: 'var(--text3)' }}/>}
        </div>
      </div>

      {expanded && (
        <div className={styles.sessionCardBody}>
          {/* ── Ações do corpo ────────────────────────────────────────── */}
          <div className={styles.sessionBodyActions}>
            {session.status === 'realizada' && !editing && (
              <button
                className={styles.btnEditNotes}
                onClick={() => setEditing(true)}
              >
                <Edit2 size={13}/> {hasNotes ? 'Editar registro clínico' : 'Adicionar registro clínico'}
              </button>
            )}
            {session.status === 'realizada' && (
              <button className={styles.btnPdfSession} onClick={handlePDF}>
                <Download size={13}/> PDF desta sessão
              </button>
            )}
          </div>

          {/* ── Modo edição ───────────────────────────────────────────── */}
          {editing ? (
            <div className={styles.notesEditor}>
              <NoteField
                label="Humor percebido"
                value={draft.mood}
                onChange={v => setDraft(d => ({ ...d, mood: v }))}
                placeholder="Como o paciente se apresentou emocionalmente..."
                rows={2}
              />
              <NoteField
                label="Demanda trazida pelo paciente"
                value={draft.demands}
                onChange={v => setDraft(d => ({ ...d, demands: v }))}
                placeholder="O que o paciente trouxe nesta sessão..."
                rows={2}
              />
              <NoteField
                label="Descrição detalhada da demanda"
                value={draft.descricaoDemanda}
                onChange={v => setDraft(d => ({ ...d, descricaoDemanda: v }))}
                placeholder="Contexto e detalhes relevantes da demanda..."
                rows={3}
              />
              <NoteField
                label="Resumo da sessão"
                value={draft.resumoSessao}
                onChange={v => setDraft(d => ({ ...d, resumoSessao: v }))}
                placeholder="Síntese do que foi trabalhado, temas e insights..."
                rows={4}
              />
              <NoteField
                label="Intervenção realizada"
                value={draft.interventions}
                onChange={v => setDraft(d => ({ ...d, interventions: v }))}
                placeholder="Técnicas e abordagens utilizadas..."
                rows={3}
              />
              <NoteField
                label="Evolução / Observações clínicas"
                value={draft.evolution}
                onChange={v => setDraft(d => ({ ...d, evolution: v }))}
                placeholder="Progresso e observações clínicas relevantes..."
                rows={3}
              />
              <NoteField
                label="Notas clínicas"
                value={draft.clinicalNotes}
                onChange={v => setDraft(d => ({ ...d, clinicalNotes: v }))}
                placeholder="Hipóteses, reflexões, pontos de atenção..."
                rows={3}
              />
              <NoteField
                label="Encaminhamentos / Combinados para próxima sessão"
                value={draft.nextGoals}
                onChange={v => setDraft(d => ({ ...d, nextGoals: v }))}
                placeholder="O que foi combinado, tarefas, focos para o próximo encontro..."
                rows={2}
              />
              <NoteField
                label="Observações gerais"
                value={draft.observacoes}
                onChange={v => setDraft(d => ({ ...d, observacoes: v }))}
                placeholder="Outras observações relevantes..."
                rows={2}
              />
              <div className={styles.editorActions}>
                <button className={styles.btnCancelEdit} onClick={handleCancel}>
                  <X size={13}/> Cancelar
                </button>
                <button className={styles.btnSaveNotes} onClick={handleSave}>
                  <Save size={13}/> Salvar registro
                </button>
              </div>
            </div>
          ) : (
            /* ── Modo leitura ─────────────────────────────────────────── */
            <div className={styles.notesReadView}>
              {hasNotes ? (
                <>
                  {session.mood             && <Note label="Humor percebido"                              text={session.mood}/>}
                  {session.demands          && <Note label="Demanda trazida"                              text={session.demands}/>}
                  {session.descricaoDemanda && <Note label="Descrição da demanda"                         text={session.descricaoDemanda}/>}
                  {session.resumoSessao     && <Note label="Resumo da sessão"                             text={session.resumoSessao}/>}
                  {session.interventions    && <Note label="Intervenção realizada"                        text={session.interventions}/>}
                  {session.evolution        && <Note label="Evolução / Observações clínicas"              text={session.evolution}/>}
                  {session.clinicalNotes    && <Note label="Notas clínicas"                               text={session.clinicalNotes}/>}
                  {session.nextGoals        && <Note label="Encaminhamentos / Combinados"                 text={session.nextGoals}/>}
                  {session.observacoes      && <Note label="Observações gerais"                           text={session.observacoes}/>}
                </>
              ) : (
                <p className={styles.noNotes}>
                  {session.status === 'realizada'
                    ? 'Nenhuma nota clínica registrada. Clique em "Adicionar registro clínico" para preencher.'
                    : 'Registro clínico disponível apenas para sessões realizadas.'
                  }
                </p>
              )}
              {session.cancelReason && (
                <Note label="Motivo do cancelamento / remarcação" text={session.cancelReason}/>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NoteField({
  label, value, onChange, placeholder, rows,
}: {
  label:       string
  value:       string
  onChange:    (v: string) => void
  placeholder: string
  rows:        number
}) {
  return (
    <div className={styles.editorField}>
      <label className={styles.editorLabel}>{label}</label>
      <textarea
        className={styles.editorTextarea}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
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
