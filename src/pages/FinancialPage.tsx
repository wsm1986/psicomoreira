import { useState, useMemo } from 'react'
import {
  format, parseISO, startOfMonth, endOfMonth,
  isWithinInterval, subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Clock, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { usePsicoStore } from '../store/store'
import type { PaymentMethod } from '../types'
import styles from './FinancialPage.module.css'

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const METHOD_LABEL: Record<string, string> = {
  pix:      'PIX',
  dinheiro: 'Dinheiro',
  cartao:   'Cartão',
  boleto:   'Boleto',
  plano:    'Plano/Convênio',
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const BAR_W = 42
  const BAR_GAP = 10
  const H = 72

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
          <div key={i} className={styles.chartCol} style={{ width: BAR_W }}>
            <span className={i === data.length - 1 ? styles.chartValActive : styles.chartVal}>
              {d.value > 0 ? fmtBRL(d.value) : '—'}
            </span>
            <span className={i === data.length - 1 ? styles.chartLabelActive : styles.chartLabel}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export function FinancialPage() {
  const patients    = usePsicoStore(s => s.patients)
  const sessions    = usePsicoStore(s => s.sessions)
  const editSession = usePsicoStore(s => s.editSession)

  const [monthOffset, setMonthOffset] = useState(0)
  const [activeTab, setActiveTab]     = useState<'resumo' | 'pendentes'>('resumo')

  // Inline pay: which session is being confirmed + chosen method
  const [payingId,     setPayingId]     = useState<string | null>(null)
  const [payingMethod, setPayingMethod] = useState<PaymentMethod>('pix')

  const refDate    = subMonths(new Date(), -monthOffset)
  const mStart     = startOfMonth(refDate)
  const mEnd       = endOfMonth(refDate)
  const monthLabel = format(refDate, "MMMM 'de' yyyy", { locale: ptBR })

  // ── Month sessions ────────────────────────────────────────────────────────
  const monthSessions = useMemo(() =>
    sessions.filter(s =>
      s.status === 'realizada' &&
      isWithinInterval(parseISO(s.date), { start: mStart, end: mEnd })
    ),
    [sessions, mStart, mEnd]
  )

  const stats = useMemo(() => {
    const total    = monthSessions.reduce((a, s) => a + s.value, 0)
    const recebido = monthSessions.reduce((a, s) => a + (s.paid ? s.value : 0), 0)
    const pendente = monthSessions.reduce((a, s) => a + (!s.paid ? s.value : 0), 0)
    const sessoes  = monthSessions.length
    const pagas    = monthSessions.filter(s => s.paid).length
    return { total, recebido, pendente, sessoes, pagas }
  }, [monthSessions])

  // ── Pending (all time) ────────────────────────────────────────────────────
  const allPending = useMemo(() =>
    sessions
      .filter(s => s.status === 'realizada' && !s.paid)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(s => ({ ...s, patient: patients.find(p => p.id === s.patientId) })),
    [sessions, patients]
  )

  // ── Method breakdown ──────────────────────────────────────────────────────
  const byMethod = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of monthSessions.filter(ss => ss.paid)) {
      const m = s.paymentMethod ?? 'outro'
      map[m] = (map[m] ?? 0) + s.value
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthSessions])

  // ── Receita 6 meses ───────────────────────────────────────────────────────
  const today = new Date()
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

  // ── Ação: confirmar pagamento ─────────────────────────────────────────────
  function confirmPaid(sessionId: string) {
    editSession(sessionId, {
      paid:          true,
      paymentDate:   format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: payingMethod,
    })
    setPayingId(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Financeiro</h1>
          <p className={styles.sub}>Controle de pagamentos e receitas</p>
        </div>
        {allPending.length > 0 && (
          <div className={styles.pendingAlert}>
            <AlertCircle size={14}/>
            {allPending.length} pagamento{allPending.length !== 1 ? 's' : ''} pendente{allPending.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Gráfico 6 meses */}
      {monthlyRevenue.some(d => d.value > 0) && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Receita — últimos 6 meses</h3>
          <div className={styles.chartScrollArea}>
            <RevenueChart data={monthlyRevenue}/>
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={() => setMonthOffset(o => o - 1)}>
          <ChevronLeft size={16}/>
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button
          className={styles.navBtn}
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 0}
        >
          <ChevronRight size={16}/>
        </button>
      </div>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <KpiCard
          icon={<TrendingUp size={18}/>}
          color="var(--green)"
          label="Recebido"
          value={fmtBRL(stats.recebido)}
          sub={`${stats.pagas} sessões pagas`}
        />
        <KpiCard
          icon={<Clock size={18}/>}
          color="var(--amber)"
          label="Pendente"
          value={fmtBRL(stats.pendente)}
          sub={`${stats.sessoes - stats.pagas} sessão pendente`}
        />
        <KpiCard
          icon={<TrendingDown size={18}/>}
          color="var(--blue)"
          label="Total faturado"
          value={fmtBRL(stats.total)}
          sub={`${stats.sessoes} sessões realizadas`}
        />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['resumo', 'pendentes'] as const).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t === 'resumo' ? 'Resumo do mês' : `Pendentes (${allPending.length})`}
          </button>
        ))}
      </div>

      {/* ── Resumo ──────────────────────────────────────────────────────── */}
      {activeTab === 'resumo' && (
        <div className={styles.resumeLayout}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Sessões realizadas</h3>
            {monthSessions.length === 0 ? (
              <p className={styles.empty}>Nenhuma sessão realizada neste mês.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Forma</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSessions
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(s => {
                      const pat = patients.find(p => p.id === s.patientId)
                      return (
                        <tr key={s.id}>
                          <td className={styles.tdName}>{pat?.name ?? '—'}</td>
                          <td>{format(parseISO(s.date), "d/MM/yyyy")}</td>
                          <td>{fmtBRL(s.value)}</td>
                          <td>{s.paymentMethod ? METHOD_LABEL[s.paymentMethod] : '—'}</td>
                          <td>
                            <div className={styles.statusCell}>
                              {s.paid ? (
                                <><CheckCircle2 size={12} style={{color:'var(--green)'}}/> <span style={{color:'var(--green)'}}>Pago</span></>
                              ) : payingId === s.id ? (
                                <div className={styles.payInline}>
                                  <select
                                    className={styles.paySelect}
                                    value={payingMethod}
                                    onChange={e => setPayingMethod(e.target.value as PaymentMethod)}
                                  >
                                    <option value="pix">PIX</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="cartao">Cartão</option>
                                    <option value="boleto">Boleto</option>
                                    <option value="plano">Convênio</option>
                                  </select>
                                  <button className={styles.btnConfirmPay} onClick={() => confirmPaid(s.id)}>
                                    <CheckCircle2 size={13}/> Confirmar
                                  </button>
                                  <button className={styles.btnCancelPay} onClick={() => setPayingId(null)}>
                                    <X size={13}/>
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <Clock size={12} style={{color:'var(--amber)'}}/>
                                  <span style={{color:'var(--amber)'}}>Pendente</span>
                                  <button
                                    className={styles.btnMarkPaid}
                                    onClick={() => { setPayingId(s.id); setPayingMethod('pix') }}
                                  >
                                    Marcar pago
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            )}
          </div>

          {byMethod.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Formas de pagamento</h3>
              <div className={styles.methodList}>
                {byMethod.map(([method, value]) => (
                  <div key={method} className={styles.methodRow}>
                    <span className={styles.methodLabel}>{METHOD_LABEL[method] ?? method}</span>
                    <div className={styles.methodBar}>
                      <div
                        className={styles.methodBarFill}
                        style={{ width: `${(value / stats.recebido) * 100}%` }}
                      />
                    </div>
                    <span className={styles.methodValue}>{fmtBRL(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Pendentes ───────────────────────────────────────────────────── */}
      {activeTab === 'pendentes' && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Todos os pagamentos pendentes</h3>
          {allPending.length === 0 ? (
            <div className={styles.allGood}>
              <CheckCircle2 size={28} style={{ color: 'var(--green)' }}/>
              <p>Tudo em dia! Nenhum pagamento pendente.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Data da sessão</th>
                  <th>Valor</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {allPending.map(s => (
                  <tr key={s.id}>
                    <td className={styles.tdName}>{s.patient?.name ?? '—'}</td>
                    <td>{format(parseISO(s.date), "d/MM/yyyy")}</td>
                    <td>{fmtBRL(s.value)}</td>
                    <td>
                      {payingId === s.id ? (
                        <div className={styles.payInline}>
                          <select
                            className={styles.paySelect}
                            value={payingMethod}
                            onChange={e => setPayingMethod(e.target.value as PaymentMethod)}
                          >
                            <option value="pix">PIX</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="cartao">Cartão</option>
                            <option value="boleto">Boleto</option>
                            <option value="plano">Convênio</option>
                          </select>
                          <button className={styles.btnConfirmPay} onClick={() => confirmPaid(s.id)}>
                            <CheckCircle2 size={13}/> Confirmar
                          </button>
                          <button className={styles.btnCancelPay} onClick={() => setPayingId(null)}>
                            <X size={13}/>
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.btnMarkPaid}
                          onClick={() => { setPayingId(s.id); setPayingMethod('pix') }}
                        >
                          <CheckCircle2 size={12}/> Marcar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── KpiCard ────────────────────────────────────────────────────────────────
function KpiCard({ icon, color, label, value, sub }: {
  icon:  React.ReactNode
  color: string
  label: string
  value: string
  sub:   string
}) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        {icon}
      </div>
      <div>
        <div className={styles.kpiVal}>{value}</div>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiSub}>{sub}</div>
      </div>
    </div>
  )
}
