import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Save, Clock } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import type { Anamnese } from '../types'
import styles from './AnamneseTab.module.css'

type FormData = Omit<Anamnese, 'patientId' | 'updatedAt'>

export function AnamneseTab({ patientId }: { patientId: string }) {
  const anamneses      = usePsicoStore(s => s.anamneses)
  const upsertAnamnese = usePsicoStore(s => s.upsertAnamnese)

  const existing = anamneses.find(a => a.patientId === patientId)
  const [savedAt,  setSavedAt]  = useState<string | null>(existing?.updatedAt ?? null)
  const [saving,   setSaving]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, watch, reset } = useForm<FormData>({
    defaultValues: {
      queixaPrincipal:             existing?.queixaPrincipal             ?? '',
      historiaQueixa:              existing?.historiaQueixa              ?? '',
      historicoFamiliar:           existing?.historicoFamiliar           ?? '',
      desenvolvimentoInfancia:     existing?.desenvolvimentoInfancia     ?? '',
      desenvolvimentoAdolescencia: existing?.desenvolvimentoAdolescencia ?? '',
      desenvolvimentoAdulto:       existing?.desenvolvimentoAdulto       ?? '',
      relacionamentoInterpessoal:  existing?.relacionamentoInterpessoal  ?? '',
      historicoEscolarProfissional:existing?.historicoEscolarProfissional?? '',
      aspectosEmocionais:          existing?.aspectosEmocionais          ?? '',
      informacoesClinicas:         existing?.informacoesClinicas         ?? '',
      hipotesesDiagnosticas:       existing?.hipotesesDiagnosticas       ?? '',
      cid10:                       existing?.cid10                       ?? '',
    },
  })

  // Re-populate when patient changes
  useEffect(() => {
    const a = anamneses.find(x => x.patientId === patientId)
    reset({
      queixaPrincipal:             a?.queixaPrincipal             ?? '',
      historiaQueixa:              a?.historiaQueixa              ?? '',
      historicoFamiliar:           a?.historicoFamiliar           ?? '',
      desenvolvimentoInfancia:     a?.desenvolvimentoInfancia     ?? '',
      desenvolvimentoAdolescencia: a?.desenvolvimentoAdolescencia ?? '',
      desenvolvimentoAdulto:       a?.desenvolvimentoAdulto       ?? '',
      relacionamentoInterpessoal:  a?.relacionamentoInterpessoal  ?? '',
      historicoEscolarProfissional:a?.historicoEscolarProfissional?? '',
      aspectosEmocionais:          a?.aspectosEmocionais          ?? '',
      informacoesClinicas:         a?.informacoesClinicas         ?? '',
      hipotesesDiagnosticas:       a?.hipotesesDiagnosticas       ?? '',
      cid10:                       a?.cid10                       ?? '',
    })
    setSavedAt(a?.updatedAt ?? null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  // Autosave with 1.5s debounce
  useEffect(() => {
    const sub = watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setSaving(true)
        upsertAnamnese({ patientId, ...values } as Omit<Anamnese, 'updatedAt'>)
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

      {/* Seção 1 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Queixa e História</h3>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Queixa principal</label>
          <textarea {...register('queixaPrincipal')} rows={3} placeholder="Motivo pelo qual o paciente buscou atendimento..."/>
        </div>
        <div className={styles.fieldFull}>
          <label className={styles.label}>História da queixa</label>
          <textarea {...register('historiaQueixa')} rows={5} placeholder="Como surgiu, há quanto tempo, fatores desencadeantes, tentativas anteriores de tratamento..."/>
        </div>
      </div>

      {/* Seção 2 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Histórico Familiar</h3>
        <div className={styles.fieldFull}>
          <textarea {...register('historicoFamiliar')} rows={5}
            placeholder="Composição familiar, relacionamentos familiares, histórico de saúde mental na família, dinâmica familiar, separações, perdas significativas..."/>
        </div>
      </div>

      {/* Seção 3 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Desenvolvimento</h3>
        <div className={styles.grid3}>
          <div className={styles.field}>
            <label className={styles.label}>Infância</label>
            <textarea {...register('desenvolvimentoInfancia')} rows={5}
              placeholder="Gestação, nascimento, desenvolvimento motor e de linguagem, vínculo com cuidadores, primeiros anos escolares..."/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Adolescência</label>
            <textarea {...register('desenvolvimentoAdolescencia')} rows={5}
              placeholder="Relacionamentos com pares, identidade, sexualidade, conflitos típicos, eventos marcantes..."/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Fase adulta</label>
            <textarea {...register('desenvolvimentoAdulto')} rows={5}
              placeholder="Independência, relacionamentos, trabalho, vida conjugal, filhos (quando aplicável)..."/>
          </div>
        </div>
      </div>

      {/* Seção 4 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Aspectos Sociais e Profissionais</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Relacionamento interpessoal</label>
            <textarea {...register('relacionamentoInterpessoal')} rows={5}
              placeholder="Qualidade das relações sociais, amizades, relacionamentos amorosos, rede de apoio..."/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Histórico escolar e profissional</label>
            <textarea {...register('historicoEscolarProfissional')} rows={5}
              placeholder="Trajetória escolar, dificuldades de aprendizagem, formação, histórico de emprego, satisfação profissional..."/>
          </div>
        </div>
      </div>

      {/* Seção 5 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Aspectos Clínicos</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Aspectos emocionais</label>
            <textarea {...register('aspectosEmocionais')} rows={5}
              placeholder="Padrões emocionais, regulação emocional, episódios significativos, traumas..."/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Informações clínicas relevantes</label>
            <textarea {...register('informacoesClinicas')} rows={5}
              placeholder="Uso de medicamentos, histórico de internações, diagnósticos prévios, condições de saúde..."/>
          </div>
        </div>
      </div>

      {/* Seção 6 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Hipóteses Diagnósticas</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Hipóteses diagnósticas</label>
            <textarea {...register('hipotesesDiagnosticas')} rows={4}
              placeholder="Impressão clínica inicial, hipóteses de trabalho..."/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>CID-10 / DSM (quando aplicável)</label>
            <textarea {...register('cid10')} rows={4}
              placeholder="Ex: F41.1 — Transtorno de ansiedade generalizada..."/>
          </div>
        </div>
      </div>
    </div>
  )
}
