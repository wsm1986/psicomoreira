import type { BackupData } from '../store/store'

// ── Chaves ─────────────────────────────────────────────────────────────────
export const SNAPSHOT_KEY   = 'psicomoreira-snapshots'
export const BACKUP_META_KEY= 'psicomoreira-backup-meta'

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface Snapshot {
  id:             string
  savedAt:        string    // ISO
  patientsCount:  number
  sessionsCount:  number
  hasAttachments: boolean
  data:           string    // JSON de BackupData
}

export interface BackupMeta {
  lastFileBackupAt: string | null   // ISO — última vez que baixou arquivo
  reminderDays:     number          // 7 | 14 | 30
  dismissedUntil:   string | null   // ISO — lembrete dispensado até
}

// ── Defaults ───────────────────────────────────────────────────────────────
const DEFAULT_META: BackupMeta = {
  lastFileBackupAt: null,
  reminderDays:     7,
  dismissedUntil:   null,
}

// ── Leitura ────────────────────────────────────────────────────────────────
export function getSnapshots(): Snapshot[] {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? '[]') }
  catch { return [] }
}

export function getBackupMeta(): BackupMeta {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY)
    return raw ? { ...DEFAULT_META, ...JSON.parse(raw) } : DEFAULT_META
  } catch { return DEFAULT_META }
}

// ── Escrita ────────────────────────────────────────────────────────────────
export function setBackupMeta(patch: Partial<BackupMeta>): void {
  const current = getBackupMeta()
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ ...current, ...patch }))
}

/**
 * Salva um snapshot automático no localStorage.
 * Tenta incluir anexos; se falhar por cota, salva sem eles.
 * Mantém no máximo 5 snapshots.
 */
export function saveSnapshot(data: BackupData): void {
  const existing = getSnapshots()

  const makeSnap = (withAttachments: boolean): Snapshot => {
    const payload = withAttachments ? data : { ...data, attachments: [] }
    return {
      id:             Date.now().toString(),
      savedAt:        new Date().toISOString(),
      patientsCount:  data.patients.length,
      sessionsCount:  data.sessions.length,
      hasAttachments: withAttachments && (data.attachments?.length ?? 0) > 0,
      data:           JSON.stringify(payload),
    }
  }

  const tryStore = (snaps: Snapshot[]) => {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snaps))
  }

  for (const withAtt of [true, false]) {
    try {
      tryStore([makeSnap(withAtt), ...existing].slice(0, 5))
      return
    } catch {
      // cota excedida → tenta versão menor
    }
  }
  // Último recurso: apaga snapshots antigos e salva só o novo sem anexos
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify([makeSnap(false)]))
  } catch { /* sem espaço — desiste silenciosamente */ }
}

/**
 * Retorna true se já passou N dias desde o último backup de arquivo
 * e o lembrete não foi dispensado para hoje.
 */
export function isReminderDue(): boolean {
  const meta = getBackupMeta()

  // Verificar se foi dispensado
  if (meta.dismissedUntil && new Date(meta.dismissedUntil) > new Date()) return false

  const days = meta.reminderDays ?? 7

  if (!meta.lastFileBackupAt) {
    // Nunca fez backup: lembra depois de N dias do primeiro snapshot
    const snaps = getSnapshots()
    if (snaps.length === 0) return false
    const oldest = new Date(snaps[snaps.length - 1].savedAt)
    const daysSince = (Date.now() - oldest.getTime()) / 86_400_000
    return daysSince >= days
  }

  const daysSince = (Date.now() - new Date(meta.lastFileBackupAt).getTime()) / 86_400_000
  return daysSince >= days
}

/** Marca que o usuário acabou de exportar um arquivo. */
export function markFileBackupDone(): void {
  setBackupMeta({ lastFileBackupAt: new Date().toISOString(), dismissedUntil: null })
}

/** Dispensa o lembrete até amanhã. */
export function dismissReminder(): void {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  setBackupMeta({ dismissedUntil: tomorrow.toISOString() })
}
