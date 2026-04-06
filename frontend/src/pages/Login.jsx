import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

const DEMO_USERS = [
  { label: 'Admin',      user: 'admin',      pass: 'admin123',   role: 'Full access', color: '#7C3AED' },
  { label: 'Doctor',     user: 'drpriya',    pass: 'doctor123',  role: 'OPD + Notes', color: '#2563EB' },
  { label: 'Reception',  user: 'reception1', pass: 'recep123',   role: 'Front Office',color: '#0891B2' },
  { label: 'Nurse',      user: 'nurse1',     pass: 'nurse123',   role: 'OPD + Queue', color: '#059669' },
  { label: 'Billing',    user: 'billing1',   pass: 'billing123', role: 'Billing only',color: '#D97706' },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  function fillUser(u) { setUsername(u.user); setPassword(u.pass); setError('') }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#1E1B4B 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      {/* Decorative blobs */}
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'rgba(37,99,235,0.15)', filter:'blur(80px)', top:-100, right:-100, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(124,58,237,0.1)', filter:'blur(60px)', bottom:-80, left:-80, pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, background:'linear-gradient(135deg,#2563EB,#7C3AED)', borderRadius:20, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:16, boxShadow:'0 8px 32px rgba(37,99,235,0.4)' }}>🏥</div>
          <div style={{ fontSize:28, fontWeight:800, color:'white', letterSpacing:-0.5 }}>MedOS</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:4 }}>Hospital Management System</div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.03)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, padding:32, boxShadow:'0 32px 64px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'white', marginBottom:4 }}>Sign in to your account</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:24 }}>Role-based access · Secure · DPDP compliant</div>

          {error && (
            <div style={{ background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 14px', color:'#FCA5A5', fontSize:13, marginBottom:16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.6)', display:'block', marginBottom:6 }}>Username</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" required autoFocus
                style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, color:'white', fontSize:14, outline:'none', transition:'border 0.15s', fontFamily:'inherit' }}
                onFocus={e=>e.target.style.borderColor='rgba(37,99,235,0.8)'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.6)', display:'block', marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required
                style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, color:'white', fontSize:14, outline:'none', transition:'border 0.15s', fontFamily:'inherit' }}
                onFocus={e=>e.target.style.borderColor='rgba(37,99,235,0.8)'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#2563EB,#1D4ED8)', border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:4, fontFamily:'inherit' }}>
              {loading ? <><span className="spinner spinner-sm" style={{borderTopColor:'white',borderColor:'rgba(255,255,255,0.3)'}}/>Signing in…</> : '→ Sign in'}
            </button>
          </form>

          {/* Demo quick-access */}
          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Quick Demo Login</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {DEMO_USERS.map(u => (
                <button key={u.user} onClick={() => fillUser(u)}
                  style={{ padding:'5px 10px', background:'rgba(255,255,255,0.06)', border:`1px solid ${u.color}40`, borderRadius:8, color:'white', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' }}
                  onMouseEnter={e => { e.target.style.background=`${u.color}25`; e.target.style.borderColor=u.color }}
                  onMouseLeave={e => { e.target.style.background='rgba(255,255,255,0.06)'; e.target.style.borderColor=`${u.color}40` }}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'rgba(255,255,255,0.25)' }}>
          v2.0 · Node.js + SQLite · JWT Auth · DPDP + GST Compliant
        </div>
      </div>
    </div>
  )
}
