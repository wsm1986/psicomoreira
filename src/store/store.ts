import { create } from 'zustand'
import type {
  Patient, Session, PatientDocument, PatientAttachment,
  Anamnese, PlanoTerapeutico,
  ClinicConfig, AuthState, PatientStatus,
} from '../types'
import {
  firestoreSync, loadFromFirestore, pushAllToFirestore,
  subscribeRealtimeData, type FirestoreData,
} from '../services/firestore'
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
  password:         '',
}

// ── Backup shape ───────────────────────────────────────────────────────────
export interface BackupData {
  version:      string
  exportedAt:   string
  patients:     Patient[]
  sessions:     Session[]
  documents:    PatientDocument[]
  attachments?: PatientAttachment[]   // ignorado no import (não sobe ao Firestore)
  anamneses?:   Anamnese[]
  plans?:       PlanoTerapeutico[]
  config:       ClinicConfig
}

// ── Store shape ────────────────────────────────────────────────────────────
interface PsicoState {
  auth:        AuthState
  patients:    Patient[]
  sessions:    Session[]
  documents:   PatientDocument[]
  attachments: PatientAttachment[]   // memória apenas (base64 > limite Firestore)
  anamneses:   Anamnese[]
  plans:       PlanoTerapeutico[]
  config:      ClinicConfig
  loading:      boolean              // carregando dados iniciais do Firestore
  authResolved: boolean              // Firebase já respondeu ao menos uma vez

  // Auth
  logout:            () => void
  loginWithFirebase: (uid: string) => Promise<void>

  // Realtime listener — cancelar ao fazer logout
  _unsubRealtime: (() => void) | null
  _setupRealtime: (uid: string) => void
  _teardownRealtime: () => void

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

  // Attachments (memória local apenas)
  addAttachment:    (a: Omit<PatientAttachment, 'id' | 'createdAt'>) => string
  deleteAttachment: (id: string) => void

  // Anamnese
  upsertAnamnese: (data: Omit<Anamnese, 'updatedAt'>) => void

  // Plano terapêutico
  upsertPlano: (data: Omit<PlanoTerapeutico, 'updatedAt'>) => void

  // Config
  editConfig: (patch: Partial<ClinicConfig>) => void

  // Backup — importa e sobe direto ao Firestore
  importBackup: (data: BackupData) => Promise<void>

  // Aplicar dados do Firestore (usado pelo App.tsx na restauração de sessão)
  applyFirestoreData: (data: FirestoreData) => void

  // Migração: sobe dados atuais em memória para o Firestore
  migrateLocalToFirestore: () => Promise<void>
}

// ── Helper: UID atual ──────────────────────────────────────────────────────
function uid(get: () => PsicoState): string | null {
  return get().auth.firebaseUid ?? null
}

