import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth,      type Auth }       from 'firebase/auth'
import { getFirestore, type Firestore }  from 'firebase/firestore'

// ── Config lida das variáveis de ambiente (Vite) ───────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
}

// Firebase só é inicializado se as variáveis de ambiente estiverem presentes
export const firebaseEnabled =
  Boolean(firebaseConfig.apiKey) && Boolean(firebaseConfig.projectId)

let _app:  FirebaseApp | null = null
let _auth: Auth        | null = null
let _db:   Firestore   | null = null

if (firebaseEnabled) {
  _app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  _auth = getAuth(_app)
  _db   = getFirestore(_app)
}

export const firebaseApp  = _app
export const firebaseAuth = _auth
export const firebaseDb   = _db
