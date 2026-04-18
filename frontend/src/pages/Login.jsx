import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

const DEMOS = [
  { label: 'Admin', u: 'admin', p: 'admin123', icon: '⚙️' },
  { label: 'Doctor', u: 'drpriya', p: 'doctor123', icon: '🩺' },
  { label: 'Reception', u: 'reception1', p: 'recep123', icon: '🏢' },
  { label: 'Nurse', u: 'nurse1', p: 'nurse123', icon: '💉' },
  { label: 'Billing', u: 'billing1', p: 'billing123', icon: '💳' },
  { label: 'Pharmacy', u: 'pharma1', p: 'pharma123', icon: '💊' },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuthStore()

  async function handleLogin(u, p) {
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username: u || username, password: p || password })
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glow-orb" style={{
          width: 60 + i * 40, height: 60 + i * 40,
          background: i % 3 === 0 ? 'var(--primary)' : i % 3 === 1 ? 'var(--purple)' : 'var(--cyan)',
          top: `${10 + i * 15}%`, left: `${5 + i * 16}%`,
          animation: `loginOrb${(i % 2) + 1} ${12 + i * 3}s ease-in-out infinite`,
          animationDelay: `${i * -2}s`,
        }} />
      ))}

      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">🏥</div>
          <div className="login-brand-name">MedOS</div>
          <div className="login-brand-sub">Hospital Management System</div>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: 'var(--danger-light)', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>❌</span> {error}
          </div>
        )}

        <form className="login-form" onSubmit={e => { e.preventDefault(); handleLogin() }}>
          <div className="login-input-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Enter username" autoFocus required />
          </div>
          <div className="login-input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter password" required />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} /> Signing in…</> : '→ Sign In'}
          </button>
        </form>

        <div className="demo-logins">
          <div className="demo-logins-label">Quick Demo Login</div>
          <div className="demo-logins-row">
            {DEMOS.map(d => (
              <button key={d.u} className="demo-btn" onClick={() => { setUsername(d.u); setPassword(d.p); handleLogin(d.u, d.p) }}>
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="login-footer">
          v3.0 · Node.js + SQLite · JWT Auth · DPDP + GST Compliant
        </div>
      </div>
    </div>
  )
}
