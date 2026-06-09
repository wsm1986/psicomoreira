import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { usePsicoStore } from '../store/store'
import { firebaseAuth } from '../config/firebase'
import { APP_VERSION } from '../config/app'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const navigate          = useNavigate()
  const loginWithFirebase = usePsicoStore(s => s.loginWithFirebase)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleGoogleLogin() {
    if (!firebaseAuth) {
      setError('Firebase não configurado. Verifique as variáveis de ambiente.')
      return
    }
    setLoading(true)
    setError('')
    const provider = new GoogleAuthProvider()
    try {
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
      if (isMobile) {
        await signInWithRedirect(firebaseAuth, provider)
        return
      }
      const cred = await signInWithPopup(firebaseAuth, provider)
      await loginWithFirebase(cred.user.uid)
      toast.success(`Bem-vinda, ${cred.user.displayName?.split(' ')[0] ?? 'Joselaine'}! 🌿`)
      navigate('/admin/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // usuário fechou — sem mensagem
      } else if (code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado. Adicione-o em Firebase → Authentication → Domínios autorizados.')
      } else {
        setError('Erro ao entrar com Google. Tente novamente.')
      }
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.blob1}/>
      <div className={styles.blob2}/>

      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Heart size={22} strokeWidth={1.6}/>
          </div>
          <div>
            <h1 className={styles.brandName}>PsicoMoreira</h1>
            <p className={styles.brandSub}>Sistema de Gestão Clínica</p>
          </div>
        </div>

        <p className={styles.welcomeText}>Bem-vinda de volta 🌿</p>
        <p className={styles.welcomeSub}>Entre com sua conta Google para acessar o sistema.</p>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <button
          type="button"
          className={styles.btnGoogle}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className={styles.spinner}/>
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
              <path fill="#FBBC05" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8L6 33c3.2 6.5 9.9 11 18 11z"/>
              <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.2 5.2C42 35.8 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
          )}
          {loading ? 'Entrando...' : 'Entrar com Google'}
        </button>

        <p className={styles.footer}>🔒 Seus dados são protegidos conforme a LGPD · {APP_VERSION}</p>
      </div>
    </div>
  )
}
