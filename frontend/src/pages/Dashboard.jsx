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

  if (loading) return <div style={{ padding:80, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/><div style={{ color:'var(--text-3)', marginTop:16 }}>Entering Portal…</div></div>

  if (!data) return <div style={{ padding:80, textAlign:'center', color:'var(--text-3)' }}>Failed to load dashboard data</div>

  const s = data.stats || {}

  return (
    <div>
      <div className="bento-header">
        Command <span>Portal</span>
      </div>

      <div className="bento-grid">
        {/* LEFT COMPARTMENT - Hero Spatial UI */}
        <div className="bento-card portal-hero">
          
          {/* Spatial Concentric Radar */}
          <div className="portal-concentric"></div>

          <div className="floating-tag" style={{ top: 40, left: 40 }}>
            <span>Activity</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>{s.encounters_today || 0} Encounters</div>
          </div>
          
          <div className="floating-tag" style={{ bottom: 60, left: 60 }}>
            <span>Admitted IPD</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--purple-light)' }}>{s.admitted_patients || 0} Open</div>
          </div>

          <div className="floating-tag" style={{ top: 80, right: 60 }}>
            <span>Revenue Today</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>₹{s.revenue_today || 0}</div>
          </div>

          <div className="floating-tag" style={{ bottom: 80, right: 40 }}>
            <span>Queue</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)' }}>{s.queue_waiting || 0} Waiting</div>
          </div>

          <div className="portal-center">
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:2, color:'var(--text-3)', marginBottom: 4 }}>Live Radar</div>
            <div style={{ fontSize:36, fontWeight:900, color:'var(--text-white)', lineHeight: 1 }}>{s.total_patients || 0}</div>
            <div style={{ fontSize:12, color:'var(--primary-light)', marginTop: 2 }}>Total Patients</div>
          </div>
        </div>

        {/* RIGHT COMPARTMENT - Orbital Rooms (Lists) */}
        <div className="orbital-list">
          <div className="bento-card" style={{ padding: '20px' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-2)', marginBottom: 16, textTransform:'uppercase', letterSpacing:1 }}>Activity Feed</div>
            <div className="orbital-list" style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 8 }}>
              {(data.recent_activity||[]).slice(0,5).map((log,i) => {
                const icons = { LOGIN:'🔑', REGISTER_PATIENT:'👤', CREATE_ENCOUNTER:'📋', SIGN_ENCOUNTER:'✍️', CREATE_INVOICE:'🧾', GENERATE_AI_NOTE:'🤖', CREATE_CHARGE:'💰', ADD_TO_QUEUE:'🔢', CREATE_ORDER:'🔬', BOOK_APPOINTMENT:'📅', UPDATE_PATIENT:'✏️' }
                let det = {}; try { det = JSON.parse(log.details||'{}') } catch {}
                return (
                  <div key={i} className="orbital-item">
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      <div style={{ fontSize: 20 }}>{icons[log.action]||'📌'}</div>
                      <div>
                        <div style={{ fontSize: 13, color:'var(--text-white)', fontWeight: 600 }}>{log.action.replace(/_/g,' ')}</div>
                        <div style={{ fontSize: 11, color:'var(--text-3)' }}>{log.username} · {new Date(log.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!data.recent_activity || data.recent_activity.length===0) && <div style={{ color:'var(--text-3)', textAlign:'center', padding:20 }}>No recent activity</div>}
            </div>
          </div>

          <div className="bento-card" style={{ padding: '20px' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-2)', marginBottom: 16, textTransform:'uppercase', letterSpacing:1 }}>Attention Required</div>
            <div className="orbital-list">
              {s.low_stock_items > 0 ? (
                <div className="orbital-item" style={{ borderLeft: '3px solid var(--warning)' }}>
                  <div style={{ fontSize: 13, color:'var(--text-white)', fontWeight: 600 }}>Low Stock Alert</div>
                  <div style={{ fontSize: 11, color:'var(--text-3)' }}>{s.low_stock_items} items below threshold</div>
                </div>
              ) : (
                <div className="orbital-item" style={{ borderLeft: '3px solid var(--success)' }}>
                  <div style={{ fontSize: 13, color:'var(--text-white)', fontWeight: 600 }}>Inventory Healthy</div>
                  <div style={{ fontSize: 11, color:'var(--text-3)' }}>All stock levels normal</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
