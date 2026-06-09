import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'
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

  const [googleLoading, setGoogleLoading] = useState(false)
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

  // ── Login com Google ─────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    if (!firebaseAuth) return
    setGoogleLoading(true)
    setError('')
    const provider = new GoogleAuthProvider()
    try {
      // Popup no desktop, redirect no mobile/iOS
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
      let cred
      if (isMobile) {
        await signInWithRedirect(firebaseAuth, provider)
        return // página vai recarregar
      } else {
        cred = await signInWithPopup(firebaseAuth, provider)
      }
      await loginWithFirebase(cred.user.uid)
      navigate('/admin/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // usuário fechou — não mostra erro
      } else if (code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado no Firebase. Adicione o domínio em Authentication → Settings → Domínios autorizados.')
      } else {
        setError('Erro ao entrar com Google. Tente novamente.')
      }
      setGoogleLoading(false)
    }
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

              {/* Botão Google — só aparece quando Firebase está ativo */}
              {firebaseEnabled && (
                <>
                  <button
                    type="button"
                    className={styles.btnGoogle}
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <span className={styles.spinner}/>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                        <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
                        <path fill="#FBBC05" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8L6 33c3.2 6.5 9.9 11 18 11z"/>
                        <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.2 5.2C42 35.8 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"/>
                      </svg>
                    )}
                    {googleLoading ? 'Entrando...' : 'Entrar com Google'}
                  </button>
                  <div className={styles.divider}><span>ou</span></div>
                </>
              )}

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
