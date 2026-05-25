import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Users, ChevronRight, X,
  Phone, Mail, Calendar, CircleDot,
} from 'lucide-react'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePsicoStore } from '../store/store'
import type { PatientStatus } from '../types'
import styles from './PatientsPage.module.css'

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().min(10, 'Telefone obrigatório'),
  email:     z.string().email('E-mail inválido').or(z.literal('')),
  birthDate: z.string().optional(),
  startDate: z.string().min(1, 'Data de início obrigatória'),
  accessCode:z.string().min(4, 'Mínimo 4 caracteres').or(z.literal('')),
  notes:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<PatientStatus, string> = {
  ativo:      'Ativo',
  encerrado:  'Encerrado',
  pausado:    'Pausado',
}
const STATUS_COLOR: Record<PatientStatus, string> = {
  ativo:     'var(--green)',
  encerrado: 'var(--red)',
  pausado:   'var(--amber)',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function age(birthDate?: string): string {
  if (!birthDate) return '—'
  const years = differenceInYears(new Date(), parseISO(birthDate))
  return `${years} anos`
}

// ── Component ──────────────────────────────────────────────────────────────
export function PatientsPage() {
  const navigate   = useNavigate()
  const patients   = usePsicoStore(s => s.patients)
  const addPatient = usePsicoStore(s => s.addPatient)

  const [search,       setSearch]  = useState('')
  const [filterStatus, setFilter]  = useState<PatientStatus | 'all'>('all')
  const [showModal,    setShowModal] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      email: '',
      accessCode: '',
    },
  })

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return patients
      .filter(p => {
        if (filterStatus !== 'all' && p.status !== filterStatus) return false
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.accessCode?.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [patients, search, filterStatus])

  // ── Submit ───────────────────────────────────────────────────────────────
  function onSubmit(data: FormData) {
    const id = addPatient({
      name:       data.name,
      phone:      data.phone,
      email:      data.email || undefined,
      birthDate:  data.birthDate || undefined,
      startDate:  data.startDate,
      accessCode: data.accessCode ? data.accessCode.toUpperCase() : undefined,
      notes:      data.notes || undefined,
      status:     'ativo',
    })
    reset()
    setShowModal(false)
    navigate(`/admin/pacientes/${id}`)
  }

  // ── Counts ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:      patients.length,
    ativo:    patients.filter(p => p.status === 'ativo').length,
    pausado:  patients.filter(p => p.status === 'pausado').length,
    encerrado:patients.filter(p => p.status === 'encerrado').length,
  }), [patients])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pacientes</h1>
          <p className={styles.sub}>{counts.ativo} ativo{counts.ativo !== 1 ? 's' : ''} · {counts.all} total</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          <Plus size={16}/> Novo paciente
        </button>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon}/>
          <input
            className={styles.searchInput}
            placeholder="Buscar por nome, telefone ou código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {(['all', 'ativo', 'pausado', 'encerrado'] as const).map(s => (
            <button
              key={s}
              className={`${styles.filterBtn} ${filterStatus === s ? styles.filterActive : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
              <span className={styles.filterCount}>
                {s === 'all' ? counts.all : counts[s]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Users size={36} strokeWidth={1.2} style={{ color: 'var(--text3)' }}/>
          <p>{search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}</p>
          {!search && (
            <button className={styles.btnGhost} onClick={() => setShowModal(true)}>
              <Plus size={14}/> Cadastrar primeiro paciente
            </button>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(p => (
            <div
              key={p.id}
              className={styles.row}
              onClick={() => navigate(`/admin/pacientes/${p.id}`)}
            >
              <div className={styles.avatar}>{initials(p.name)}</div>
              <div className={styles.info}>
                <span className={styles.name}>{p.name}</span>
                <div className={styles.meta}>
                  {p.birthDate && (
                    <span><Calendar size={11}/> {age(p.birthDate)}</span>
                  )}
                  <span><Phone size={11}/> {p.phone}</span>
                  {p.email && <span><Mail size={11}/> {p.email}</span>}
                </div>
              </div>
              <div className={styles.rowRight}>
                {p.accessCode && (
                  <span className={styles.code}>{p.accessCode}</span>
                )}
                <span
                  className={styles.status}
                  style={{ color: STATUS_COLOR[p.status] }}
                >
                  <CircleDot size={10}/>
                  {STATUS_LABELS[p.status]}
                </span>
                <span className={styles.startDate}>
                  desde {format(parseISO(p.startDate), "MMM/yy", { locale: ptBR })}
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text3)' }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: novo paciente ─────────────────────────────────────────── */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Novo paciente</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.formGrid}>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Nome completo *</label>
                  <input
                    {...register('name')}
                    placeholder="Nome da paciente"
                    className={errors.name ? styles.inputError : ''}
                  />
                  {errors.name && <span className={styles.errMsg}>{errors.name.message}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Telefone / WhatsApp *</label>
                  <input
                    {...register('phone')}
                    placeholder="(11) 99999-9999"
                    className={errors.phone ? styles.inputError : ''}
                  />
                  {errors.phone && <span className={styles.errMsg}>{errors.phone.message}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>E-mail</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="email@exemplo.com"
                    className={errors.email ? styles.inputError : ''}
                  />
                  {errors.email && <span className={styles.errMsg}>{errors.email.message}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Data de nascimento</label>
                  <input {...register('birthDate')} type="date"/>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Início do acompanhamento *</label>
                  <input
                    {...register('startDate')}
                    type="date"
                    className={errors.startDate ? styles.inputError : ''}
                  />
                  {errors.startDate && <span className={styles.errMsg}>{errors.startDate.message}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Código do portal (paciente)</label>
                  <input
                    {...register('accessCode')}
                    placeholder="Ex: MARIA2024"
                    style={{ textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em' }}
                    className={errors.accessCode ? styles.inputError : ''}
                    onChange={e => {
                      e.target.value = e.target.value.toUpperCase()
                    }}
                  />
                  <span className={styles.hint}>Código para acesso ao portal da paciente</span>
                  {errors.accessCode && <span className={styles.errMsg}>{errors.accessCode.message}</span>}
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Observações iniciais</label>
                  <textarea {...register('notes')} placeholder="Demanda inicial, encaminhamento, etc."/>
                </div>

              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnCancel} onClick={() => { reset(); setShowModal(false) }}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                  Cadastrar paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
