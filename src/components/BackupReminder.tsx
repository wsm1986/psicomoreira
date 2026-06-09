import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, X, ShieldCheck } from 'lucide-react'
import { usePsicoStore, type BackupData } from '../store/store'
import { downloadBackupFile } from '../utils/autoBackup'
import styles from './BackupReminder.module.css'

interface Props {
  buildBackup: () => BackupData
}

export function BackupReminder({ buildBackup }: Props) {
  const [visible, setVisible]  = useState(true)
  const editConfig             = usePsicoStore(s => s.editConfig)
  const lastFileBackupAt       = usePsicoStore(s => s.config.lastFileBackupAt)

  if (!visible) return null

  const lastDate = lastFileBackupAt
    ? format(parseISO(lastFileBackupAt), "d 'de' MMM 'de' yyyy", { locale: ptBR })
    : null

  function handleBackupNow() {
    const data = buildBackup()
    downloadBackupFile(data)
    editConfig({ lastFileBackupAt: new Date().toISOString() })
    setVisible(false)
  }

  function handleDismiss() {
    setVisible(false)
  }

  return (
    <div className={styles.banner}>
      <div className={styles.bannerIcon}>
        <ShieldCheck size={16}/>
      </div>
      <p className={styles.bannerText}>
        {lastDate
          ? <>Último backup de arquivo: <strong>{lastDate}</strong>. Recomendamos fazer uma nova cópia.</>
          : <>Você ainda não fez backup dos seus dados. Recomendamos exportar agora.</>
        }
      </p>
      <div className={styles.bannerActions}>
        <button className={styles.btnBackup} onClick={handleBackupNow}>
          <Download size={13}/> Fazer backup agora
        </button>
        <button className={styles.btnDismiss} onClick={handleDismiss} title="Lembrar depois">
          <X size={14}/>
        </button>
      </div>
    </div>
  )
}
