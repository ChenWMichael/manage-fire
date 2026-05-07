import { Flame, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'register' | 'reset' | 'update-password'

export default function AuthPage() {
  const navigate = useNavigate()
  const { user, isRecoveryFlow } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isRecoveryFlow) {
      setMode('update-password')
    } else if (user) {
      navigate('/app/dashboard', { replace: true })
    }
  }, [user, isRecoveryFlow, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'update-password') {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        navigate('/app/dashboard', { replace: true })
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/app/dashboard')
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        })
        if (error) throw error
        setSuccess('Password reset email sent — check your inbox.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        <div className="w-9 h-9 bg-fire-500 rounded-xl flex items-center justify-center shadow-lg shadow-fire-500/20 group-hover:bg-fire-600 transition-colors">
          <Flame className="text-white" size={18} />
        </div>
        <span className="font-bold text-slate-900 text-xl tracking-tight">ManageFIRE</span>
      </Link>

      <div className="card w-full max-w-md p-8">
        {mode !== 'reset' && mode !== 'update-password' && (
          <div className="flex bg-slate-100 rounded-lg p-1 mb-7">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-150 ${
                  mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        )}

        <h1 className="text-xl font-bold text-slate-900 mb-1">
          {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Start your FIRE journey' : mode === 'update-password' ? 'Set new password' : 'Reset your password'}
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          {mode === 'login'
            ? 'Sign in to access your FIRE dashboard'
            : mode === 'register'
            ? 'Create a free account to get started'
            : mode === 'update-password'
            ? 'Choose a new password for your account.'
            : 'Enter your email and we\'ll send a reset link.'}
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 bg-fire-50 border border-fire-200 rounded-lg text-fire-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'update-password' ? (
            <div>
              <label htmlFor="auth-new-password" className="label">New password</label>
              <input
                id="auth-new-password"
                className="input"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          ) : (
            <>
              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-fullname" className="label">Full name</label>
                  <input
                    id="auth-fullname"
                    className="input"
                    type="text"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="label">Email</label>
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-password" className="label mb-0">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs text-fire-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    className="input"
                    type="password"
                    placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              )}
            </>
          )}
          <button type="submit" className="btn-primary w-full py-2.5 flex items-center justify-center gap-2" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'update-password' ? 'Update password' : 'Send reset link'}
          </button>
        </form>

        {mode === 'reset' ? (
          <p className="mt-5 text-center text-xs text-slate-400">
            Remember your password?{' '}
            <button onClick={() => switchMode('login')} className="text-fire-600 font-semibold hover:underline">
              Back to sign in
            </button>
          </p>
        ) : mode === 'update-password' ? null : (
          <p className="mt-5 text-center text-xs text-slate-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-fire-600 font-semibold hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        )}
      </div>

      <div className="mt-4 text-center">
        <Link to="/app/calculator" className="text-sm text-slate-500 hover:text-fire-600 transition-colors underline underline-offset-2">
          Skip sign-in — try the calculator now
        </Link>
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center max-w-xs">
        Not financial advice. ManageFIRE provides tools for educational purposes only.
      </p>
    </div>
  )
}
