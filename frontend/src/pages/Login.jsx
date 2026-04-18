import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuthStore()

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!username || !password) return setError('Username and password required');
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  function handleGoogleLogin() {
    setError('Google OAuth implies active Client ID. Currently mocked for UI.');
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#121212', // Clean minimalist dark background like ChatGPT dark mode
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        background: '#121212', // matching background so it looks flat and clean
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        {/* ChatGPT Style Logo Icon */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <svg style={{ width: 42, height: 42, color: '#fff' }} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M20.5002 0.333496C21.4394 10.6387 29.8614 19.0607 40.1668 20.0002C29.8614 20.9396 21.4394 29.3616 20.5002 39.6668C19.5609 29.3616 11.1389 20.9396 0.833496 20.0002C11.1389 19.0607 19.5609 10.6387 20.5002 0.333496Z" fill="currentColor"/>
          </svg>
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '24px', textAlign: 'center', letterSpacing: '-0.5px' }}>
          Welcome back
        </h1>

        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          {error && (
            <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              required
              style={{
                width: '100%', padding: '16px', fontSize: '16px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#10a37f'}
              onBlur={e => e.target.style.borderColor = '#333'}
            />
          </div>

          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              style={{
                width: '100%', padding: '16px', fontSize: '16px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#10a37f'}
              onBlur={e => e.target.style.borderColor = '#333'}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%', padding: '16px', fontSize: '16px', fontWeight: 500,
              background: '#10a37f', // ChatGPT primary green
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#0e906f'}
            onMouseOut={e => e.currentTarget.style.background = '#10a37f'}
          >
            {loading ? 'Continuing...' : 'Continue'}
          </button>
        </form>

        <div style={{ 
          display: 'flex', alignItems: 'center', width: '100%', margin: '24px 0', fontSize: '14px', color: '#666' 
        }}>
          <div style={{ flex: 1, height: '1px', background: '#333' }}></div>
          <span style={{ margin: '0 12px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#333' }}></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          type="button"
          style={{
            width: '100%', padding: '16px', fontSize: '16px', fontWeight: 500,
            background: 'transparent',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#1a1a1a'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg style={{ width: 22, height: 22 }} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ marginTop: '24px', fontSize: '14px', color: '#10a37f', cursor: 'pointer' }}>
          Mock Admin Credentials: <span onClick={() => { setUsername('admin'); setPassword('admin123') }}><u>admin / admin123</u></span>
        </div>
      </div>
    </div>
  )
}
