import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'

// ── Toast System ──────────────────────────────────────────────────────────────
export const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, type='info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' }
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-container" style={{ zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span className="toast-text">{t.msg}</span>
            <button className="toast-close" onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Role-based nav ────────────────────────────────────────────────────────────
const NAV = [
  { path:'/dashboard',    label:'Dashboard',      icon:'📊', roles:['reception','doctor','nurse','billing','admin','pharmacist'] },
  { path:'/front-office', label:'Front Office',   icon:'🏢', roles:['reception','nurse','admin'] },
  { path:'/appointments', label:'Appointments',   icon:'📅', roles:['reception','doctor','nurse','admin'] },
  { path:'/opd',          label:'OPD',            icon:'🩺', roles:['doctor','nurse','admin'] },
  { path:'/ipd',          label:'IPD / Wards',    icon:'🛏️', roles:['doctor','nurse','admin','reception'] },
  { path:'/pharmacy',     label:'Pharmacy',       icon:'💊', roles:['pharmacist','admin'] },
  { path:'/billing',      label:'Billing',        icon:'💳', roles:['billing','admin'] },
  { path:'/reports',      label:'Reports',        icon:'📈', roles:['admin','billing'] },
  { path:'/admin',        label:'Administration', icon:'⚙️', roles:['admin'] },
]

function Dock() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const items = NAV.filter(n => n.roles.includes(user?.role))
  
  return (
    <div className="floating-dock">
      <div style={{ display:'flex', alignItems:'center', gap:8, paddingRight:16, borderRight:'1px solid rgba(255,255,255,0.1)', marginRight:8 }}>
         <div style={{ background:'linear-gradient(135deg, var(--primary), var(--purple))', width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, boxShadow:'0 0 15px var(--primary-glow)' }}>🏥</div>
         <span style={{ fontWeight:800, color:'white', fontSize:15, letterSpacing:'-0.5px' }}>MedOS</span>
      </div>
      
      {items.map(item => (
        <NavLink key={item.path} to={item.path} className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`} title={item.label}>
          <span style={{ fontSize:16, lineHeight:1 }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div style={{ borderLeft:'1px solid rgba(255,255,255,0.1)', paddingLeft:16, marginLeft:8, display:'flex', alignItems:'center', gap:10 }}>
         <div className="btn btn-icon btn-ghost" style={{ background:'rgba(255,255,255,0.05)', borderRadius:'50%', width:32, height:32 }}>
           🔔
         </div>
         <div className="avatar avatar-sm" style={{ background:'var(--primary-50)', color:'var(--primary-light)', cursor:'pointer' }} onClick={() => { logout(); navigate('/login') }} title="Logout">
           {user?.name?.split(' ').map(w=>w[0]).slice(0,2).join('') || 'U'}
         </div>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <ToastProvider>
      <div className="spatial-container">
        <Dock />
        <div className="spatial-page-body">
          <Outlet />
        </div>
      </div>
    </ToastProvider>
  )
}
