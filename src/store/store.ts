import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEY } from '../config/app'
import type {
  Patient, Session, PatientDocument, PatientAttachment,
  Anamnese, PlanoTerapeutico,
  ClinicConfig, AuthState, PatientStatus,
} from '../types'
import { firestoreSync, loadFromFirestore, pushAllToFirestore, type FirestoreData } from '../services/firestore'
import { firebaseAuth } from '../config/firebase'

// ── Default config ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG: ClinicConfig = {
  clinicName:       'PsicoMoreira',
  psychologistName: 'Joselaine Moreira',
  crp:              '06/195016',
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
  version:     string
  exportedAt:  string
  patients:    Patient[]
  sessions:    Session[]
  documents:   PatientDocument[]
  attachments?: PatientAttachment[]
  anamneses?:  Anamnese[]
  plans?:      PlanoTerapeutico[]
  config:      ClinicConfig
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

  // Auth — local (senha)
  loginPsicologa:  (password: string, email?: string) => boolean
  loginPaciente:   (code: string) => boolean
  logout:          () => void

  // Auth — Firebase
  loginWithFirebase: (uid: string) => Promise<void>

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

  // Attachments (local only)
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

  // Carrega dados do Firestore e atualiza o store (usado pelo App.tsx)
  applyFirestoreData: (data: FirestoreData) => void
}

// ── Helper: UID atual ──────────────────────────────────────────────────────
function uid(get: () => PsicoState): string | null {
  return get().auth.firebaseUid ?? null
}

