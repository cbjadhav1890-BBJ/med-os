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
  { path:'/dashboard',    label:'Dashboard',      icon:'📊', roles:['reception','doctor','nurse','billing','admin','pharmacist'] },
  { path:'/front-office', label:'Front Office',    icon:'🏢', roles:['reception','nurse','admin'] },
  { path:'/appointments', label:'Appointments',    icon:'📅', roles:['reception','doctor','nurse','admin'] },
  { path:'/opd',          label:'OPD',             icon:'🩺', roles:['doctor','nurse','admin'] },
  { path:'/ipd',          label:'IPD / Wards',     icon:'🛏️', roles:['doctor','nurse','admin','reception'] },
  { path:'/pharmacy',     label:'Pharmacy',        icon:'💊', roles:['pharmacist','admin'] },
  { path:'/billing',      label:'Billing',         icon:'💳', roles:['billing','admin'] },
  { path:'/reports',      label:'Reports',         icon:'📈', roles:['admin','billing'] },
  { path:'/admin',        label:'Administration',  icon:'⚙️', roles:['admin'] },
]

const ROLE_COLORS = { admin:'#a855f7', doctor:'#6366f1', nurse:'#10b981', reception:'#06b6d4', billing:'#f59e0b', pharmacist:'#ec4899' }
const ROLE_LABELS = { admin:'Administrator', doctor:'Physician', nurse:'Nurse', reception:'Reception', billing:'Billing', pharmacist:'Pharmacist' }

function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const items = NAV.filter(n => n.roles.includes(user?.role))
  const initials = user?.name?.split(' ').map(w=>w[0]).slice(0,2).join('') || 'U'
  const roleColor = ROLE_COLORS[user?.role] || '#64748B'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🏥</div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">MedOS</div>
          <div className="sidebar-brand-sub">v3.0 · Premium</div>
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

      {/* Clock */}
      <div style={{ padding:'0 12px 8px' }}>
        <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:'12px 14px', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 }}>Today</div>
          <ClockWidget />
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => { logout(); navigate('/login') }}>
          <div className="avatar avatar-md" style={{ background:`${roleColor}20`, color:roleColor, fontSize:13 }}>{initials}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="sidebar-user-name truncate">{user?.name}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[user?.role]}</div>
          </div>
          <span style={{ color:'var(--text-3)', fontSize:13 }}>↩</span>
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
      <div style={{ fontSize:20, fontWeight:800, color:'var(--text-white)', fontVariantNumeric:'tabular-nums', letterSpacing:-0.5 }}>
        {now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })}
      </div>
      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
        {now.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
      </div>
    </div>
  )
}

const PAGE_META = {
  '/dashboard':    { title:'Dashboard',       desc:'Command center — real-time hospital intelligence' },
  '/front-office': { title:'Front Office',    desc:'Patient registration, queue & DPDP consent' },
  '/appointments': { title:'Appointments',    desc:'Schedule & manage patient appointments' },
  '/opd':          { title:'OPD',             desc:'Outpatient encounters, AI notes & prescriptions' },
  '/ipd':          { title:'IPD / Wards',     desc:'Inpatient admissions, rooms & discharge' },
  '/pharmacy':     { title:'Pharmacy',        desc:'Medicine catalog, stock & dispensing' },
  '/billing':      { title:'Billing',         desc:'Charges, GST invoices & payment tracking' },
  '/reports':      { title:'Reports',         desc:'Financial analytics & stock intelligence' },
  '/admin':        { title:'Administration',  desc:'Users, audit log & system settings' },
}

function Header() {
  const location = useLocation()
  const { user } = useAuthStore()
  const meta = PAGE_META[location.pathname] || { title:'MedOS', desc:'' }
  const roleColor = ROLE_COLORS[user?.role] || '#64748B'
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
        <div className="avatar avatar-md" style={{ background:`${roleColor}20`, color:roleColor }}>
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
