import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEY } from '../config/app'
import type {
  Patient, Session, PatientDocument, PatientAttachment,
  Anamnese, PlanoTerapeutico,
  ClinicConfig, AuthState, PatientStatus,
} from '../types'

// ── Default config ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG: ClinicConfig = {
  clinicName:       'PsicoMoreira',
  psychologistName: 'Dra. Moreira',
  crp:              '',
  email:            '',
  phone:            '',
  sessionDuration:  50,
  sessionValue:     200,
  workingDays:      [1, 2, 3, 4, 5],
  workingStart:     '08:00',
  workingEnd:       '18:00',
  password:         'psico2025',
}

// ── Backup shape ───────────────────────────────────────────────────────────
export interface BackupData {
  version:    string
  exportedAt: string
  patients:   Patient[]
  sessions:   Session[]
  documents:  PatientDocument[]
  attachments?:PatientAttachment[]
  anamneses?: Anamnese[]
  plans?:     PlanoTerapeutico[]
  config:     ClinicConfig
}

// ── Store shape ────────────────────────────────────────────────────────────
interface PsicoState {
  auth:        AuthState
  patients:    Patient[]
  sessions:    Session[]
  documents:   PatientDocument[]
  attachments: PatientAttachment[]
  anamneses:   Anamnese[]
  plans:       PlanoTerapeutico[]
  config:      ClinicConfig

  // Auth
  loginPsicologa:  (password: string, email?: string) => boolean
  loginPaciente:   (code: string) => boolean
  logout:          () => void

  // Patients
  addPatient:  (p: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => string
  editPatient: (id: string, patch: Partial<Patient>) => void
  setStatus:   (id: string, status: PatientStatus) => void

  // Sessions
  addSession:    (s: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => string
  editSession:   (id: string, patch: Partial<Session>) => void
  deleteSession: (id: string) => void

  // Documents
  addDocument:    (d: Omit<PatientDocument, 'id' | 'createdAt'>) => string
  deleteDocument: (id: string) => void
  shareDocument:  (id: string, shared: boolean) => void

  // Attachments
  addAttachment:    (a: Omit<PatientAttachment, 'id' | 'createdAt'>) => string
  deleteAttachment: (id: string) => void

  // Anamnese
  upsertAnamnese: (data: Omit<Anamnese, 'updatedAt'>) => void

  // Plano terapêutico
  upsertPlano: (data: Omit<PlanoTerapeutico, 'updatedAt'>) => void

  // Config
  editConfig: (patch: Partial<ClinicConfig>) => void

  // Backup
  importBackup: (data: BackupData) => void
}

export const usePsicoStore = create<PsicoState>()(
  persist(
    (set, get) => ({
      auth:        { role: null, patientId: null, loggedIn: false },
      patients:    [],
      sessions:    [],
      documents:   [],
      attachments: [],
      anamneses:   [],
      plans:       [],
      config:      DEFAULT_CONFIG,

      // ── Auth ──────────────────────────────────────────────────────────
      loginPsicologa: (password, email) => {
        const { config } = get()
        const senhaOk = password === (config.password ?? 'psico2025')
        const emailOk = !config.email || !email
          ? true
          : email.toLowerCase() === config.email.toLowerCase()
        if (senhaOk && emailOk) {
          set({ auth: { role: 'psicologa', patientId: null, loggedIn: true } })
          return true
        }
        return false
      },

      loginPaciente: (code) => {
        const patient = get().patients.find(
          p => p.accessCode?.toUpperCase() === code.toUpperCase()
        )
        if (patient) {
          set({ auth: { role: 'paciente', patientId: patient.id, loggedIn: true } })
          return true
        }
        return false
      },

      logout: () => set({ auth: { role: null, patientId: null, loggedIn: false } }),

      // ── Patients ──────────────────────────────────────────────────────
      addPatient: (p) => {
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        set(s => ({ patients: [...s.patients, { ...p, id, createdAt: now, updatedAt: now }] }))
        return id
      },

      editPatient: (id, patch) => {
        set(s => ({
          patients: s.patients.map(p =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        }))
      },

      setStatus: (id, status) => {
        const now = new Date().toISOString()
        set(s => ({
          patients: s.patients.map(p =>
            p.id === id
              ? { ...p, status, updatedAt: now, endDate: status === 'encerrado' ? now.split('T')[0] : p.endDate }
              : p
          ),
        }))
      },

      // ── Sessions ──────────────────────────────────────────────────────
      addSession: (s) => {
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        set(st => ({ sessions: [...st.sessions, { ...s, id, createdAt: now, updatedAt: now }] }))
        return id
      },

      editSession: (id, patch) => {
        set(s => ({
          sessions: s.sessions.map(ss =>
            ss.id === id ? { ...ss, ...patch, updatedAt: new Date().toISOString() } : ss
          ),
        }))
      },

      deleteSession: (id) => {
        set(s => ({ sessions: s.sessions.filter(ss => ss.id !== id) }))
      },

      // ── Documents ─────────────────────────────────────────────────────
      addDocument: (d) => {
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        set(s => ({ documents: [...s.documents, { ...d, id, createdAt: now }] }))
        return id
      },
      deleteDocument: (id) => {
        set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
      },
      shareDocument: (id, shared) => {
        set(s => ({
          documents: s.documents.map(d => d.id === id ? { ...d, sharedWithPatient: shared } : d),
        }))
      },

      // ── Attachments ───────────────────────────────────────────────────
      addAttachment: (a) => {
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        set(s => ({ attachments: [...s.attachments, { ...a, id, createdAt: now }] }))
        return id
      },
      deleteAttachment: (id) => {
        set(s => ({ attachments: s.attachments.filter(a => a.id !== id) }))
      },

      // ── Anamnese ──────────────────────────────────────────────────────
      upsertAnamnese: (data) => {
        const now = new Date().toISOString()
        set(s => {
          const exists = s.anamneses.some(a => a.patientId === data.patientId)
          return {
            anamneses: exists
              ? s.anamneses.map(a =>
                  a.patientId === data.patientId ? { ...a, ...data, updatedAt: now } : a
                )
              : [...s.anamneses, { ...data, updatedAt: now }],
          }
        })
      },

      // ── Plano ─────────────────────────────────────────────────────────
      upsertPlano: (data) => {
        const now = new Date().toISOString()
        set(s => {
          const exists = s.plans.some(p => p.patientId === data.patientId)
          return {
            plans: exists
              ? s.plans.map(p =>
                  p.patientId === data.patientId ? { ...p, ...data, updatedAt: now } : p
                )
              : [...s.plans, { ...data, updatedAt: now }],
          }
        })
      },

      // ── Config ────────────────────────────────────────────────────────
      editConfig: (patch) => {
        set(s => ({ config: { ...s.config, ...patch } }))
      },

      // ── Backup ────────────────────────────────────────────────────────
      importBackup: (data) => {
        set({
          patients:    data.patients    ?? [],
          sessions:    data.sessions    ?? [],
          documents:   data.documents   ?? [],
          attachments: data.attachments ?? [],
          anamneses:   data.anamneses   ?? [],
          plans:       data.plans       ?? [],
          config:      { ...DEFAULT_CONFIG, ...data.config },
          auth:        { role: null, patientId: null, loggedIn: false },
        })
      },
    }),
    {
      name:    STORAGE_KEY,
      version: 1,
    }
  )
)
