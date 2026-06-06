import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, X, ShieldCheck } from 'lucide-react'
import { getBackupMeta, markFileBackupDone, dismissReminder } from '../utils/autoBackup'
import type { BackupData } from '../store/store'
import styles from './BackupReminder.module.css'

interface Props {
  buildBackup: () => BackupData
}

export function BackupReminder({ buildBackup }: Props) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const meta    = getBackupMeta()
  const lastDate = meta.lastFileBackupAt
    ? format(parseISO(meta.lastFileBackupAt), "d 'de' MMM 'de' yyyy", { locale: ptBR })
    : null

  function handleBackupNow() {
    const data = buildBackup()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `psicomoreira-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    markFileBackupDone()
    setVisible(false)
  }

  function handleDismiss() {
    dismissReminder()
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
