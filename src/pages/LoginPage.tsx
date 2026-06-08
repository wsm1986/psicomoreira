import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Lock, KeyRound, Eye, EyeOff, Heart, Mail } from 'lucide-react'
import { usePsicoStore } from '../store/store'
import { firebaseAuth, firebaseEnabled } from '../config/firebase'
import styles from './LoginPage.module.css'

type Tab = 'psicologa' | 'paciente'

export function LoginPage() {
  const navigate          = useNavigate()
  const loginPsicologa    = usePsicoStore(s => s.loginPsicologa)
  const loginPaciente     = usePsicoStore(s => s.loginPaciente)
  const loginWithFirebase = usePsicoStore(s => s.loginWithFirebase)
  const config            = usePsicoStore(s => s.config)

  const requireEmail = Boolean(config.email)

  const [tab,      setTab]      = useState<Tab>('psicologa')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [code,     setCode]     = useState('')
  const [show,     setShow]     = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  function resetForm() {
    setEmail('')
    setPassword('')
    setCode('')
    setError('')
  }

  // ── Login da psicóloga ────────────────────────────────────────────────────
  async function handlePsicologaLogin() {
    setLoading(true)
    setError('')

    // ── Caminho Firebase (se configurado) ──────────────────────────────────
    if (firebaseEnabled && firebaseAuth) {
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password)
        await loginWithFirebase(cred.user.uid)
        navigate('/admin/dashboard')
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? ''
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setError('E-mail ou senha incorretos.')
        } else if (code === 'auth/invalid-email') {
          setError('E-mail inválido.')
        } else if (code === 'auth/too-many-requests') {
          setError('Muitas tentativas. Aguarde alguns minutos.')
        } else {
          setError('Erro ao conectar. Verifique sua internet.')
        }
        setLoading(false)
      }
      return
    }

    // ── Caminho local (sem Firebase) ───────────────────────────────────────
    setTimeout(() => {
      const ok = loginPsicologa(password, requireEmail ? email : undefined)
      if (ok) navigate('/admin/dashboard')
      else    setError(requireEmail ? 'E-mail ou senha incorretos.' : 'Senha incorreta.')
      setLoading(false)
    }, 400)
  }

  // ── Login do paciente (sempre local) ─────────────────────────────────────
  function handlePacienteLogin() {
    setLoading(true)
    setError('')
    setTimeout(() => {
      const ok = loginPaciente(code)
      if (ok) navigate('/paciente')
      else    setError('Código não encontrado. Verifique com sua psicóloga.')
      setLoading(false)
    }, 400)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tab === 'psicologa') handlePsicologaLogin()
    else                     handlePacienteLogin()
  }

  const canSubmit = tab === 'psicologa'
    ? (firebaseEnabled
        ? email.trim() && password.trim()
        : (requireEmail ? email.trim() && password.trim() : password.trim())
      )
    : code.trim()

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
            onClick={() => { setTab('psicologa'); resetForm() }}
          >
            <Lock size={13}/> Psicóloga
          </button>
          <button
            className={`${styles.tab} ${tab === 'paciente' ? styles.tabActive : ''}`}
            onClick={() => { setTab('paciente'); resetForm() }}
          >
            <KeyRound size={13}/> Sou paciente
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {tab === 'psicologa' ? (
            <>
              <p className={styles.welcomeText}>Bem-vinda de volta 🌿</p>

              {/* E-mail — sempre quando Firebase está ativo */}
              {(firebaseEnabled || requireEmail) && (
                <div className={styles.field}>
                  <label className={styles.label}>E-mail</label>
                  <div className={styles.inputWrap}>
                    <Mail size={15} className={styles.inputIcon}/>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`${styles.inputWithIcon} ${error ? styles.inputError : ''}`}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Senha</label>
                <div className={styles.inputWrap}>
                  <input
                    type={show ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={error ? styles.inputError : ''}
                    autoFocus={!firebaseEnabled && !requireEmail}
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
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className={error ? styles.inputError : ''}
                  autoFocus
                  style={{ textTransform:'uppercase', letterSpacing:'0.12em', fontFamily:'DM Mono, monospace' }}
                />
                <span className={styles.hint}>Código fornecido pela sua psicóloga</span>
              </div>
            </>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button type="submit" className={styles.btnSubmit} disabled={!canSubmit || loading}>
            {loading ? <span className={styles.spinner}/> : 'Entrar'}
          </button>
        </form>

        <p className={styles.footer}>🔒 Seus dados são protegidos conforme a LGPD</p>
      </div>

      {/* Help panel */}
      <div className={styles.helpCard}>
        <p className={styles.helpTitle}>📋 Como acessar</p>
        <div className={styles.helpItem}>
          <Lock size={12}/>
          <strong>Psicóloga</strong>
          {firebaseEnabled
            ? <span>→ e-mail + senha do Firebase</span>
            : requireEmail
            ? <span>→ e-mail + senha cadastrados</span>
            : <span>→ senha: <code className={styles.code}>psico2025</code></span>
          }
        </div>
        <div className={styles.helpItem}>
          <KeyRound size={12}/> <strong>Paciente</strong>
          <span>→ código gerado no cadastro</span>
        </div>
      </div>
    </div>
  )
}
