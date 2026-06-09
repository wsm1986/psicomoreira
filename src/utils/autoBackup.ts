/**
 * autoBackup.ts
 * Helpers para exportação de arquivo de backup.
 * Todos os dados são armazenados no Firestore — sem localStorage.
 */
import { format } from 'date-fns'
import type { BackupData } from '../store/store'

/** Dispara o download de um arquivo JSON de backup. */
export function downloadBackupFile(data: BackupData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `psicomoreira-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
