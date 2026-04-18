import { useState, useEffect, useContext } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'

export default function Reports() {
  const [tab, setTab] = useState('financial')
  const [financial, setFinancial] = useState(null)
  const [stock, setStock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(new Date(Date.now()-30*86400000).toISOString().slice(0,10))
  const [to, setTo] = useState(new Date().toISOString().slice(0,10))
  const toast = useContext(ToastContext)

  useEffect(() => { loadFinancial() }, [])
  useEffect(() => { if(tab==='stock'&&!stock) loadStock() }, [tab])

  async function loadFinancial() {
    setLoading(true)
    try { const {data}=await api.get(`/reports/financial?from=${from}&to=${to}`); setFinancial(data) }
    catch(err) { toast('Failed to load report','error') }
    finally { setLoading(false) }
  }

  async function loadStock() {
    try { const {data}=await api.get('/reports/stock'); setStock(data) }
    catch(err) { toast('Failed to load stock report','error') }
  }

  const f = financial?.summary || {}
  const maxDailyRev = financial?.daily_revenue?.length ? Math.max(...financial.daily_revenue.map(d=>d.amount)) : 1

  return (
    <div>
      <div className="flex-between" style={{ marginBottom:20 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {[['financial','💰 Financial'],['stock','📦 Stock Intelligence']].map(([k,l]) => (
            <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        {tab==='financial' && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="date" className="input input-sm" style={{ width:140 }} value={from} onChange={e=>setFrom(e.target.value)} />
            <span style={{ color:'var(--text-3)', fontSize:12 }}>to</span>
            <input type="date" className="input input-sm" style={{ width:140 }} value={to} onChange={e=>setTo(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={loadFinancial}>Apply</button>
          </div>
        )}
      </div>

      {tab==='financial' && (loading ? <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div> : financial && (
        <div>
          {/* KPI Cards */}
          <div className="stats-grid" style={{ marginBottom:20 }}>
            {[
              { icon:'💰', value:`₹${((f.gross_revenue||0)/1000).toFixed(1)}k`, label:'Gross Revenue', sub:`${f.invoice_count||0} invoices`, color:'var(--primary)' },
              { icon:'✅', value:`₹${((f.total_collected||0)/1000).toFixed(1)}k`, label:'Collected', color:'var(--success)' },
              { icon:'⏳', value:`₹${((f.outstanding_dues||0)/1000).toFixed(1)}k`, label:'Outstanding', color:'var(--warning)' },
              { icon:'📊', value:`₹${((f.net_profit||0)/1000).toFixed(1)}k`, label:'Net Profit', sub:`${f.profit_margin||0}% margin`, color: f.net_profit>=0?'var(--success)':'var(--danger)' },
            ].map(s => (
              <div key={s.label} className="stats-card">
                <div className="stats-card-icon" style={{ background:`${s.color}15` }}>{s.icon}</div>
                <div className="stats-card-value">{s.value}</div>
                <div className="stats-card-label">{s.label}</div>
                {s.sub && <div className="stats-card-trend up">{s.sub}</div>}
                <div className="stats-card-bg">{s.icon}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
            {/* Revenue Trend - Bar Chart */}
            <div className="card">
              <div className="card-header"><span style={{ fontSize:16 }}>📈</span><div><div className="card-title">Daily Revenue Trend</div><div className="card-subtitle">{financial.daily_revenue?.length||0} days</div></div></div>
              <div className="card-body" style={{ height:220, display:'flex', alignItems:'flex-end', gap:4, paddingTop:10 }}>
                {financial.daily_revenue?.length>0 ? financial.daily_revenue.map((d,i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ fontSize:9, color:'var(--text-3)', writingMode:'vertical-lr', transform:'rotate(180deg)' }}>₹{d.amount}</div>
                    <div style={{ width:'100%', background:'linear-gradient(to top, var(--primary), var(--purple))', borderRadius:'6px 6px 0 0', height:`${Math.max(4,(d.amount/maxDailyRev)*160)}px`, transition:'height 0.5s var(--ease)', opacity:0.8 }}/>
                    <div style={{ fontSize:8, color:'var(--text-3)', transform:'rotate(-45deg)' }}>{d.date.slice(5)}</div>
                  </div>
                )) : <div className="empty-state" style={{ width:'100%' }}><div className="empty-state-icon" style={{ fontSize:32 }}>📊</div><div className="empty-state-desc">No revenue data</div></div>}
              </div>
            </div>

            {/* Payment Mode Split */}
            <div className="card">
              <div className="card-header"><span style={{ fontSize:16 }}>💳</span><div><div className="card-title">Payment Modes</div></div></div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {financial.payment_modes?.map((pm,i) => {
                  const colors = ['var(--primary)','var(--success)','var(--warning)','var(--purple)','var(--cyan)','var(--danger)']
                  const total = financial.payment_modes.reduce((s,p)=>s+(p.total||0),0)
                  const pct = total>0 ? ((pm.total||0)/total*100) : 0
                  return (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                        <span style={{ color:'var(--text-2)', fontWeight:600 }}>{pm.payment_mode}</span>
                        <span style={{ color:'var(--text-white)', fontWeight:700 }}>₹{(pm.total||0).toFixed(0)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:colors[i%colors.length], borderRadius:99, width:`${pct}%`, transition:'width 0.5s' }}/>
                      </div>
                    </div>
                  )
                })}
                {(!financial.payment_modes||financial.payment_modes.length===0) && <div style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:20 }}>No payment data</div>}
              </div>
            </div>
          </div>

          {/* Top Services */}
          <div className="card">
            <div className="card-header"><span style={{ fontSize:16 }}>🏆</span><div><div className="card-title">Top Revenue Services</div></div></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:12 }}>
                {financial.top_services?.map((s,i) => (
                  <div key={i} style={{ background:'var(--surface-3)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--text-white)' }}>₹{Number(s.total).toFixed(0)}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>{s.category}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {tab==='stock' && (stock ? (
        <div>
          <div className="stats-grid" style={{ marginBottom:20 }}>
            {[
              { icon:'💊', value:stock.total_medicines, label:'Total Medicines', color:'var(--primary)' },
              { icon:'⚠️', value:stock.low_stock?.length||0, label:'Low Stock', color:'var(--warning)' },
              { icon:'🚫', value:stock.out_of_stock?.length||0, label:'Out of Stock', color:'var(--danger)' },
              { icon:'💰', value:`₹${((stock.inventory_value||0)/1000).toFixed(1)}k`, label:'Inventory Value', color:'var(--success)' },
            ].map(s => (
              <div key={s.label} className="stats-card">
                <div className="stats-card-icon" style={{ background:`${s.color}15` }}>{s.icon}</div>
                <div className="stats-card-value">{s.value}</div>
                <div className="stats-card-label">{s.label}</div>
                <div className="stats-card-bg">{s.icon}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div className="card">
              <div className="card-header"><span style={{ fontSize:16 }}>⚠️</span><div><div className="card-title">Low Stock Alert</div><div className="card-subtitle">{stock.low_stock?.length||0} items below reorder level</div></div></div>
              <div className="table-wrap" style={{ border:'none', borderRadius:0 }}><table className="table">
                <thead><tr><th>Medicine</th><th>Current</th><th>Reorder</th></tr></thead>
                <tbody>{stock.low_stock?.map(m=>(
                  <tr key={m.id}><td><strong>{m.name}</strong><br/><span className="badge badge-info" style={{ fontSize:10 }}>{m.category}</span></td><td><span className="badge badge-danger">{m.current_stock}</span></td><td>{m.reorder_level}</td></tr>
                ))}{!stock.low_stock?.length && <tr><td colSpan={3} style={{ textAlign:'center', padding:30, color:'var(--success-light)' }}>✅ All stock levels OK</td></tr>}</tbody>
              </table></div>
            </div>

            <div className="card">
              <div className="card-header"><span style={{ fontSize:16 }}>⏰</span><div><div className="card-title">Expiring Soon (90 days)</div><div className="card-subtitle">{stock.expiring_soon?.length||0} batches</div></div></div>
              <div className="table-wrap" style={{ border:'none', borderRadius:0 }}><table className="table">
                <thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Qty</th></tr></thead>
                <tbody>{stock.expiring_soon?.map(b=>(
                  <tr key={b.id}><td><strong>{b.medicine_name}</strong></td><td><span className="mono-val">{b.batch_no}</span></td><td><span className="badge badge-warning">{b.expiry_date}</span></td><td>{b.quantity_remaining}</td></tr>
                ))}{!stock.expiring_soon?.length && <tr><td colSpan={4} style={{ textAlign:'center', padding:30, color:'var(--success-light)' }}>✅ No expiring batches</td></tr>}</tbody>
              </table></div>
            </div>
          </div>
        </div>
      ) : <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div>)}
    </div>
  )
}
