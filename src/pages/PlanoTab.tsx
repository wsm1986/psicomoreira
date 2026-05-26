import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Save, Clock } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import type { PlanoTerapeutico } from '../types'
import styles from './PlanoTab.module.css'

type FormData = Omit<PlanoTerapeutico, 'patientId' | 'updatedAt'>

export function PlanoTab({ patientId }: { patientId: string }) {
  const plans      = usePsicoStore(s => s.plans)
  const upsertPlano = usePsicoStore(s => s.upsertPlano)

  const existing = plans.find(p => p.patientId === patientId)
  const [savedAt, setSavedAt] = useState<string | null>(existing?.updatedAt ?? null)
  const [saving,  setSaving]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, watch, reset } = useForm<FormData>({
    defaultValues: {
      objetivos:            existing?.objetivos            ?? '',
      estrategias:          existing?.estrategias          ?? '',
      direcionamentos:      existing?.direcionamentos      ?? '',
      planosPaciente:       existing?.planosPaciente       ?? '',
      modalidadeTratamento: existing?.modalidadeTratamento ?? '',
      frequenciaSessoes:    existing?.frequenciaSessoes    ?? '',
    },
  })

  // Re-populate when patient changes
  useEffect(() => {
    const p = plans.find(x => x.patientId === patientId)
    reset({
      objetivos:            p?.objetivos            ?? '',
      estrategias:          p?.estrategias          ?? '',
      direcionamentos:      p?.direcionamentos      ?? '',
      planosPaciente:       p?.planosPaciente       ?? '',
      modalidadeTratamento: p?.modalidadeTratamento ?? '',
      frequenciaSessoes:    p?.frequenciaSessoes    ?? '',
    })
    setSavedAt(p?.updatedAt ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  // Autosave with 1.5s debounce
  useEffect(() => {
    const sub = watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setSaving(true)
        upsertPlano({ patientId, ...values } as Omit<PlanoTerapeutico, 'updatedAt'>)
        const now = new Date().toISOString()
        setSavedAt(now)
        setTimeout(() => setSaving(false), 500)
      }, 1500)
    })
    return () => {
      sub.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, patientId])

  const savedLabel = savedAt
    ? `Salvo automaticamente ${format(parseISO(savedAt), "d/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
    : 'Não salvo ainda'

  return (
    <div className={styles.page}>
      {/* Autosave indicator */}
      <div className={styles.autosaveBar}>
        {saving
          ? <><Save size={12}/> Salvando...</>
          : <><Clock size={12}/> {savedLabel}</>
        }
      </div>

      {/* Seção 1 – Objetivos e Estratégias */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Plano do Psicólogo</h3>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Objetivos terapêuticos</label>
          <textarea {...register('objetivos')} rows={5}
            placeholder="O que se pretende alcançar com o processo terapêutico, metas de curto e longo prazo..."/>
        </div>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Estratégias e técnicas</label>
          <textarea {...register('estrategias')} rows={5}
            placeholder="Abordagens teóricas, técnicas a serem utilizadas, recursos terapêuticos..."/>
        </div>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Direcionamentos clínicos</label>
          <textarea {...register('direcionamentos')} rows={4}
            placeholder="Encaminhamentos, indicações, observações sobre o manejo clínico..."/>
        </div>
      </div>

      {/* Seção 2 – Plano do paciente + Modalidade */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Plano do Paciente e Parâmetros</h3>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Plano terapêutico do paciente</label>
          <textarea {...register('planosPaciente')} rows={4}
            placeholder="Metas acordadas com o paciente, tarefas, comprometimentos e combinados..."/>
        </div>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Modalidade de tratamento</label>
            <textarea {...register('modalidadeTratamento')} rows={3}
              placeholder="Ex: Terapia Cognitivo-Comportamental, Psicanálise, EMDR, ACT..."/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Frequência das sessões</label>
            <textarea {...register('frequenciaSessoes')} rows={3}
              placeholder="Ex: Semanal, quinzenal, mensal — com justificativa clínica..."/>
          </div>
        </div>
      </div>
    </div>
  )
}
