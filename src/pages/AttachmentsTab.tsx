import { useRef, useState } from 'react'
import { Upload, FileText, Trash2, Download, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePsicoStore } from '../store/store'
import styles from './AttachmentsTab.module.css'

const MAX_FILE_BYTES = 2 * 1024 * 1024   // 2 MB per file
const WARN_TOTAL_MB  = 3                  // warn when total > 3 MB

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsTab({ patientId }: { patientId: string }) {
  const attachments    = usePsicoStore(s => s.attachments)
  const addAttachment  = usePsicoStore(s => s.addAttachment)
  const deleteAttachment = usePsicoStore(s => s.deleteAttachment)

  const patientFiles = attachments.filter(a => a.patientId === patientId)
  const totalBytes   = patientFiles.reduce((sum, a) => sum + a.size, 0)

  const [dragging, setDragging] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" excede o limite de 2 MB por arquivo.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        addAttachment({
          patientId,
          name:     file.name,
          size:     file.size,
          mimeType: file.type,
          dataUrl,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleDownload(id: string) {
    const att = attachments.find(a => a.id === id)
    if (!att) return
    const link = document.createElement('a')
    link.href     = att.dataUrl
    link.download = att.name
    link.click()
  }

  function handleDelete(id: string) {
    if (!confirm('Remover este arquivo?')) return
    deleteAttachment(id)
  }

  const warnStorage = totalBytes > WARN_TOTAL_MB * 1024 * 1024

  return (
    <div className={styles.page}>

      {/* Storage warning */}
      {warnStorage && (
        <div className={styles.warning}>
          <AlertTriangle size={14}/>
          Atenção: você está usando {fmtSize(totalBytes)} de armazenamento neste paciente.
          O navegador tem limite de ~5 MB total. Considere remover arquivos antigos.
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`${styles.dropzone} ${dragging ? styles.dropzoneDragging : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
      >
        <Upload size={28} className={styles.dropIcon}/>
        <p className={styles.dropText}>
          Arraste arquivos aqui ou <span className={styles.dropLink}>clique para selecionar</span>
        </p>
        <p className={styles.dropHint}>PDF, imagens, laudos — máx. 2 MB por arquivo</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="application/pdf,image/*,.doc,.docx"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.error}>
          <AlertTriangle size={13}/> {error}
        </div>
      )}

      {/* File list */}
      {patientFiles.length === 0 ? (
        <p className={styles.empty}>Nenhum arquivo anexado ainda.</p>
      ) : (
        <div className={styles.fileList}>
          {patientFiles.map(att => (
            <div key={att.id} className={styles.fileRow}>
              <FileText size={20} className={styles.fileIcon}/>
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{att.name}</span>
                <span className={styles.fileInfo}>
                  {fmtSize(att.size)} · {format(parseISO(att.createdAt), "d/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className={styles.fileActions}>
                <button
                  className={styles.btnIcon}
                  title="Baixar"
                  onClick={() => handleDownload(att.id)}
                >
                  <Download size={15}/>
                </button>
                <button
                  className={`${styles.btnIcon} ${styles.btnDanger}`}
                  title="Remover"
                  onClick={() => handleDelete(att.id)}
                >
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          ))}

          <p className={styles.totalInfo}>
            Total: {patientFiles.length} arquivo{patientFiles.length !== 1 ? 's' : ''} · {fmtSize(totalBytes)}
          </p>
        </div>
      )}
    </div>
  )
}
