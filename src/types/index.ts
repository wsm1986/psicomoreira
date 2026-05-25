// ── Core types ─────────────────────────────────────────────────────────────

export type PatientStatus = 'ativo' | 'encerrado' | 'pausado'
export type SessionStatus = 'agendada' | 'realizada' | 'falta' | 'cancelada' | 'remarcada'
export type SessionModality = 'presencial' | 'online'
export type PaymentMethod  = 'pix' | 'dinheiro' | 'cartao' | 'boleto' | 'plano'
export type DocumentType   = 'laudo' | 'atestado' | 'encaminhamento' | 'contrato' | 'outro'
export type UserRole       = 'psicologa' | 'paciente'

// ── Patient ────────────────────────────────────────────────────────────────
export interface Patient {
  id:                string
  name:              string
  birthDate?:        string
  cpf?:              string
  phone:             string
  email?:            string
  address?:          string
  emergencyContact?: string
  emergencyPhone?:   string
  insurance?:        string
  referral?:         string
  status:            PatientStatus
  startDate:         string
  endDate?:          string
  notes?:            string
  /** Login code for patient portal */
  accessCode?:       string
  avatar?:           string
  createdAt:         string
  updatedAt:         string
}

// ── Session ────────────────────────────────────────────────────────────────
export interface Session {
  id:               string
  patientId:        string
  date:             string      // YYYY-MM-DD
  time:             string      // HH:mm
  duration:         number      // minutes
  sessionNumber?:   number
  status:           SessionStatus
  modality:         SessionModality
  // Clinical notes (psychologist only)
  demands?:         string
  mood?:            string
  interventions?:   string
  clinicalNotes?:   string
  nextGoals?:       string
  evolution?:       string
  // Financial
  value:            number
  paid:             boolean
  paymentDate?:     string
  paymentMethod?:   PaymentMethod
  // Metadata
  rescheduledFrom?: string
  cancelReason?:    string
  createdAt:        string
  updatedAt:        string
}

// ── Document ───────────────────────────────────────────────────────────────
export interface PatientDocument {
  id:                 string
  patientId:          string
  name:               string
  type:               DocumentType
  /** base64 data URL or future remote URL */
  dataUrl?:           string
  sharedWithPatient:  boolean
  createdAt:          string
}

// ── Clinic config ──────────────────────────────────────────────────────────
export interface ClinicConfig {
  clinicName:        string
  psychologistName:  string
  crp:               string
  phone:             string
  address?:          string
  sessionDuration:   number   // default minutes
  sessionValue:      number   // default R$
  workingDays:       number[] // 0=Sun..6=Sat
  workingStart:      string   // "08:00"
  workingEnd:        string   // "18:00"
  lgpdText?:         string
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface AuthState {
  role:      UserRole | null
  patientId: string | null     // set when role = 'paciente'
  loggedIn:  boolean
}
