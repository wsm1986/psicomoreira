/**
 * Serviço de sincronização com o Firestore.
 *
 * Estrutura no Firestore:
 *   users/{uid}/patients/{id}
 *   users/{uid}/sessions/{id}
 *   users/{uid}/documents/{id}
 *   users/{uid}/anamneses/{patientId}
 *   users/{uid}/plans/{patientId}
 *   users/{uid}/config/main
 *
 * Anexos (attachments) NÃO são sincronizados — podem exceder o limite de 1 MB/doc
 * do Firestore e ficam apenas no localStorage.
 */

import {
  doc, setDoc, deleteDoc, getDoc,
  collection, getDocs, writeBatch,
} from 'firebase/firestore'
import { firebaseDb } from '../config/firebase'
import type {
  Patient, Session, PatientDocument,
  Anamnese, PlanoTerapeutico, ClinicConfig,
} from '../types'

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface FirestoreData {
  patients:  Patient[]
  sessions:  Session[]
  documents: PatientDocument[]
  anamneses: Anamnese[]
  plans:     PlanoTerapeutico[]
  config:    ClinicConfig | null
}

// ── Helpers ────────────────────────────────────────────────────────────────
function col(uid: string, name: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return collection(firebaseDb!, `users/${uid}/${name}`)
}
function ref(uid: string, name: string, id: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return doc(firebaseDb!, `users/${uid}/${name}/${id}`)
}
function configRef(uid: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return doc(firebaseDb!, `users/${uid}/config/main`)
}

// ── Carregar todos os dados ────────────────────────────────────────────────
export async function loadFromFirestore(uid: string): Promise<FirestoreData> {
  if (!firebaseDb) return emptyData()
  try {
    const [pSnap, sSnap, dSnap, aSnap, plSnap, cfSnap] = await Promise.all([
      getDocs(col(uid, 'patients')),
      getDocs(col(uid, 'sessions')),
      getDocs(col(uid, 'documents')),
      getDocs(col(uid, 'anamneses')),
      getDocs(col(uid, 'plans')),
      getDoc(configRef(uid)),
    ])
    return {
      patients:  pSnap.docs.map(d => d.data()  as Patient),
      sessions:  sSnap.docs.map(d => d.data()  as Session),
      documents: dSnap.docs.map(d => d.data()  as PatientDocument),
      anamneses: aSnap.docs.map(d => d.data()  as Anamnese),
      plans:     plSnap.docs.map(d => d.data() as PlanoTerapeutico),
      config:    cfSnap.exists() ? cfSnap.data() as ClinicConfig : null,
    }
  } catch (e) {
    console.warn('[Firestore] loadFromFirestore error:', e)
    return emptyData()
  }
}

function emptyData(): FirestoreData {
  return { patients: [], sessions: [], documents: [], anamneses: [], plans: [], config: null }
}

// ── Upload completo (migração de dados locais) ─────────────────────────────
export async function pushAllToFirestore(
  uid: string,
  data: Omit<FirestoreData, 'config'> & { config: ClinicConfig },
): Promise<void> {
  if (!firebaseDb) return
  try {
    const BATCH_LIMIT = 490  // Firestore: max 500 ops/batch
    const items: Array<{ path: string; id: string; data: object }> = [
      ...data.patients.map(p  => ({ path: 'patients',  id: p.id,          data: p  })),
      ...data.sessions.map(s  => ({ path: 'sessions',  id: s.id,          data: s  })),
      ...data.documents.map(d => ({ path: 'documents', id: d.id,          data: d  })),
      ...data.anamneses.map(a => ({ path: 'anamneses', id: a.patientId,   data: a  })),
      ...data.plans.map(p     => ({ path: 'plans',     id: p.patientId,   data: p  })),
    ]

    for (let i = 0; i < items.length; i += BATCH_LIMIT) {
      const batch = writeBatch(firebaseDb)
      items.slice(i, i + BATCH_LIMIT).forEach(item => {
        batch.set(doc(firebaseDb!, `users/${uid}/${item.path}/${item.id}`), item.data)
      })
      await batch.commit()
    }
    // Config
    await setDoc(configRef(uid), data.config)
  } catch (e) {
    console.warn('[Firestore] pushAllToFirestore error:', e)
  }
}

// ── Sync individual por entidade ───────────────────────────────────────────
async function safeSet(docRef: ReturnType<typeof doc>, data: object) {
  try { await setDoc(docRef, data) }
  catch (e) { console.warn('[Firestore] setDoc error:', e) }
}
async function safeDel(docRef: ReturnType<typeof doc>) {
  try { await deleteDoc(docRef) }
  catch (e) { console.warn('[Firestore] deleteDoc error:', e) }
}

export const firestoreSync = {
  patient:    (uid: string, p: Patient)           => safeSet(ref(uid, 'patients',  p.id),        p),
  session:    (uid: string, s: Session)            => safeSet(ref(uid, 'sessions',  s.id),        s),
  document:   (uid: string, d: PatientDocument)   => safeSet(ref(uid, 'documents', d.id),        d),
  anamnese:   (uid: string, a: Anamnese)           => safeSet(ref(uid, 'anamneses', a.patientId), a),
  plan:       (uid: string, p: PlanoTerapeutico)   => safeSet(ref(uid, 'plans',     p.patientId), p),
  config:     (uid: string, c: ClinicConfig)       => safeSet(configRef(uid),                    c),

  delPatient:  (uid: string, id: string) => safeDel(ref(uid, 'patients',  id)),
  delSession:  (uid: string, id: string) => safeDel(ref(uid, 'sessions',  id)),
  delDocument: (uid: string, id: string) => safeDel(ref(uid, 'documents', id)),
}
