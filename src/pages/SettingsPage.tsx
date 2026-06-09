import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Save, User, Clock, DollarSign, Shield, Download, Upload, AlertTriangle, CheckCircle2, History, RefreshCw } from 'lucide-react'
import { usePsicoStore, type BackupData } from '../store/store'
import {
  getSnapshots, getBackupMeta, setBackupMeta,
  markFileBackupDone, type Snapshot,
} from '../utils/autoBackup'
import { firebaseEnabled } from '../config/firebase'
import styles from './SettingsPage.module.css'

const schema = z.object({
  clinicName:       z.string().min(2, 'Nome obrigatório'),
  psychologistName: z.string().min(2, 'Nome obrigatório'),
  crp:              z.string().optional(),
  email:            z.string().email('E-mail inválido').or(z.literal('')).optional(),
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
  const config       = usePsicoStore(s => s.config)
  const patients     = usePsicoStore(s => s.patients)
  const sessions     = usePsicoStore(s => s.sessions)
  const documents    = usePsicoStore(s => s.documents)
  const attachments  = usePsicoStore(s => s.attachments)
  const anamneses    = usePsicoStore(s => s.anamneses)
  const plans        = usePsicoStore(s => s.plans)
  const auth                   = usePsicoStore(s => s.auth)
  const editConfig             = usePsicoStore(s => s.editConfig)
  const importBackup           = usePsicoStore(s => s.importBackup)
  const migrateLocalToFirestore= usePsicoStore(s => s.migrateLocalToFirestore)

  const [migrateStatus,  setMigrateStatus]  = useState<'idle' | 'running' | 'ok' | 'error'>('idle')
  const [importStatus,   setImportStatus]   = useState<'idle' | 'ok' | 'error'>('idle')
  const [importMsg,      setImportMsg]      = useState('')
  const [snapshots]      = useState<Snapshot[]>(() => getSnapshots())
  const [backupMeta,     setLocalBackupMeta]= useState(getBackupMeta)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Export JSON ────────────────────────────────────────────────────────────
  function handleExport() {
    const data: BackupData = {
      version:     '1.1',
      exportedAt:  new Date().toISOString(),
      patients,
      sessions,
      documents,
      attachments,
      anamneses,
      plans,
      config,
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `psicomoreira-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    markFileBackupDone()
    setLocalBackupMeta(getBackupMeta())
    editConfig({ lastFileBackupAt: new Date().toISOString() })
  }

  // ── Restaurar snapshot ────────────────────────────────────────────────────
  async function handleRestoreSnapshot(snap: Snapshot) {
    try {
      const data = JSON.parse(snap.data) as BackupData
      if (!data.patients || !data.sessions) throw new Error()
      await importBackup(data)
      setRestoreConfirm(null)
      setImportStatus('ok')
      setImportMsg(`✓ Restaurado: snapshot de ${format(parseISO(snap.savedAt), "d/MM/yyyy 'às' HH:mm", { locale: ptBR })}`)
      toast.success('Backup restaurado com sucesso!')
    } catch {
      setImportStatus('error')
      setImportMsg('Snapshot corrompido. Não foi possível restaurar.')
    }
    setRestoreConfirm(null)
  }

  // ── Frequência do lembrete ────────────────────────────────────────────────
  function handleReminderDays(days: number) {
    setBackupMeta({ reminderDays: days })
    setLocalBackupMeta(getBackupMeta())
  }

  // ── Import JSON ────────────────────────────────────────────────────────────
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as BackupData
        if (!data.patients || !data.sessions) throw new Error('Arquivo inválido')
        await importBackup(data)
        setImportStatus('ok')
        setImportMsg(`✓ Importado: ${data.patients.length} pacientes, ${data.sessions.length} sessões`)
        toast.success(`Importado: ${data.patients.length} pacientes, ${data.sessions.length} sessões`)
      } catch {
        setImportStatus('error')
        setImportMsg('Arquivo inválido ou corrompido.')
      }
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitSuccessful } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      clinicName:       config.clinicName,
      psychologistName: config.psychologistName,
      crp:              config.crp,
      email:            config.email ?? '',
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
      email:            config.email ?? '',
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
      email:            data.email || '',
      phone:            data.phone ?? '',
      address:          data.address || '',
      sessionDuration:  data.sessionDuration,
      sessionValue:     data.sessionValue,
      workingStart:     data.workingStart,
      workingEnd:       data.workingEnd,
    })
    toast.success('Configurações salvas!')
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
              <label className={styles.label}>E-mail de contato</label>
              <input {...register('email')} type="email" placeholder="seu@email.com"
                className={errors.email ? styles.inputError : ''}/>
              {errors.email && <span className={styles.errMsg}>{errors.email.message}</span>}
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

        {/* ── Backup ───────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><Download size={15}/> Backup de dados</h2>
          <p className={styles.sectionDesc}>
            Exporte um arquivo JSON com todos os seus dados (pacientes, sessões, configurações).
            Guarde em local seguro — use para restaurar ou migrar para outro dispositivo.
          </p>

          <div className={styles.backupStats}>
            <div className={styles.backupStat}>
              <span className={styles.backupStatVal}>{patients.length}</span>
              <span className={styles.backupStatLabel}>Pacientes</span>
            </div>
            <div className={styles.backupStat}>
              <span className={styles.backupStatVal}>{sessions.length}</span>
              <span className={styles.backupStatLabel}>Sessões</span>
            </div>
            <div className={styles.backupStat}>
              <span className={styles.backupStatVal}>{documents.length}</span>
              <span className={styles.backupStatLabel}>Documentos</span>
            </div>
          </div>

          <div className={styles.backupActions}>
            <button type="button" className={styles.btnExport} onClick={handleExport}>
              <Download size={15}/> Exportar JSON
            </button>
            <button type="button" className={styles.btnImport} onClick={() => fileRef.current?.click()}>
              <Upload size={15}/> Importar JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>

          {/* Migração para Firebase — só aparece quando Firebase está ativo */}
          {firebaseEnabled && auth.firebaseUid && patients.length > 0 && (
            <div className={styles.migrateBlock}>
              <p className={styles.migrateText}>
                Tem dados locais que ainda não estão na nuvem? Envie tudo para o Firebase agora.
              </p>
              <button
                type="button"
                className={styles.btnMigrate}
                disabled={migrateStatus === 'running'}
                onClick={async () => {
                  setMigrateStatus('running')
                  try {
                    await migrateLocalToFirestore()
                    setMigrateStatus('ok')
                  } catch {
                    setMigrateStatus('error')
                  }
                }}
              >
                {migrateStatus === 'running' ? '⏳ Enviando...'
                  : migrateStatus === 'ok'   ? '✓ Dados enviados para o Firebase'
                  : migrateStatus === 'error' ? '⚠ Erro ao enviar — tente novamente'
                  : '☁ Migrar dados para o Firebase'}
              </button>
            </div>
          )}

          {importStatus !== 'idle' && (
            <div className={`${styles.importMsg} ${importStatus === 'ok' ? styles.importOk : styles.importErr}`}>
              {importStatus === 'ok'
                ? <CheckCircle2 size={14}/>
                : <AlertTriangle size={14}/>
              }
              {importMsg}
            </div>
          )}

          {importStatus === 'ok' && (
            <p className={styles.importNote}>
              ⚠️ Dados importados com sucesso. Por segurança, faça login novamente.
            </p>
          )}
        </section>

        {/* ── Auto-backup ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><History size={15}/> Backup automático</h2>
          <p className={styles.sectionDesc}>
            O sistema salva automaticamente uma cópia dos dados no seu navegador toda vez que você abre o app.
            Essas cópias permitem restaurar uma versão anterior sem precisar de um arquivo externo.
          </p>

          {/* Frequência do lembrete de arquivo */}
          <div className={styles.reminderRow}>
            <span className={styles.reminderLabel}>Lembrar de exportar arquivo a cada:</span>
            <div className={styles.reminderBtns}>
              {([7, 14, 30] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  className={`${styles.reminderBtn} ${backupMeta.reminderDays === d ? styles.reminderBtnActive : ''}`}
                  onClick={() => handleReminderDays(d)}
                >
                  {d === 7 ? '7 dias' : d === 14 ? '14 dias' : '30 dias'}
                </button>
              ))}
            </div>
            {backupMeta.lastFileBackupAt && (
              <span className={styles.lastBackupInfo}>
                Último arquivo: {formatDistanceToNow(parseISO(backupMeta.lastFileBackupAt), { locale: ptBR, addSuffix: true })}
              </span>
            )}
          </div>

          {/* Lista de snapshots */}
          {snapshots.length === 0 ? (
            <p className={styles.snapshotEmpty}>
              Nenhum snapshot automático ainda. Abra o app com dados cadastrados para gerar o primeiro.
            </p>
          ) : (
            <div className={styles.snapshotList}>
              {snapshots.map((snap, idx) => (
                <div key={snap.id} className={styles.snapshotRow}>
                  <div className={styles.snapshotInfo}>
                    <span className={styles.snapshotDate}>
                      {format(parseISO(snap.savedAt), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      {idx === 0 && <span className={styles.snapshotLatest}> · mais recente</span>}
                    </span>
                    <span className={styles.snapshotMeta}>
                      {snap.patientsCount} paciente{snap.patientsCount !== 1 ? 's' : ''} · {snap.sessionsCount} sessão{snap.sessionsCount !== 1 ? 'ões' : ''}
                      {!snap.hasAttachments && snap.patientsCount > 0 && ' · sem anexos'}
                    </span>
                  </div>
                  {restoreConfirm === snap.id ? (
                    <div className={styles.snapshotConfirm}>
                      <span>Restaurar e substituir dados atuais?</span>
                      <button
                        type="button"
                        className={styles.btnConfirmRestore}
                        onClick={() => handleRestoreSnapshot(snap)}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        className={styles.btnCancelRestore}
                        onClick={() => setRestoreConfirm(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnRestore}
                      onClick={() => setRestoreConfirm(snap.id)}
                    >
                      <RefreshCw size={13}/> Restaurar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
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
