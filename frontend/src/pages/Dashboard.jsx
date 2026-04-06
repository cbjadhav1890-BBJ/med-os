import { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

const ACTION_ICONS = { LOGIN:'🔑', REGISTER_PATIENT:'👤', CREATE_ENCOUNTER:'📋', SIGN_ENCOUNTER:'✍️', CREATE_INVOICE:'🧾', GENERATE_AI_NOTE:'🤖', UPDATE_PATIENT:'✏️', CREATE_ORDER:'🔬', ADD_TO_QUEUE:'🔢', CREATE_CHARGE:'💰', default:'📌' }

function StatCard({ icon, value, label, sub, color, trend }) {
  return (
    <div className="stats-card">
      <div className="stats-card-icon" style={{ background:`${color}15` }}>{icon}</div>
      <div className="stats-card-value">{typeof value==='number' && value>999 ? `₹${(value/1000).toFixed(1)}k` : value}</div>
      <div className="stats-card-label">{label}</div>
      {sub && <div className="stats-card-trend up">{sub}</div>}
      <div className="stats-card-bg">{icon}</div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    api.get('/dashboard/stats').then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const s = data?.stats || {}

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400, gap:12 }}>
      <div className="spinner spinner-lg" />
      <span style={{ color:'var(--text-3)', fontSize:14 }}>Loading dashboard…</span>
    </div>
  )

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:-0.5 }}>
            Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, {user?.name?.split(' ')[0]} 👋
          </div>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => window.location.reload()}>↻ Refresh</button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom:24 }}>
        <StatCard icon="👥" value={s.patients_today||0}  label="Patients Today"   sub={`${s.total_patients||0} total registered`}  color="#2563EB" />
        <StatCard icon="🩺" value={s.encounters_today||0} label="Encounters Today" sub={`${s.open_encounters||0} still open`}        color="#7C3AED" />
        <StatCard icon="🔢" value={s.queue_waiting||0}    label="Queue Waiting"    sub="Real-time"                                   color="#D97706" />
        <StatCard icon="💰" value={s.revenue_today||0}    label="Revenue Today"    sub={`₹${((s.revenue_month||0)/1000).toFixed(1)}k this month`} color="#059669" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        {/* Second row stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <StatCard icon="⚠️"  value={s.dpdp_pending||0}  label="DPDP Pending"  color="#EF4444" />
          <StatCard icon="🧾"  value={s.total_invoices||0} label="Total Invoices" color="#0891B2" />
          <StatCard icon="⏳"  value={`₹${((s.pending_charges||0)/1000).toFixed(1)}k`} label="Pending Charges" color="#D97706" />
          <StatCard icon="📈"  value={`₹${((s.revenue_month||0)/1000).toFixed(1)}k`} label="Month Revenue" color="#059669" />
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>👤</span>
            <div>
              <div className="card-title">Recent Registrations</div>
              <div className="card-subtitle">{data?.recent_patients?.length || 0} latest patients</div>
            </div>
          </div>
          <div style={{ overflow:'hidden' }}>
            {data?.recent_patients?.length ? data.recent_patients.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:'1px solid var(--border)' }}>
                <div className="avatar avatar-sm avatar-blue">{p.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }} className="truncate">{p.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>{p.uhid} · {p.age}y {p.gender}</div>
                </div>
                <div>
                  <span className={`badge ${p.dpdp_consent ? 'badge-success' : 'badge-warning'}`}>
                    {p.dpdp_consent ? 'Consent ✓' : 'No Consent'}
                  </span>
                </div>
              </div>
            )) : <div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-title">No patients yet</div></div>}
          </div>
        </div>
      </div>

      {/* Activity Feed + Doctors */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>📋</span>
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Immutable audit trail</div>
            </div>
          </div>
          <div style={{ maxHeight:320, overflowY:'auto' }}>
            {data?.recent_activity?.length ? data.recent_activity.map((a, i) => {
              let det = {}; try { det = JSON.parse(a.details||'{}') } catch {}
              return (
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 20px', borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{ACTION_ICONS[a.action] || ACTION_ICONS.default}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{a.action.replace(/_/g,' ')}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>by {a.username} ({a.user_role}){det.name ? ` · ${det.name}` : det.uhid ? ` · ${det.uhid}` : ''}</div>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-3)', flexShrink:0, marginTop:2 }}>
                    {new Date(a.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              )
            }) : <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No activity yet</div></div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>👨‍⚕️</span>
            <div><div className="card-title">Doctors on Duty</div></div>
          </div>
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
            {data?.doctors?.map(d => (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--surface-2)', borderRadius:10 }}>
                <div className="avatar avatar-sm avatar-blue">{d.name.replace('Dr. ','').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }} className="truncate">{d.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>{d.department}</div>
                </div>
                <span className="badge badge-success"><span className="badge-dot" style={{ background:'var(--success)' }}/>Active</span>
              </div>
            ))}
          </div>
          {/* DPDP compliance bar */}
          <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)' }}>DPDP Compliance</span>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--success)' }}>
                {s.total_patients ? Math.round(((s.total_patients - (s.dpdp_pending||0)) / s.total_patients) * 100) : 0}%
              </span>
            </div>
            <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'var(--success)', borderRadius:99, width:`${s.total_patients ? ((s.total_patients-(s.dpdp_pending||0))/s.total_patients*100) : 0}%`, transition:'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4 }}>{s.dpdp_pending||0} patients need consent</div>
          </div>
        </div>
      </div>
    </div>
  )
}
