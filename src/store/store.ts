import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEY } from '../config/app'
import type {
  Patient, Session, PatientDocument,
  ClinicConfig, AuthState, PatientStatus,
} from '../types'

// ── Default config ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG: ClinicConfig = {
  clinicName:       'PsicoMoreira',
  psychologistName: 'Dra. Moreira',
  crp:              '',
  phone:            '',
  sessionDuration:  50,
  sessionValue:     200,
  workingDays:      [1, 2, 3, 4, 5],
  workingStart:     '08:00',
  workingEnd:       '18:00',
  password:         'psico2025',
}

// ── Store shape ────────────────────────────────────────────────────────────
interface PsicoState {
  // Auth
  auth:    AuthState
  // Data
  patients:  Patient[]
  sessions:  Session[]
  documents: PatientDocument[]
  config:    ClinicConfig

  // Auth actions
  loginPsicologa:  (password: string) => boolean
  loginPaciente:   (code: string) => boolean
  logout:          () => void

  // Patient actions
  addPatient:    (p: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => string
  editPatient:   (id: string, patch: Partial<Patient>) => void
  setStatus:     (id: string, status: PatientStatus) => void

  // Session actions
  addSession:    (s: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => string
  editSession:   (id: string, patch: Partial<Session>) => void
  deleteSession: (id: string) => void

  // Document actions
  addDocument:    (d: Omit<PatientDocument, 'id' | 'createdAt'>) => string
  deleteDocument: (id: string) => void
  shareDocument:  (id: string, shared: boolean) => void

  // Config
  editConfig: (patch: Partial<ClinicConfig>) => void
}

export const usePsicoStore = create<PsicoState>()(
  persist(
    (set, get) => ({
      auth: { role: null, patientId: null, loggedIn: false },
      patients:  [],
      sessions:  [],
      documents: [],
      config:    DEFAULT_CONFIG,

      // ── Auth ──────────────────────────────────────────────────────────
      loginPsicologa: (password) => {
        if (password === (get().config.password ?? 'psico2025')) {
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
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        set(s => ({
          patients: [...s.patients, { ...p, id, createdAt: now, updatedAt: now }],
        }))
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
        set(st => ({
          sessions: [...st.sessions, { ...s, id, createdAt: now, updatedAt: now }],
        }))
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
        set(s => ({
          documents: [...s.documents, { ...d, id, createdAt: now }],
        }))
        return id
      },

      deleteDocument: (id) => {
        set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
      },

      shareDocument: (id, shared) => {
        set(s => ({
          documents: s.documents.map(d =>
            d.id === id ? { ...d, sharedWithPatient: shared } : d
          ),
        }))
      },

      // ── Config ────────────────────────────────────────────────────────
      editConfig: (patch) => {
        set(s => ({ config: { ...s.config, ...patch } }))
      },
    }),
    {
      name:    STORAGE_KEY,
      version: 1,
    }
  )
)
