import jsPDF from 'jspdf'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Patient, Session, Anamnese, PlanoTerapeutico, ClinicConfig } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────
const MARGIN  = 18
const PW      = 210 - MARGIN * 2  // usable width mm
const ACCENT  = [140, 100, 80] as [number, number, number]  // terracotta RGB
const DARK    = [30,  26,  24] as [number, number, number]
const GRAY    = [120, 110, 105] as [number, number, number]
const LIGHT   = [245, 242, 238] as [number, number, number]

// ── Helpers ────────────────────────────────────────────────────────────────
function setColor(doc: jsPDF, rgb: [number,number,number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}
function fillColor(doc: jsPDF, rgb: [number,number,number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}
function drawColor(doc: jsPDF, rgb: [number,number,number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
}

function addHeader(doc: jsPDF, config: ClinicConfig, title: string): number {
  // Accent bar
  fillColor(doc, ACCENT)
  doc.rect(0, 0, 210, 22, 'F')

  // Clinic name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(config.clinicName, MARGIN, 13)

  // CRP / title right
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const rightText = config.crp ? `CRP ${config.crp}` : ''
  doc.text(rightText, 210 - MARGIN - doc.getTextWidth(rightText), 13)

  // Document title
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor(doc, DARK)
  doc.text(title, MARGIN, 34)

  // Date generated
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  setColor(doc, GRAY)
  const dateStr = `Gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
  doc.text(dateStr, 210 - MARGIN - doc.getTextWidth(dateStr), 34)

  // Divider
  drawColor(doc, ACCENT)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, 37, 210 - MARGIN, 37)

  return 44  // return Y position after header
}

function addFooter(doc: jsPDF, config: ClinicConfig) {
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    drawColor(doc, [220, 215, 210])
    doc.setLineWidth(0.3)
    doc.line(MARGIN, 277, 210 - MARGIN, 277)

    // Signature
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    setColor(doc, GRAY)
    doc.text(config.psychologistName, MARGIN, 283)
    if (config.crp) {
      doc.text(`CRP ${config.crp}`, MARGIN, 287)
    }

    // Page number
    const pageStr = `Página ${i} de ${pageCount}`
    doc.text(pageStr, 210 - MARGIN - doc.getTextWidth(pageStr), 283)
  }
}

function section(doc: jsPDF, title: string, y: number): number {
  if (y > 260) { doc.addPage(); y = 20 }
  fillColor(doc, LIGHT)
  doc.rect(MARGIN, y, PW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setColor(doc, ACCENT)
  doc.text(title.toUpperCase(), MARGIN + 3, y + 5)
  return y + 10
}

function field(doc: jsPDF, label: string, value: string | undefined, y: number, indent = 0): number {
  if (!value?.trim()) return y
  if (y > 265) { doc.addPage(); y = 20 }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setColor(doc, GRAY)
  doc.text(label, MARGIN + indent, y)
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  setColor(doc, DARK)
  const lines = doc.splitTextToSize(value, PW - indent)
  for (const line of lines) {
    if (y > 268) { doc.addPage(); y = 20 }
    doc.text(line, MARGIN + indent, y)
    y += 5
  }
  return y + 3
}

function patientBlock(doc: jsPDF, patient: Patient, y: number): number {
  fillColor(doc, [250, 248, 245])
  drawColor(doc, [220, 215, 210])
  doc.setLineWidth(0.3)
  doc.rect(MARGIN, y, PW, 22, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  setColor(doc, DARK)
  doc.text(patient.name, MARGIN + 4, y + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  setColor(doc, GRAY)

  const age = patient.birthDate
    ? `${differenceInYears(new Date(), parseISO(patient.birthDate))} anos`
    : ''
  const info = [
    age,
    patient.phone,
    patient.email ?? '',
    `Início: ${format(parseISO(patient.startDate), "d/MM/yyyy")}`,
  ].filter(Boolean).join('   ·   ')
  doc.text(info, MARGIN + 4, y + 14)

  if (patient.insurance) {
    doc.text(`Convênio: ${patient.insurance}`, MARGIN + 4, y + 19)
  }

  return y + 26
}

// ── Report: Evolução ───────────────────────────────────────────────────────
export function generateEvolutionReport(
  patient: Patient,
  sessions: Session[],
  config: ClinicConfig
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFont('helvetica', 'normal')

  let y = addHeader(doc, config, 'Relatório de Evolução Clínica')

  // Patient block
  y = patientBlock(doc, patient, y)
  y += 4

  // Sessions
  const realizadas = sessions
    .filter(s => s.status === 'realizada')
    .sort((a, b) => a.date.localeCompare(b.date))

  y = section(doc, `Histórico de Sessões (${realizadas.length} sessões realizadas)`, y)

  if (realizadas.length === 0) {
    doc.setFontSize(9); setColor(doc, GRAY)
    doc.text('Nenhuma sessão realizada registrada.', MARGIN, y)
    y += 8
  } else {
    realizadas.forEach((s, idx) => {
      if (y > 255) { doc.addPage(); y = 20 }

      // Session header
      fillColor(doc, [250, 248, 245])
      doc.rect(MARGIN, y, PW, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      setColor(doc, DARK)
      const dateLabel = format(parseISO(s.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
      doc.text(`Sessão ${idx + 1}  ·  ${dateLabel}  ·  ${s.time}  ·  ${s.modality === 'online' ? 'Online' : 'Presencial'}`, MARGIN + 3, y + 5)
      y += 10

      y = field(doc, 'Queixa principal', s.demands, y, 3)
      y = field(doc, 'Descrição da demanda', s.descricaoDemanda, y, 3)
      y = field(doc, 'Resumo da sessão', s.resumoSessao, y, 3)
      y = field(doc, 'Intervenções', s.interventions, y, 3)
      y = field(doc, 'Evolução clínica', s.evolution, y, 3)
      y = field(doc, 'Notas clínicas', s.clinicalNotes, y, 3)
      y = field(doc, 'Observações', s.observacoes, y, 3)

      if (idx < realizadas.length - 1) {
        drawColor(doc, [230, 225, 220])
        doc.setLineWidth(0.2)
        doc.line(MARGIN + 6, y, 210 - MARGIN, y)
        y += 4
      }
    })
  }

  addFooter(doc, config)
  doc.save(`relatorio-evolucao-${patient.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ── Report: Encaminhamento ─────────────────────────────────────────────────
export function generateReferralReport(
  patient: Patient,
  anamnese: Anamnese | undefined,
  plano: PlanoTerapeutico | undefined,
  sessions: Session[],
  config: ClinicConfig
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFont('helvetica', 'normal')

  let y = addHeader(doc, config, 'Relatório de Encaminhamento')

  // Patient block
  y = patientBlock(doc, patient, y)
  y += 4

  // Identification
  y = section(doc, 'Identificação e Queixa Principal', y)
  y = field(doc, 'Queixa principal', anamnese?.queixaPrincipal, y)
  y = field(doc, 'História da queixa', anamnese?.historiaQueixa, y)
  y = field(doc, 'Aspectos emocionais', anamnese?.aspectosEmocionais, y)

  // Clinical hypotheses
  if (anamnese?.hipotesesDiagnosticas || anamnese?.cid10) {
    y = section(doc, 'Hipóteses Diagnósticas', y)
    y = field(doc, 'Hipóteses', anamnese?.hipotesesDiagnosticas, y)
    y = field(doc, 'CID-10', anamnese?.cid10, y)
  }

  // Therapeutic plan
  if (plano?.objetivos || plano?.estrategias) {
    y = section(doc, 'Plano Terapêutico', y)
    y = field(doc, 'Objetivos terapêuticos', plano?.objetivos, y)
    y = field(doc, 'Estratégias', plano?.estrategias, y)
    y = field(doc, 'Direcionamentos', plano?.direcionamentos, y)
    if (plano?.modalidadeTratamento) {
      y = field(doc, 'Modalidade', plano.modalidadeTratamento, y)
    }
    if (plano?.frequenciaSessoes) {
      y = field(doc, 'Frequência', plano.frequenciaSessoes, y)
    }
  }

  // Sessions summary
  const realizadas = sessions.filter(s => s.status === 'realizada')
  if (realizadas.length > 0) {
    y = section(doc, `Resumo do Atendimento (${realizadas.length} sessões)`, y)
    doc.setFontSize(9); setColor(doc, GRAY)
    const lastSession = realizadas[realizadas.length - 1]
    doc.text(`Período: ${format(parseISO(realizadas[0].date), "d/MM/yyyy")} a ${format(parseISO(lastSession.date), "d/MM/yyyy")}`, MARGIN, y)
    y += 7

    // Last evolution note
    const lastEvolution = [...realizadas].reverse().find(s => s.evolution)
    y = field(doc, 'Evolução mais recente', lastEvolution?.evolution, y)
  }

  // Signature space
  if (y > 240) { doc.addPage(); y = 30 }
  else y += 14

  drawColor(doc, DARK)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, MARGIN + 70, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setColor(doc, DARK)
  doc.text(config.psychologistName, MARGIN, y)
  if (config.crp) {
    y += 5
    doc.text(`CRP ${config.crp}`, MARGIN, y)
  }
  y += 5
  doc.text(format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR }), MARGIN, y)

  addFooter(doc, config)
  doc.save(`encaminhamento-${patient.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