// ── Store ──────────────────────────────────────────────────────────────────
export const usePsicoStore = create<PsicoState>()((set, get) => ({
  auth:             { role: null, patientId: null, loggedIn: false, firebaseUid: null },
  patients:         [],
  sessions:         [],
  documents:        [],
  attachments:      [],
  anamneses:        [],
  plans:            [],
  config:           DEFAULT_CONFIG,
  loading:          false,
  authResolved:     false,
  _unsubRealtime:   null,

  // ── Realtime listeners ────────────────────────────────────────────────
  _setupRealtime: (userUid) => {
    // Cancela listeners anteriores se houver
    get()._teardownRealtime()

    const unsub = subscribeRealtimeData(userUid, {
      onPatients:  (patients)  => set({ patients }),
      onSessions:  (sessions)  => set({ sessions }),
      onDocuments: (documents) => set({ documents }),
      onAnamneses: (anamneses) => set({ anamneses }),
      onPlans:     (plans)     => set({ plans }),
      onConfig:    (config)    => {
        if (config) set({ config: { ...DEFAULT_CONFIG, ...config } })
      },
    })

    set({ _unsubRealtime: unsub })
  },

  _teardownRealtime: () => {
    const unsub = get()._unsubRealtime
    if (unsub) { unsub(); set({ _unsubRealtime: null }) }
  },

  // ── Auth ──────────────────────────────────────────────────────────────
  logout: () => {
    get()._teardownRealtime()
    if (firebaseAuth) firebaseAuth.signOut().catch(() => {})
    set({
      auth:        { role: null, patientId: null, loggedIn: false, firebaseUid: null },
      patients:    [],
      sessions:    [],
      documents:   [],
      attachments: [],
      anamneses:   [],
      plans:       [],
      config:      DEFAULT_CONFIG,
      loading:     false,
    })
  },

  loginWithFirebase: async (userUid) => {
    set({ loading: true })
    // Carga inicial completa do Firestore
    const data = await loadFromFirestore(userUid)
    set({
      auth:        { role: 'psicologa', patientId: null, loggedIn: true, firebaseUid: userUid },
      patients:    data.patients,
      sessions:    data.sessions,
      documents:   data.documents,
      anamneses:   data.anamneses,
      plans:       data.plans,
      attachments: [],
      config:      data.config ? { ...DEFAULT_CONFIG, ...data.config } : DEFAULT_CONFIG,
      loading:     false,
    })
    // Ativa listeners em tempo real após a carga inicial
    get()._setupRealtime(userUid)
  },

  applyFirestoreData: (data) => {
    set({
      patients:  data.patients,
      sessions:  data.sessions,
      documents: data.documents,
      anamneses: data.anamneses,
      plans:     data.plans,
      config:    data.config ? { ...DEFAULT_CONFIG, ...data.config } : DEFAULT_CONFIG,
    })
  },

  migrateLocalToFirestore: async () => {
    const { auth, patients, sessions, documents, anamneses, plans, config } = get()
    if (!auth.firebaseUid) return
    await pushAllToFirestore(auth.firebaseUid, {
      patients, sessions, documents, anamneses, plans, config,
    })
  },

  // ── Patients ──────────────────────────────────────────────────────────
  addPatient: (p) => {
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    const patient: Patient = { ...p, id, createdAt: now, updatedAt: now }
    // Otimista: atualiza memória imediatamente; Firestore confirma via onSnapshot
    set(s => ({ patients: [...s.patients, patient] }))
    const u = uid(get)
    console.log('[Store] addPatient — uid:', u, 'id:', id)
    if (u) firestoreSync.patient(u, patient)
    else console.error('[Store] addPatient — UID is null! Não vai salvar no Firestore.')
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

  // ── Sessions ──────────────────────────────────────────────────────────
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

  // ── Documents ─────────────────────────────────────────────────────────
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

  // ── Attachments (memória local apenas — base64 excede limite Firestore) ──
  addAttachment: (a) => {
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    set(s => ({ attachments: [...s.attachments, { ...a, id, createdAt: now }] }))
    return id
  },
  deleteAttachment: (id) => {
    set(s => ({ attachments: s.attachments.filter(a => a.id !== id) }))
  },

  // ── Anamnese ──────────────────────────────────────────────────────────
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

  // ── Plano ─────────────────────────────────────────────────────────────
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

  // ── Config ────────────────────────────────────────────────────────────
  editConfig: (patch) => {
    set(s => ({ config: { ...s.config, ...patch } }))
    setTimeout(() => {
      const u = uid(get)
      if (u) firestoreSync.config(u, get().config)
    }, 0)
  },

  // ── Backup — importa direto no Firestore ──────────────────────────────
  importBackup: async (data) => {
    const u = uid(get)
    if (!u) return
    const config = { ...DEFAULT_CONFIG, ...data.config }
    // Atualiza memória imediatamente
    set({
      patients:  data.patients  ?? [],
      sessions:  data.sessions  ?? [],
      documents: data.documents ?? [],
      anamneses: data.anamneses ?? [],
      plans:     data.plans     ?? [],
      config,
    })
    // Sobe tudo ao Firestore
    await pushAllToFirestore(u, {
      patients:  data.patients  ?? [],
      sessions:  data.sessions  ?? [],
      documents: data.documents ?? [],
      anamneses: data.anamneses ?? [],
      plans:     data.plans     ?? [],
      config,
    })
  },
}))
