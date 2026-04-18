import { useState, useEffect, useContext } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'

export default function Pharmacy() {
  const [tab, setTab] = useState('catalog')
  const [catalog, setCatalog] = useState([])
  const [dispensing, setDispensing] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showStock, setShowStock] = useState(false)
  const [showDispense, setShowDispense] = useState(false)
  const [stockDetail, setStockDetail] = useState(null)
  const [patients, setPatients] = useState([])
  const toast = useContext(ToastContext)

  useEffect(() => {
    Promise.all([api.get('/pharmacy/catalog'), api.get('/patients?limit=200')]).then(([c,p]) => {
      setCatalog(c.data); setPatients(p.data.patients); setLoading(false)
    })
  }, [])

  useEffect(() => { if (tab==='dispensing') api.get('/pharmacy/dispensing').then(r => setDispensing(r.data)) }, [tab])

  async function viewStock(med) {
    const { data } = await api.get(`/pharmacy/stock/${med.id}`)
    setStockDetail(data)
  }

  const filtered = catalog.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.generic_name.toLowerCase().includes(search.toLowerCase()))
  const lowStock = catalog.filter(m => m.current_stock <= m.reorder_level)
  const outOfStock = catalog.filter(m => m.current_stock === 0)

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom:20 }}>
        {[
          { icon:'💊', value:catalog.length, label:'Total Medicines', color:'var(--primary)' },
          { icon:'⚠️', value:lowStock.length, label:'Low Stock', color:'var(--warning)' },
          { icon:'🚫', value:outOfStock.length, label:'Out of Stock', color:'var(--danger)' },
          { icon:'📦', value:catalog.reduce((s,m)=>s+m.current_stock,0), label:'Total Stock Units', color:'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stats-card">
            <div className="stats-card-icon" style={{ background:`${s.color}15` }}>{s.icon}</div>
            <div className="stats-card-value">{s.value}</div>
            <div className="stats-card-label">{s.label}</div>
            <div className="stats-card-bg">{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="flex-between" style={{ marginBottom:16 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {[['catalog','💊 Catalog'],['dispensing','📤 Dispensing Log']].map(([k,l]) => (
            <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline btn-md" onClick={()=>setShowStock(true)}>📦 Add Stock</button>
          <button className="btn btn-success btn-md" onClick={()=>setShowDispense(true)}>📤 Dispense</button>
          <button className="btn btn-primary btn-md" onClick={()=>setShowAdd(true)}>+ Add Medicine</button>
        </div>
      </div>

      {loading ? <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div> : <>

      {tab==='catalog' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>💊</span>
            <div><div className="card-title">Medicine Catalog</div><div className="card-subtitle">{filtered.length} medicines</div></div>
            <div style={{ marginLeft:'auto' }}>
              <div className="search-box"><span className="search-icon">🔍</span><input className="search-input" placeholder="Search medicine…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:220 }}/></div>
            </div>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>Medicine</th><th>Generic</th><th>Category</th><th>Strength</th><th>MRP</th><th>Sell Price</th><th>GST</th><th>Stock</th><th>Reorder</th><th></th></tr></thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td><strong style={{ color:'var(--text-white)' }}>{m.name}</strong></td>
                    <td style={{ color:'var(--text-3)', fontSize:12 }}>{m.generic_name||'—'}</td>
                    <td><span className="badge badge-info">{m.category}</span></td>
                    <td><span className="mono-val">{m.strength}</span></td>
                    <td>₹{m.mrp}</td>
                    <td>₹{m.selling_price}</td>
                    <td>{m.gst_rate}%</td>
                    <td>
                      <span className={`badge ${m.current_stock===0?'badge-danger':m.current_stock<=m.reorder_level?'badge-warning':'badge-success'}`}>
                        {m.current_stock}
                      </span>
                    </td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{m.reorder_level}</td>
                    <td><button className="btn btn-outline btn-xs" onClick={()=>viewStock(m)}>Stock →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='dispensing' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>📤</span>
            <div><div className="card-title">Dispensing Log</div><div className="card-subtitle">{dispensing.length} records</div></div>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>Patient</th><th>Medicine</th><th>Qty</th><th>Unit Price</th><th>GST</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {dispensing.map(d => (
                  <tr key={d.id}>
                    <td><div><strong>{d.patient_name}</strong></div><div style={{ fontSize:11, color:'var(--text-3)' }}>{d.uhid}</div></td>
                    <td><strong>{d.medicine_name}</strong><br/><span className="badge badge-info" style={{ fontSize:10 }}>{d.category}</span></td>
                    <td style={{ fontWeight:700 }}>{d.quantity}</td>
                    <td>₹{d.unit_price}</td>
                    <td>₹{Number(d.gst_amount).toFixed(2)}</td>
                    <td><strong style={{ color:'var(--success-light)' }}>₹{Number(d.total_amount).toFixed(2)}</strong></td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(d.created_at).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {dispensing.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No dispensing records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>}

      {/* Add Medicine Modal */}
      {showAdd && <AddMedicineModal onClose={()=>setShowAdd(false)} onAdded={m => setCatalog(c=>[m,...c])} toast={toast} />}
      {/* Add Stock Modal */}
      {showStock && <AddStockModal catalog={catalog} onClose={()=>setShowStock(false)} onAdded={() => api.get('/pharmacy/catalog').then(r=>setCatalog(r.data))} toast={toast} />}
      {/* Dispense Modal */}
      {showDispense && <DispenseModal catalog={catalog} patients={patients} onClose={()=>setShowDispense(false)} onDispensed={() => { api.get('/pharmacy/catalog').then(r=>setCatalog(r.data)); if(tab==='dispensing') api.get('/pharmacy/dispensing').then(r=>setDispensing(r.data)) }} toast={toast} />}
      {/* Stock Detail Modal */}
      {stockDetail && <StockDetailModal med={stockDetail} onClose={()=>setStockDetail(null)} />}
    </div>
  )
}

function AddMedicineModal({ onClose, onAdded, toast }) {
  const [form, setForm] = useState({ name:'', generic_name:'', category:'Tablet', strength:'', mrp:'', selling_price:'', gst_rate:'12', reorder_level:'50' })
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { const {data}=await api.post('/pharmacy/catalog',form); toast('Medicine added: '+data.name,'success'); onAdded(data); onClose() }
    catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-md">
        <div className="modal-header"><span style={{ fontSize:20 }}>💊</span><div className="modal-title">Add New Medicine</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-grid form-grid-2" style={{ gap:14 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Name <span className="form-required">*</span></label><input className="input" value={form.name} onChange={e=>set('name',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Generic Name</label><input className="input" value={form.generic_name} onChange={e=>set('generic_name',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Category</label><select className="select" value={form.category} onChange={e=>set('category',e.target.value)}><option>Tablet</option><option>Capsule</option><option>Syrup</option><option>Injection</option><option>Drops</option><option>Ointment</option><option>Inhaler</option><option>Sachet</option><option>Infusion</option></select></div>
              <div className="form-group"><label className="form-label">Strength</label><input className="input" value={form.strength} onChange={e=>set('strength',e.target.value)} placeholder="e.g. 500mg" /></div>
              <div className="form-group"><label className="form-label">MRP (₹)</label><input className="input" type="number" value={form.mrp} onChange={e=>set('mrp',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Selling Price (₹)</label><input className="input" type="number" value={form.selling_price} onChange={e=>set('selling_price',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">GST Rate (%)</label><select className="select" value={form.gst_rate} onChange={e=>set('gst_rate',e.target.value)}><option>5</option><option>12</option><option>18</option></select></div>
              <div className="form-group"><label className="form-label">Reorder Level</label><input className="input" type="number" value={form.reorder_level} onChange={e=>set('reorder_level',e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary btn-md" disabled={loading}>{loading?<><span className="spinner spinner-sm"/>Adding…</>:'+ Add Medicine'}</button></div>
        </form>
      </div>
    </div>
  )
}

function AddStockModal({ catalog, onClose, onAdded, toast }) {
  const [form, setForm] = useState({ medicine_id:'', batch_no:'', expiry_date:'', quantity:'', purchase_price:'', supplier:'' })
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await api.post('/pharmacy/stock/add',form); toast('Stock added successfully','success'); onAdded(); onClose() }
    catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-md">
        <div className="modal-header"><span style={{ fontSize:20 }}>📦</span><div className="modal-title">Add Stock (Purchase)</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="form-group"><label className="form-label">Medicine <span className="form-required">*</span></label><select className="select" value={form.medicine_id} onChange={e=>set('medicine_id',e.target.value)} required><option value="">Select medicine…</option>{catalog.map(m=><option key={m.id} value={m.id}>{m.name} — Stock: {m.current_stock}</option>)}</select></div>
            <div className="form-grid form-grid-2" style={{ gap:12 }}>
              <div className="form-group"><label className="form-label">Batch No <span className="form-required">*</span></label><input className="input" value={form.batch_no} onChange={e=>set('batch_no',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Expiry Date <span className="form-required">*</span></label><input className="input" type="date" value={form.expiry_date} onChange={e=>set('expiry_date',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Quantity <span className="form-required">*</span></label><input className="input" type="number" value={form.quantity} onChange={e=>set('quantity',e.target.value)} min="1" required /></div>
              <div className="form-group"><label className="form-label">Purchase Price (₹)</label><input className="input" type="number" value={form.purchase_price} onChange={e=>set('purchase_price',e.target.value)} /></div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Supplier</label><input className="input" value={form.supplier} onChange={e=>set('supplier',e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-success btn-md" disabled={loading}>{loading?<><span className="spinner spinner-sm"/>Adding…</>:'📦 Add Stock'}</button></div>
        </form>
      </div>
    </div>
  )
}

function DispenseModal({ catalog, patients, onClose, onDispensed, toast }) {
  const [form, setForm] = useState({ patient_id:'', medicine_id:'', quantity:'1' })
  const [patSearch, setPatSearch] = useState('')
  const [patResults, setPatResults] = useState([])
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const selPat = patients.find(p=>p.id===form.patient_id)
  const selMed = catalog.find(m=>m.id===form.medicine_id)

  useEffect(() => {
    if (patSearch.length>1) setPatResults(patients.filter(p=>p.name.toLowerCase().includes(patSearch.toLowerCase())||p.uhid.includes(patSearch)).slice(0,5))
    else setPatResults([])
  }, [patSearch, patients])

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { const {data}=await api.post('/pharmacy/dispense',form); toast(`Dispensed ${data.medicine} x${data.quantity_dispensed} — ₹${data.total_charged.toFixed(2)}`,'success'); onDispensed(); onClose() }
    catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-md">
        <div className="modal-header"><span style={{ fontSize:20 }}>📤</span><div className="modal-title">Dispense Medicine</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="form-group">
              <label className="form-label">Patient <span className="form-required">*</span></label>
              <div className="autocomplete">
                <input className="input" value={selPat?`${selPat.name} (${selPat.uhid})`:patSearch} onChange={e=>{if(!form.patient_id)setPatSearch(e.target.value)}} onFocus={()=>{if(form.patient_id){set('patient_id','');setPatSearch('')}}} placeholder="Search patient…" />
                {patResults.length>0 && <div className="autocomplete-list">{patResults.map(p=><div key={p.id} className="autocomplete-item" onClick={()=>{set('patient_id',p.id);setPatSearch('');setPatResults([])}}><span className="autocomplete-code">{p.uhid}</span><span className="autocomplete-desc">{p.name} · {p.age}y</span></div>)}</div>}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Medicine <span className="form-required">*</span></label><select className="select" value={form.medicine_id} onChange={e=>set('medicine_id',e.target.value)} required><option value="">Select medicine…</option>{catalog.filter(m=>m.current_stock>0).map(m=><option key={m.id} value={m.id}>{m.name} — ₹{m.selling_price} — Stock: {m.current_stock}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Quantity <span className="form-required">*</span></label><input className="input" type="number" value={form.quantity} onChange={e=>set('quantity',e.target.value)} min="1" max={selMed?.current_stock||999} required /></div>
            {selMed && form.quantity && (
              <div style={{ background:'var(--surface-3)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span style={{ color:'var(--text-3)' }}>Unit price</span><span>₹{selMed.selling_price}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span style={{ color:'var(--text-3)' }}>GST ({selMed.gst_rate}%)</span><span>₹{(form.quantity*selMed.selling_price*selMed.gst_rate/100).toFixed(2)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:800, color:'var(--primary-light)', borderTop:'1px solid var(--border)', paddingTop:8, marginTop:4 }}><span>Total</span><span>₹{(form.quantity*selMed.selling_price*(1+selMed.gst_rate/100)).toFixed(2)}</span></div>
              </div>
            )}
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-success btn-md" disabled={loading||!form.patient_id||!form.medicine_id}>{loading?<><span className="spinner spinner-sm"/>Dispensing…</>:'📤 Dispense'}</button></div>
        </form>
      </div>
    </div>
  )
}

function StockDetailModal({ med, onClose }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header"><span style={{ fontSize:20 }}>📊</span><div className="modal-title">{med.name} — Stock Details</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[['Current Stock',med.current_stock,'var(--primary)'],['Reorder Level',med.reorder_level,'var(--warning)'],['Selling Price',`₹${med.selling_price}`,'var(--success)'],['GST Rate',`${med.gst_rate}%`,'var(--cyan)']].map(([l,v,c])=>(
              <div key={l} style={{ background:'var(--surface-3)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:20, fontWeight:800, color:'var(--text-white)' }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-white)', marginBottom:10 }}>📦 Active Batches</div>
          {med.batches?.length>0 ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Batch No</th><th>Expiry</th><th>Remaining</th><th>Purchase ₹</th><th>Sell ₹</th></tr></thead>
              <tbody>{med.batches.map(b=>(
                <tr key={b.id}>
                  <td><span className="mono-val">{b.batch_no}</span></td>
                  <td><span className={`badge ${new Date(b.expiry_date)<new Date(Date.now()+90*86400000)?'badge-warning':'badge-success'}`}>{b.expiry_date}</span></td>
                  <td style={{ fontWeight:700 }}>{b.quantity_remaining}</td>
                  <td>₹{b.purchase_price}</td>
                  <td>₹{b.selling_price}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div style={{ color:'var(--text-3)', fontSize:13, padding:20, textAlign:'center' }}>No active batches</div>}
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-white)', margin:'20px 0 10px' }}>📋 Recent Transactions</div>
          {med.transactions?.length>0 ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Type</th><th>Qty</th><th>Value</th><th>Notes</th><th>Date</th></tr></thead>
              <tbody>{med.transactions.slice(0,10).map(t=>(
                <tr key={t.id}>
                  <td><span className={`badge ${t.quantity>0?'badge-success':'badge-danger'}`}>{t.transaction_type}</span></td>
                  <td style={{ fontWeight:700, color:t.quantity>0?'var(--success-light)':'var(--danger-light)' }}>{t.quantity>0?'+':''}{t.quantity}</td>
                  <td>₹{Number(t.total_value).toFixed(2)}</td>
                  <td style={{ fontSize:12, color:'var(--text-3)' }}>{t.notes||'—'}</td>
                  <td style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(t.created_at).toLocaleString('en-IN')}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div style={{ color:'var(--text-3)', fontSize:13, padding:20, textAlign:'center' }}>No transactions</div>}
        </div>
      </div>
    </div>
  )
}
