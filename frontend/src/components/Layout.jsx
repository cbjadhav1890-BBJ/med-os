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
      <div className="toast-container">
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
  { path:'/dashboard',    label:'Dashboard',    icon:'📊', roles:['reception','doctor','nurse','billing','admin'] },
  { path:'/front-office', label:'Front Office', icon:'🏢', roles:['reception','nurse','admin'] },
  { path:'/opd',          label:'OPD',          icon:'🩺', roles:['doctor','nurse','admin'] },
  { path:'/billing',      label:'Billing',      icon:'💳', roles:['billing','admin'] },
  { path:'/admin',        label:'Administration', icon:'⚙️', roles:['admin'] },
]

const ROLE_COLORS = { admin:'#7C3AED', doctor:'#2563EB', nurse:'#059669', reception:'#0891B2', billing:'#D97706' }
const ROLE_LABELS = { admin:'Administrator', doctor:'Physician', nurse:'Nurse', reception:'Reception', billing:'Billing Officer' }

function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const items = NAV.filter(n => n.roles.includes(user?.role))
  const initials = user?.name?.split(' ').map(w=>w[0]).slice(0,2).join('') || 'U'
  const roleColor = ROLE_COLORS[user?.role] || '#64748B'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🏥</div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">MedOS HMS</div>
          <div className="sidebar-brand-sub">v2.0 · Live</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        {items.map(item => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span style={{ fontSize:16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div style={{ flex:1 }} />

      {/* Quick stats */}
      <div style={{ padding:'0 12px 8px' }}>
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, color:'#64748B', fontWeight:600, textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 }}>Today</div>
          <ClockWidget />
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => { logout(); navigate('/login') }}>
          <div className="avatar avatar-md" style={{ background:`${roleColor}25`, color:roleColor, fontSize:13 }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="sidebar-user-name truncate">{user?.name}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[user?.role]}</div>
          </div>
          <span style={{ color:'#64748B', fontSize:13 }}>↩</span>
        </div>
      </div>
    </aside>
  )
}

function ClockWidget() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  return (
    <div>
      <div style={{ fontSize:18, fontWeight:700, color:'white', fontVariantNumeric:'tabular-nums', letterSpacing:-0.5 }}>
        {now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })}
      </div>
      <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>
        {now.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
      </div>
    </div>
  )
}

const PAGE_META = {
  '/dashboard': { title:'Dashboard', desc:'Overview of today\'s activity' },
  '/front-office': { title:'Front Office', desc:'Patient registration, queue & DPDP consent' },
  '/opd': { title:'OPD', desc:'Outpatient encounters, notes & prescriptions' },
  '/billing': { title:'Billing', desc:'Charges, GST invoices & payment tracking' },
  '/admin': { title:'Administration', desc:'Users, audit log & system settings' },
}

function Header() {
  const location = useLocation()
  const { user } = useAuthStore()
  const meta = PAGE_META[location.pathname] || { title:'MedOS', desc:'' }
  return (
    <div className="top-header">
      <div>
        <div className="header-title">{meta.title}</div>
        <div className="header-subtitle">{meta.desc}</div>
      </div>
      <div className="header-spacer" />
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{user?.name}</div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{user?.department || 'MedOS'}</div>
        </div>
        <div className="avatar avatar-md avatar-blue" style={{ background:`${ROLE_COLORS[user?.role] || '#64748B'}20`, color:ROLE_COLORS[user?.role] || '#64748B' }}>
          {user?.name?.split(' ').map(w=>w[0]).slice(0,2).join('')}
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <div className="page-body">
            <Outlet />
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}
