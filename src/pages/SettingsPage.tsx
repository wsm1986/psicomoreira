import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, User, Clock, DollarSign, Shield } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './SettingsPage.module.css'

const schema = z.object({
  clinicName:       z.string().min(2, 'Nome obrigatório'),
  psychologistName: z.string().min(2, 'Nome obrigatório'),
  crp:              z.string().optional(),
  phone:            z.string().optional(),
  address:          z.string().optional(),
  sessionDuration:  z.coerce.number().min(15).max(180),
  sessionValue:     z.coerce.number().min(0),
  workingStart:     z.string(),
  workingEnd:       z.string(),
})
type FormData = z.infer<typeof schema>

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]

export function SettingsPage() {
  const config     = usePsicoStore(s => s.config)
  const editConfig = usePsicoStore(s => s.editConfig)

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitSuccessful } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      clinicName:       config.clinicName,
      psychologistName: config.psychologistName,
      crp:              config.crp,
      phone:            config.phone,
      address:          config.address ?? '',
      sessionDuration:  config.sessionDuration,
      sessionValue:     config.sessionValue,
      workingStart:     config.workingStart,
      workingEnd:       config.workingEnd,
    },
  })

  // Sync if config changes externally
  useEffect(() => {
    reset({
      clinicName:       config.clinicName,
      psychologistName: config.psychologistName,
      crp:              config.crp,
      phone:            config.phone,
      address:          config.address ?? '',
      sessionDuration:  config.sessionDuration,
      sessionValue:     config.sessionValue,
      workingStart:     config.workingStart,
      workingEnd:       config.workingEnd,
    })
  }, [config, reset])

  const workingDays  = config.workingDays

  function toggleDay(day: number) {
    const updated = workingDays.includes(day)
      ? workingDays.filter(d => d !== day)
      : [...workingDays, day].sort()
    editConfig({ workingDays: updated })
  }

  function onSubmit(data: FormData) {
    editConfig({
      clinicName:       data.clinicName,
      psychologistName: data.psychologistName,
      crp:              data.crp ?? '',
      phone:            data.phone ?? '',
      address:          data.address || undefined,
      sessionDuration:  data.sessionDuration,
      sessionValue:     data.sessionValue,
      workingStart:     data.workingStart,
      workingEnd:       data.workingEnd,
    })
    reset(data) // clear dirty
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Configurações</h1>
          <p className={styles.sub}>Informações da clínica e preferências</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>

        {/* ── Clínica ──────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><User size={15}/> Dados profissionais</h2>
          <div className={styles.grid}>

            <div className={styles.field}>
              <label className={styles.label}>Nome da clínica / marca</label>
              <input {...register('clinicName')} className={errors.clinicName ? styles.inputError : ''}/>
              {errors.clinicName && <span className={styles.errMsg}>{errors.clinicName.message}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Nome da psicóloga</label>
              <input {...register('psychologistName')} className={errors.psychologistName ? styles.inputError : ''}/>
              {errors.psychologistName && <span className={styles.errMsg}>{errors.psychologistName.message}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>CRP</label>
              <input {...register('crp')} placeholder="06/12345"/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Telefone de contato</label>
              <input {...register('phone')} placeholder="(11) 99999-9999"/>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Endereço</label>
              <input {...register('address')} placeholder="Rua, número, cidade..."/>
            </div>

          </div>
        </section>

        {/* ── Sessão ───────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><Clock size={15}/> Padrões de atendimento</h2>
          <div className={styles.grid}>

            <div className={styles.field}>
              <label className={styles.label}>Duração padrão da sessão (min)</label>
              <input {...register('sessionDuration')} type="number" min={15} max={180} step={5}/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}><DollarSign size={12}/> Valor padrão (R$)</label>
              <input {...register('sessionValue')} type="number" min={0} step={10}/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Início do expediente</label>
              <input {...register('workingStart')} type="time"/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Fim do expediente</label>
              <input {...register('workingEnd')} type="time"/>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Dias de atendimento</label>
              <div className={styles.dayPicker}>
                {DAYS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    className={`${styles.dayBtn} ${workingDays.includes(d.value) ? styles.dayBtnActive : ''}`}
                    onClick={() => toggleDay(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ── LGPD ─────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><Shield size={15}/> Privacidade e LGPD</h2>
          <div className={styles.lgpdBox}>
            <p>Este sistema armazena dados sensíveis de saúde conforme a <strong>LGPD (Lei 13.709/2018)</strong>.</p>
            <ul>
              <li>Todos os dados são armazenados localmente no seu dispositivo</li>
              <li>Nenhuma informação é enviada para servidores externos</li>
              <li>O acesso da paciente ao portal é protegido por código individual</li>
              <li>Notas clínicas nunca são exibidas para a paciente</li>
            </ul>
          </div>
        </section>

        {/* ── Save ─────────────────────────────────────────────────────── */}
        <div className={styles.formActions}>
          {isSubmitSuccessful && !isDirty && (
            <span className={styles.savedMsg}>✓ Configurações salvas</span>
          )}
          <button type="submit" className={styles.btnSubmit} disabled={!isDirty}>
            <Save size={15}/> Salvar configurações
          </button>
        </div>

      </form>
    </div>
  )
}
