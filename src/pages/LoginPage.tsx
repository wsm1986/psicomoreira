import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, KeyRound, Eye, EyeOff, Heart } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import styles from './LoginPage.module.css'

type Tab = 'psicologa' | 'paciente'

export function LoginPage() {
  const navigate       = useNavigate()
  const loginPsicologa = usePsicoStore(s => s.loginPsicologa)
  const loginPaciente  = usePsicoStore(s => s.loginPaciente)

  const [tab,     setTab]     = useState<Tab>('psicologa')
  const [value,   setValue]   = useState('')
  const [show,    setShow]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      if (tab === 'psicologa') {
        const ok = loginPsicologa(value)
        if (ok) navigate('/admin/dashboard')
        else    setError('Senha incorreta. Tente novamente.')
      } else {
        const ok = loginPaciente(value)
        if (ok) navigate('/paciente')
        else    setError('Código não encontrado. Verifique com sua psicóloga.')
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div className={styles.page}>
      <div className={styles.blob1}/>
      <div className={styles.blob2}/>

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Heart size={22} strokeWidth={1.6}/>
          </div>
          <div>
            <h1 className={styles.brandName}>PsicoMoreira</h1>
            <p className={styles.brandSub}>Sistema de Gestão Clínica</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'psicologa' ? styles.tabActive : ''}`}
            onClick={() => { setTab('psicologa'); setValue(''); setError('') }}
          >
            <Lock size={13}/> Psicóloga
          </button>
          <button
            className={`${styles.tab} ${tab === 'paciente' ? styles.tabActive : ''}`}
            onClick={() => { setTab('paciente'); setValue(''); setError('') }}
          >
            <KeyRound size={13}/> Sou paciente
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {tab === 'psicologa' ? (
            <>
              <p className={styles.welcomeText}>Bem-vinda de volta 🌿</p>
              <div className={styles.field}>
                <label className={styles.label}>Senha de acesso</label>
                <div className={styles.inputWrap}>
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className={error ? styles.inputError : ''}
                    autoFocus
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShow(v => !v)} tabIndex={-1}>
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className={styles.welcomeText}>Olá! Informe seu código de acesso 🌸</p>
              <div className={styles.field}>
                <label className={styles.label}>Código de acesso</label>
                <input
                  type="text"
                  placeholder="Ex: MARIA2024"
                  value={value}
                  onChange={e => setValue(e.target.value.toUpperCase())}
                  className={error ? styles.inputError : ''}
                  autoFocus
                  style={{ textTransform:'uppercase', letterSpacing:'0.12em', fontFamily:'DM Mono, monospace' }}
                />
                <span className={styles.hint}>Código fornecido pela sua psicóloga</span>
              </div>
            </>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button type="submit" className={styles.btnSubmit} disabled={!value.trim() || loading}>
            {loading ? <span className={styles.spinner}/> : 'Entrar'}
          </button>
        </form>

        <p className={styles.footer}>🔒 Seus dados são protegidos conforme a LGPD</p>
      </div>
    </div>
  )
}
