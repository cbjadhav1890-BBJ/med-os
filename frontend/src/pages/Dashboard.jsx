import { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    api.get('/dashboard/stats').then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding:80, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/><div style={{ color:'var(--text-3)', marginTop:16 }}>Loading dashboard…</div></div>

  if (!data) return <div style={{ padding:80, textAlign:'center', color:'var(--text-3)' }}>Failed to load dashboard data</div>

  const s = data.stats || {}

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:28, fontWeight:900, color:'var(--text-white)', letterSpacing:-1 }}>
          Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
        </div>
        <div style={{ fontSize:14, color:'var(--text-3)', marginTop:4 }}>
          Here's your hospital command center for {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid" style={{ marginBottom:24 }}>
        {[
          { icon:'👥', value:s.total_patients||0, label:'Total Patients', sub:`+${s.patients_today||0} today`, color:'var(--primary)' },
          { icon:'🩺', value:s.encounters_today||0, label:'Encounters Today', sub:`${s.open_encounters||0} open`, color:'var(--cyan)' },
          { icon:'💰', value:'₹'+((s.revenue_month||0)/1000).toFixed(1)+'k', label:'Revenue (Month)', sub:s.revenue_today>0?`₹${s.revenue_today} today`:'No revenue today', color:'var(--success)' },
          { icon:'🛏️', value:s.admitted_patients||0, label:'IPD Admitted', sub:`${s.queue_waiting||0} in queue`, color:'var(--purple)' },
          { icon:'💊', value:s.low_stock_items||0, label:'Low Stock Items', sub:s.low_stock_items>0?'Needs attention':'All OK', color: s.low_stock_items>0?'var(--warning)':'var(--success)' },
        ].map((stat,i) => (
          <div key={stat.label} className="stats-card" style={{ animationDelay:`${i*0.08}s` }}>
            <div className="stats-card-icon" style={{ background:`${stat.color}15` }}>{stat.icon}</div>
            <div className="stats-card-value">{stat.value}</div>
            <div className="stats-card-label">{stat.label}</div>
            {stat.sub && <div className="stats-card-trend">{stat.sub}</div>}
            <div className="stats-card-bg">{stat.icon}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Recent Registrations */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>👥</span>
            <div><div className="card-title">Recent Registrations</div><div className="card-subtitle">Latest patients</div></div>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>UHID</th><th>Patient</th><th>Age</th><th>Contact</th></tr></thead>
              <tbody>
                {(data.recent_patients||[]).slice(0,8).map(p => (
                  <tr key={p.id}>
                    <td><span className="mono-val" style={{ color:'var(--primary-light)', fontWeight:700 }}>{p.uhid}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="avatar avatar-sm" style={{ background:'var(--primary-50)', color:'var(--primary-light)' }}>
                          {p.name?.split(' ').map(w=>w[0]).slice(0,2).join('') || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-white)' }}>{p.name}</div>
                          <div style={{ fontSize:11, color:'var(--text-3)' }}>{p.gender||'—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:12 }}>{p.age ? p.age+'y' : '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-3)' }}>{p.phone||'—'}</td>
                  </tr>
                ))}
                {(!data.recent_patients || data.recent_patients.length===0) && <tr><td colSpan={4} style={{ textAlign:'center', padding:30, color:'var(--text-3)' }}>No patients registered yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>📋</span>
            <div><div className="card-title">Activity Feed</div><div className="card-subtitle">Recent system events</div></div>
          </div>
          <div style={{ padding:'8px 12px', maxHeight:380, overflowY:'auto' }}>
            {(data.recent_activity||[]).slice(0,12).map((log,i) => {
              const icons = { LOGIN:'🔑', REGISTER_PATIENT:'👤', CREATE_ENCOUNTER:'📋', SIGN_ENCOUNTER:'✍️', CREATE_INVOICE:'🧾', GENERATE_AI_NOTE:'🤖', CREATE_CHARGE:'💰', ADD_TO_QUEUE:'🔢', CREATE_ORDER:'🔬', BOOK_APPOINTMENT:'📅', UPDATE_PATIENT:'✏️' }
              let det = {}; try { det = JSON.parse(log.details||'{}') } catch {}
              return (
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 8px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:'var(--surface-3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                    {icons[log.action]||'📌'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>
                      {log.action.replace(/_/g,' ')}
                      <span style={{ fontWeight:400, color:'var(--text-3)' }}> by {log.username}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
                      {det.name || det.uhid || det.enc_no || ''} · {new Date(log.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            {(!data.recent_activity || data.recent_activity.length===0) && <div style={{ color:'var(--text-3)', textAlign:'center', padding:30 }}>No recent activity</div>}
          </div>
        </div>
      </div>

      {/* Doctor Cards + Low Stock */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {data.doctors?.length>0 && (
          <div className="card">
            <div className="card-header">
              <span style={{ fontSize:16 }}>🩺</span>
              <div><div className="card-title">Doctors on Duty</div><div className="card-subtitle">{data.doctors.length} physicians</div></div>
            </div>
            <div style={{ padding:16, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
              {data.doctors.map(d => (
                <div key={d.id} style={{ background:'var(--surface-3)', borderRadius:14, padding:14, border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="avatar avatar-md" style={{ background:'rgba(99,102,241,0.15)', color:'var(--primary-light)' }}>
                      {d.name?.split(' ').map(w=>w[0]).slice(0,2).join('') || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-white)' }}>{d.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>{d.department}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.low_stock?.length>0 && (
          <div className="card">
            <div className="card-header">
              <span style={{ fontSize:16 }}>⚠️</span>
              <div><div className="card-title">Low Stock Alert</div><div className="card-subtitle">{data.low_stock.length} items</div></div>
            </div>
            <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
              <table className="table">
                <thead><tr><th>Medicine</th><th>Stock</th><th>Reorder</th></tr></thead>
                <tbody>
                  {data.low_stock.map(m => (
                    <tr key={m.id}>
                      <td><strong style={{ color:'var(--text-white)' }}>{m.name}</strong><br/><span className="badge badge-info" style={{ fontSize:10 }}>{m.category}</span></td>
                      <td><span className="badge badge-danger">{m.current_stock}</span></td>
                      <td>{m.reorder_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
