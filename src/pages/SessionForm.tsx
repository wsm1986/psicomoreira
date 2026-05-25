// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './SessionForm.module.css'

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  patientId:     z.string().min(1, 'Selecione uma paciente'),
  date:          z.string().min(1, 'Data obrigatória'),
  time:          z.string().min(1, 'Horário obrigatório'),
  duration:      z.coerce.number().min(1),
  status:        z.enum(['agendada', 'realizada', 'falta', 'cancelada', 'remarcada']),
  modality:      z.enum(['presencial', 'online']),
  value:         z.coerce.number().min(0),
  paid:          z.boolean(),
  paymentMethod: z.enum(['pix', 'dinheiro', 'cartao', 'boleto', 'plano']).optional(),
  // Clinical notes
  demands:       z.string().optional(),
  mood:          z.string().optional(),
  interventions: z.string().optional(),
  clinicalNotes: z.string().optional(),
  nextGoals:     z.string().optional(),
  evolution:     z.string().optional(),
  cancelReason:  z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Component ──────────────────────────────────────────────────────────────
export function SessionForm() {
  const { id }           = useParams()
  const [searchParams]   = useSearchParams()
  const navigate         = useNavigate()
  const isEdit           = Boolean(id)

  const patients     = usePsicoStore(s => s.patients)
  const sessions     = usePsicoStore(s => s.sessions)
  const addSession   = usePsicoStore(s => s.addSession)
  const editSession  = usePsicoStore(s => s.editSession)
  const deleteSession= usePsicoStore(s => s.deleteSession)
  const config       = usePsicoStore(s => s.config)

  const existing = isEdit ? sessions.find(s => s.id === id) : undefined
  const prePatient = searchParams.get('paciente') ?? ''

  const activePatients = patients.filter(p => p.status === 'ativo')

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: existing
      ? {
          patientId:     existing.patientId,
          date:          existing.date,
          time:          existing.time,
          duration:      existing.duration,
          status:        existing.status,
          modality:      existing.modality,
          value:         existing.value,
          paid:          existing.paid,
          paymentMethod: existing.paymentMethod,
          demands:       existing.demands ?? '',
          mood:          existing.mood ?? '',
          interventions: existing.interventions ?? '',
          clinicalNotes: existing.clinicalNotes ?? '',
          nextGoals:     existing.nextGoals ?? '',
          evolution:     existing.evolution ?? '',
          cancelReason:  existing.cancelReason ?? '',
        }
      : {
          patientId:  prePatient,
          date:       format(new Date(), 'yyyy-MM-dd'),
          time:       '09:00',
          duration:   config.sessionDuration,
          status:     'agendada',
          modality:   'presencial',
          value:      config.sessionValue,
          paid:       false,
        },
  })

  const status   = watch('status')
  const patientId= watch('patientId')
  const patient  = patients.find(p => p.id === patientId)

  // Re-fill if navigating to edit different session
  useEffect(() => {
    if (existing) reset({
      patientId:     existing.patientId,
      date:          existing.date,
      time:          existing.time,
      duration:      existing.duration,
      status:        existing.status,
      modality:      existing.modality,
      value:         existing.value,
      paid:          existing.paid,
      paymentMethod: existing.paymentMethod,
      demands:       existing.demands ?? '',
      mood:          existing.mood ?? '',
      interventions: existing.interventions ?? '',
      clinicalNotes: existing.clinicalNotes ?? '',
      nextGoals:     existing.nextGoals ?? '',
      evolution:     existing.evolution ?? '',
      cancelReason:  existing.cancelReason ?? '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function onSubmit(data: FormData) {
    const payload = {
      patientId:     data.patientId,
      date:          data.date,
      time:          data.time,
      duration:      data.duration,
      status:        data.status,
      modality:      data.modality,
      value:         data.value,
      paid:          data.paid,
      paymentMethod: data.paymentMethod,
      demands:       data.demands || undefined,
      mood:          data.mood || undefined,
      interventions: data.interventions || undefined,
      clinicalNotes: data.clinicalNotes || undefined,
      nextGoals:     data.nextGoals || undefined,
      evolution:     data.evolution || undefined,
      cancelReason:  data.cancelReason || undefined,
    }

    if (isEdit && id) {
      editSession(id, payload)
      navigate(patient ? `/admin/pacientes/${data.patientId}` : '/admin/agenda')
    } else {
      addSession(payload)
      navigate(patient ? `/admin/pacientes/${data.patientId}` : '/admin/agenda')
    }
  }

  function handleDelete() {
    if (!id) return
    if (window.confirm('Excluir esta sessão?')) {
      deleteSession(id)
      navigate('/admin/agenda')
    }
  }

  const backPath = patient
    ? `/admin/pacientes/${patient.id}`
    : existing?.patientId
    ? `/admin/pacientes/${existing.patientId}`
    : '/admin/agenda'

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.btnBack} onClick={() => navigate(backPath)}>
          <ArrowLeft size={15}/>
          {patient?.name ?? 'Voltar'}
        </button>
        <div className={styles.headerRight}>
          <h1 className={styles.title}>{isEdit ? 'Editar sessão' : 'Nova sessão'}</h1>
          {isEdit && (
            <button className={styles.btnDelete} onClick={handleDelete} type="button">
              <Trash2 size={14}/>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* ── Section: Dados básicos ──────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dados da sessão</h2>
          <div className={styles.grid}>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Paciente *</label>
              <select {...register('patientId')} className={errors.patientId ? styles.inputError : ''}>
                <option value="">Selecione...</option>
                {activePatients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                {existing && !activePatients.find(p => p.id === existing.patientId) && (
                  <option value={existing.patientId}>
                    {patients.find(p => p.id === existing.patientId)?.name ?? existing.patientId}
                  </option>
                )}
              </select>
              {errors.patientId && <span className={styles.errMsg}>{errors.patientId.message}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Data *</label>
              <input {...register('date')} type="date" className={errors.date ? styles.inputError : ''}/>
              {errors.date && <span className={styles.errMsg}>{errors.date.message}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Horário *</label>
              <input {...register('time')} type="time" className={errors.time ? styles.inputError : ''}/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Duração (min)</label>
              <input {...register('duration')} type="number" min={15} max={180} step={5}/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Status *</label>
              <select {...register('status')}>
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="falta">Falta</option>
                <option value="cancelada">Cancelada</option>
                <option value="remarcada">Remarcada</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Modalidade</label>
              <select {...register('modality')}>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Section: Financeiro ─────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Financeiro</h2>
          <div className={styles.grid}>

            <div className={styles.field}>
              <label className={styles.label}>Valor (R$)</label>
              <input {...register('value')} type="number" min={0} step={10}/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Forma de pagamento</label>
              <select {...register('paymentMethod')}>
                <option value="">—</option>
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="boleto">Boleto</option>
                <option value="plano">Plano/Convênio</option>
              </select>
            </div>

            <div className={`${styles.field} ${styles.checkField}`}>
              <label className={styles.checkLabel}>
                <input {...register('paid')} type="checkbox" className={styles.checkbox}/>
                Pagamento recebido
              </label>
            </div>

          </div>
        </section>

        {/* ── Section: Notas clínicas (só se realizada) ───────────────── */}
        {status === 'realizada' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Prontuário clínico</h2>
            <p className={styles.sectionHint}>Estas informações são confidenciais e não aparecem para a paciente.</p>
            <div className={styles.gridFull}>

              <div className={styles.field}>
                <label className={styles.label}>Demanda / Queixa apresentada</label>
                <textarea {...register('demands')} placeholder="O que a paciente trouxe nesta sessão..."/>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Estado emocional / Humor</label>
                <textarea {...register('mood')} rows={2} placeholder="Como a paciente se apresentou..."/>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Intervenções realizadas</label>
                <textarea {...register('interventions')} placeholder="Técnicas e abordagens utilizadas..."/>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Notas clínicas</label>
                <textarea {...register('clinicalNotes')} rows={4} placeholder="Observações clínicas, hipóteses, reflexões..."/>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Evolução / Progresso</label>
                <textarea {...register('evolution')} rows={2} placeholder="Progresso desde a última sessão..."/>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Objetivos para próxima sessão</label>
                <textarea {...register('nextGoals')} rows={2} placeholder="Focos e planos para a próxima sessão..."/>
              </div>

            </div>
          </section>
        )}

        {/* Cancel/reschedule reason */}
        {(status === 'cancelada' || status === 'remarcada') && (
          <section className={styles.section}>
            <div className={styles.field}>
              <label className={styles.label}>Motivo</label>
              <textarea {...register('cancelReason')} rows={2} placeholder="Motivo do cancelamento / remarcação..."/>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className={styles.formActions}>
          <button type="button" className={styles.btnCancel} onClick={() => navigate(backPath)}>
            Cancelar
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
            {isEdit ? 'Salvar alterações' : 'Registrar sessão'}
          </button>
        </div>
      </form>
    </div>
  )
}