export const usePsicoStore = create<PsicoState>()(
  persist(
    (set, get) => ({
      auth:        { role: null, patientId: null, loggedIn: false, firebaseUid: null },
      patients:    [],
      sessions:    [],
      documents:   [],
      attachments: [],
      anamneses:   [],
      plans:       [],
      config:      DEFAULT_CONFIG,

      // ── Auth — local ──────────────────────────────────────────────────
      loginPsicologa: (password, email) => {
        const { config } = get()
        const senhaOk = password === (config.password ?? 'psico2025')
        const emailOk = !config.email || !email
          ? true
          : email.toLowerCase() === config.email.toLowerCase()
        if (senhaOk && emailOk) {
          set({ auth: { role: 'psicologa', patientId: null, loggedIn: true, firebaseUid: null } })
          return true
        }
        return false
      },

      loginPaciente: (code) => {
        const patient = get().patients.find(
          p => p.accessCode?.toUpperCase() === code.toUpperCase()
        )
        if (patient) {
          set({ auth: { role: 'paciente', patientId: patient.id, loggedIn: true, firebaseUid: null } })
          return true
        }
        return false
      },

      logout: () => {
        if (firebaseAuth) firebaseAuth.signOut().catch(() => {})
        set({ auth: { role: null, patientId: null, loggedIn: false, firebaseUid: null } })
      },

      // ── Auth — Firebase ───────────────────────────────────────────────
      loginWithFirebase: async (userUid) => {
        const state = get()

        // Carrega dados do Firestore
        const firestoreData = await loadFromFirestore(userUid)
        const hasFirestoreData = firestoreData.patients.length > 0 || firestoreData.sessions.length > 0

        // Se Firestore está vazio mas há dados locais → faz upload (migração)
        if (!hasFirestoreData && (state.patients.length > 0 || state.sessions.length > 0)) {
          await pushAllToFirestore(userUid, {
            patients:  state.patients,
            sessions:  state.sessions,
            documents: state.documents,
            anamneses: state.anamneses,
            plans:     state.plans,
            config:    state.config,
          })
        }

        // Atualiza o store
        set({
          auth: { role: 'psicologa', patientId: null, loggedIn: true, firebaseUid: userUid },
          ...(hasFirestoreData ? {
            patients:  firestoreData.patients,
            sessions:  firestoreData.sessions,
            documents: firestoreData.documents,
            anamneses: firestoreData.anamneses,
            plans:     firestoreData.plans,
            config:    firestoreData.config
              ? { ...DEFAULT_CONFIG, ...firestoreData.config }
              : state.config,
          } : {}),
        })
      },

      // ── Aplicar dados do Firestore (restauração de sessão no App.tsx) ──
      applyFirestoreData: (data) => {
        const hasData = data.patients.length > 0 || data.sessions.length > 0
        if (!hasData) return
        set({
          patients:  data.patients,
          sessions:  data.sessions,
          documents: data.documents,
          anamneses: data.anamneses,
          plans:     data.plans,
          ...(data.config ? { config: { ...DEFAULT_CONFIG, ...data.config } } : {}),
        })
      },

      // ── Patients ──────────────────────────────────────────────────────
      addPatient: (p) => {
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        const patient: Patient = { ...p, id, createdAt: now, updatedAt: now }
        set(s => ({ patients: [...s.patients, patient] }))
        const u = uid(get); if (u) firestoreSync.patient(u, patient)
        return id
      },

      editPatient: (id, patch) => {
        const now = new Date().toISOString()
        let updated: Patient | undefined
        set(s => ({
          patients: s.patients.map(p => {
            if (p.id !== id) return p
            updated = { ...p, ...patch, updatedAt: now }
            return updated
          }),
        }))
        const u = uid(get); if (u && updated) firestoreSync.patient(u, updated)
      },

      setStatus: (id, status) => {
        const now = new Date().toISOString()
        let updated: Patient | undefined
        set(s => ({
          patients: s.patients.map(p => {
            if (p.id !== id) return p
            updated = { ...p, status, updatedAt: now, endDate: status === 'encerrado' ? now.split('T')[0] : p.endDate }
            return updated
          }),
        }))
        const u = uid(get); if (u && updated) firestoreSync.patient(u, updated)
      },

      // ── Sessions ──────────────────────────────────────────────────────
      addSession: (s) => {
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        const session: Session = { ...s, id, createdAt: now, updatedAt: now }
        set(st => ({ sessions: [...st.sessions, session] }))
        const u = uid(get); if (u) firestoreSync.session(u, session)
        return id
      },

      editSession: (id, patch) => {
        const now = new Date().toISOString()
        let updated: Session | undefined
        set(s => ({
          sessions: s.sessions.map(ss => {
            if (ss.id !== id) return ss
            updated = { ...ss, ...patch, updatedAt: now }
            return updated
          }),
        }))
        const u = uid(get); if (u && updated) firestoreSync.session(u, updated)
      },

      deleteSession: (id) => {
        set(s => ({ sessions: s.sessions.filter(ss => ss.id !== id) }))
        const u = uid(get); if (u) firestoreSync.delSession(u, id)
      },

      // ── Documents ─────────────────────────────────────────────────────
      addDocument: (d) => {
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        const doc: PatientDocument = { ...d, id, createdAt: now }
        set(s => ({ documents: [...s.documents, doc] }))
        const u = uid(get); if (u) firestoreSync.document(u, doc)
        return id
      },
      deleteDocument: (id) => {
        set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
        const u = uid(get); if (u) firestoreSync.delDocument(u, id)
      },
      shareDocument: (id, shared) => {
        let updated: PatientDocument | undefined
        set(s => ({
          documents: s.documents.map(d => {
            if (d.id !== id) return d
            updated = { ...d, sharedWithPatient: shared }
            return updated
          }),
        }))
        const u = uid(get); if (u && updated) firestoreSync.document(u, updated)
      },

      // ── Attachments (local only — base64 pode exceder limite Firestore) ─
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
        let upserted: Anamnese | undefined
        set(s => {
          const exists = s.anamneses.some(a => a.patientId === data.patientId)
          const list = exists
            ? s.anamneses.map(a => {
                if (a.patientId !== data.patientId) return a
                upserted = { ...a, ...data, updatedAt: now }
                return upserted
              })
            : [...s.anamneses, (upserted = { ...data, updatedAt: now })]
          return { anamneses: list }
        })
        const u = uid(get); if (u && upserted) firestoreSync.anamnese(u, upserted)
      },

      // ── Plano ─────────────────────────────────────────────────────────
      upsertPlano: (data) => {
        const now = new Date().toISOString()
        let upserted: PlanoTerapeutico | undefined
        set(s => {
          const exists = s.plans.some(p => p.patientId === data.patientId)
          const list = exists
            ? s.plans.map(p => {
                if (p.patientId !== data.patientId) return p
                upserted = { ...p, ...data, updatedAt: now }
                return upserted
              })
            : [...s.plans, (upserted = { ...data, updatedAt: now })]
          return { plans: list }
        })
        const u = uid(get); if (u && upserted) firestoreSync.plan(u, upserted)
      },

      // ── Config ────────────────────────────────────────────────────────
      editConfig: (patch) => {
        set(s => ({ config: { ...s.config, ...patch } }))
        // Sync config depois que o state foi atualizado
        setTimeout(() => {
          const u = uid(get)
          if (u) firestoreSync.config(u, get().config)
        }, 0)
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
          auth:        { role: null, patientId: null, loggedIn: false, firebaseUid: null },
        })
      },
    }),
    {
      name:    STORAGE_KEY,
      version: 1,
    }
  )
)
