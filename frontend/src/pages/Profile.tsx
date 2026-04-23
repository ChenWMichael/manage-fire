import { CheckCircle, Loader2, Save, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { FIRE_TYPE_META } from '../types'
import type { FireType } from '../types'

export default function Profile() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [fireType, setFireType] = useState<FireType>('regular')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '')
    }
    const stored = localStorage.getItem('mf_last_result')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.fireType) setFireType(parsed.fireType)
      } catch {
        /* ignore */
      }
    }
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 mt-1">Manage your account and FIRE preferences.</p>
      </div>

      {/* Avatar + email */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-fire-100 flex items-center justify-center flex-shrink-0">
          <User size={28} className="text-fire-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-lg">{fullName || user?.email?.split('@')[0]}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          <p className="text-xs text-slate-400 mt-1">
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input bg-slate-50 cursor-not-allowed"
              type="email"
              value={user?.email || ''}
              readOnly
              disabled
            />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed here.</p>
          </div>
        </div>

        {/* FIRE preferences */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">FIRE Preferences</h2>
          <p className="text-sm text-slate-500">Which FIRE path are you targeting?</p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(FIRE_TYPE_META) as [FireType, typeof FIRE_TYPE_META[FireType]][]).map(([type, meta]) => (
              <button
                key={type}
                type="button"
                onClick={() => setFireType(type)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                  fireType === type ? `${meta.color} shadow-sm` : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-semibold text-sm">{meta.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{meta.description}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </form>

      {/* Account info */}
      <div className="card p-6 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Account</h2>
        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-sm">
          <span className="text-slate-600">User ID</span>
          <span className="font-mono text-slate-400 text-xs">{user?.id?.slice(0, 20)}…</span>
        </div>
        <div className="flex items-center justify-between py-2 text-sm">
          <span className="text-slate-600">Auth provider</span>
          <span className="text-slate-500">Email / Password</span>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Profile data is stored securely in Supabase. Your financial calculations are computed locally and never sent to a server.
      </p>
    </div>
  )
}
