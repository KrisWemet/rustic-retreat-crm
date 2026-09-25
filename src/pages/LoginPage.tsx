import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthLayout, { authField, authLabel, authLink, authPrimary } from '@/components/AuthLayout'
import { registerPortalAccount, requestPasswordReset, signIn } from '@/lib/supabase/auth'
import { getMyRole } from '@/lib/supabase/queries/portal'

type Mode = 'signin' | 'register' | 'forgot'

const copy: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  signin: { title: 'Welcome back', subtitle: 'Sign in to the venue CRM or your wedding portal.', submit: 'Sign in' },
  register: { title: 'Create your account', subtitle: 'Use your own email address. Each partner can have a separate account.', submit: 'Create account' },
  forgot: { title: 'Reset your password', subtitle: 'Enter your account email and we will send you a link to choose a new password.', submit: 'Send reset link' },
}

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  // An expired reset link sends people back here straight into the reset form.
  const [mode, setMode] = useState<Mode>(() => ((location.state as { mode?: Mode } | null)?.mode === 'forgot' ? 'forgot' : 'signin'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  const switchMode = (next: Mode) => {
    setMode(next)
    setErrorMessage(null)
    setNotice('')
    setPassword('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setNotice('')
    setIsSubmitting(true)

    if (mode === 'forgot') {
      const { error } = await requestPasswordReset(email)
      setIsSubmitting(false)
      // Same message whether or not the address has an account.
      if (error) setErrorMessage(error.message)
      else setNotice('If that email has an account, a reset link is on its way. Check your inbox and spam folder.')
      return
    }

    if (mode === 'register') {
      const { error } = await registerPortalAccount(email, password)
      setIsSubmitting(false)
      if (error) setErrorMessage(error.message)
      else setNotice('Account created. Check your email to verify it, then sign in. The venue team can link your account to your wedding.')
      return
    }

    const { data, error } = await signIn(email, password)

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (data?.user) {
      try {
        const role = await getMyRole()
        navigate(role === 'admin' ? '/admin/dashboard' : '/portal')
      } catch { setErrorMessage('Signed in, but could not verify your CRM role. Please try again.') }
      return
    }

    setErrorMessage('Unable to sign in. Please try again.')
  }

  const { title, subtitle, submit } = copy[mode]

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className={authLabel}>Email</label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authField}
          />
        </div>

        {mode !== 'forgot' && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className={authLabel}>Password</label>
              {mode === 'signin' && (
                <button type="button" onClick={() => switchMode('forgot')} className={authLink}>Forgot password?</button>
              )}
            </div>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'register' ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={authField}
            />
          </div>
        )}

        {errorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMessage}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p>}

        <button type="submit" disabled={isSubmitting} className={authPrimary}>
          {isSubmitting ? 'Please wait…' : submit}
        </button>
      </form>

      <div className="mt-8 border-t border-[var(--brand-accent)]/70 pt-6 text-center text-sm text-[var(--brand-text)]/70">
        {mode === 'signin' ? (
          <p>Getting married here? <button type="button" onClick={() => switchMode('register')} className={authLink}>Create a wedding portal account</button></p>
        ) : (
          <button type="button" onClick={() => switchMode('signin')} className={authLink}>Back to sign in</button>
        )}
      </div>
    </AuthLayout>
  )
}

export default LoginPage
