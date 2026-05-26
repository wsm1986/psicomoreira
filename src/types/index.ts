// ── Core types ─────────────────────────────────────────────────────────────

export type PatientStatus  = 'ativo' | 'encerrado' | 'pausado'
export type SessionStatus  = 'agendada' | 'realizada' | 'falta' | 'cancelada' | 'remarcada'
export type SessionModality= 'presencial' | 'online'
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
  accessCode?:       string
  avatar?:           string
  createdAt:         string
  updatedAt:         string
}

// ── Session ────────────────────────────────────────────────────────────────
export interface Session {
  id:               string
  patientId:        string
  date:             string
  time:             string
  duration:         number
  sessionNumber?:   number
  status:           SessionStatus
  modality:         SessionModality
  // Clinical notes
  demands?:         string   // queixa principal do dia
  descricaoDemanda?:string   // descrição detalhada da demanda (NEW)
  resumoSessao?:    string   // resumo da sessão (NEW)
  mood?:            string
  interventions?:   string
  clinicalNotes?:   string
  nextGoals?:       string
  evolution?:       string
  observacoes?:     string   // observações gerais (NEW)
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

// ── Anamnese estruturada ───────────────────────────────────────────────────
export interface Anamnese {
  patientId:                    string
  queixaPrincipal?:             string
  historiaQueixa?:              string
  historicoFamiliar?:           string
  desenvolvimentoInfancia?:     string
  desenvolvimentoAdolescencia?: string
  desenvolvimentoAdulto?:       string
  relacionamentoInterpessoal?:  string
  historicoEscolarProfissional?:string
  aspectosEmocionais?:          string
  informacoesClinicas?:         string
  hipotesesDiagnosticas?:       string
  cid10?:                       string
  updatedAt:                    string
}

// ── Plano terapêutico ──────────────────────────────────────────────────────
export interface PlanoTerapeutico {
  patientId:             string
  objetivos?:            string
  estrategias?:          string
  direcionamentos?:      string
  planosPaciente?:       string
  modalidadeTratamento?: string
  frequenciaSessoes?:    string
  updatedAt:             string
}

// ── Anexos ─────────────────────────────────────────────────────────────────
export interface PatientAttachment {
  id:        string
  patientId: string
  name:      string
  size:      number
  mimeType:  string
  dataUrl:   string
  createdAt: string
}

// ── Document ───────────────────────────────────────────────────────────────
export interface PatientDocument {
  id:                 string
  patientId:          string
  name:               string
  type:               DocumentType
  dataUrl?:           string
  sharedWithPatient:  boolean
  createdAt:          string
}

// ── Clinic config ──────────────────────────────────────────────────────────
export interface ClinicConfig {
  clinicName:        string
  psychologistName:  string
  crp:               string
  email?:            string
  phone:             string
  address?:          string
  sessionDuration:   number
  sessionValue:      number
  workingDays:       number[]
  workingStart:      string
  workingEnd:        string
  lgpdText?:         string
  password?:         string
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface AuthState {
  role:      UserRole | null
  patientId: string | null
  loggedIn:  boolean
}
