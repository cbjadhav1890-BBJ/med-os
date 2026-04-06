import { useState, useEffect, useContext, useRef } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'

const CATEGORIES = ['Consultation','Lab','Radiology','Procedure','Medicine','Room','Nursing','Other']
const HSN_DEFAULTS = { Consultation:'999312', Lab:'999315', Radiology:'999315', Procedure:'999311', Medicine:'3004', Room:'999272', Nursing:'999311', Other:'999399' }
const GST_RATES = [0, 5, 12, 18]

function InvoiceModal({ invoice, onClose }) {
  const ref = useRef()
  let items = []; try { items = JSON.parse(invoice.line_items||'[]') } catch {}
  let gstBp = {}; try { gstBp = JSON.parse(invoice.gst_breakup||'{}') } catch {}

  function print() { window.print() }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize:20 }}>🧾</span>
          <div className="modal-title">Invoice — {invoice.invoice_no}</div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button className="btn btn-outline btn-sm" onClick={print}>🖨 Print</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="invoice-preview" ref={ref}>
            <div className="invoice-header">
              <div>
                <div className="invoice-hospital-name">🏥 City Medical Centre</div>
                <div className="invoice-hospital-details">
                  123 Healthcare Avenue, New Delhi — 110001<br/>
                  GSTIN: 07AAACX9876B1ZX · Ph: +91-11-4567-8900<br/>
                  Email: billing@citymedical.in
                </div>
              </div>
              <div className="invoice-no">
                <div className="invoice-no-label">Tax Invoice</div>
                <div className="invoice-no-value">{invoice.invoice_no}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>Date: {new Date(invoice.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                <div style={{ marginTop:6 }}><span className={`badge ${invoice.payment_status==='paid'?'badge-success':invoice.payment_status==='pending'?'badge-warning':'badge-gray'}`}>{invoice.payment_status?.toUpperCase()}</span></div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, background:'var(--surface-2)', borderRadius:10, padding:16, marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>Patient / Bill To</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{invoice.patient_name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>UHID: {invoice.uhid}</div>
                {invoice.phone && <div style={{ fontSize:12, color:'var(--text-3)' }}>📞 {invoice.phone}</div>}
                {invoice.address && <div style={{ fontSize:12, color:'var(--text-3)' }}>{invoice.address}</div>}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>Payment Details</div>
                <div style={{ fontSize:13, color:'var(--text-2)' }}>Mode: <strong>{invoice.payment_mode}</strong></div>
                <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>Status: <strong style={{ color:invoice.payment_status==='paid'?'var(--success)':'var(--warning)' }}>{invoice.payment_status?.toUpperCase()}</strong></div>
              </div>
            </div>

            <div className="table-wrap" style={{ marginBottom:16 }}>
              <table className="table">
                <thead><tr><th>#</th><th>Description</th><th>Category</th><th>HSN/SAC</th><th>Amount</th><th>GST%</th><th>GST Amt</th><th>Total</th></tr></thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ color:'var(--text-3)' }}>{i+1}</td>
                      <td><strong>{item.description}</strong></td>
                      <td><span className="badge badge-info">{item.category}</span></td>
                      <td><span className="mono-val">{item.hsn_sac}</span></td>
                      <td>₹{Number(item.amount).toFixed(2)}</td>
                      <td>{item.gst_rate}%</td>
                      <td>₹{Number(item.gst_amount).toFixed(2)}</td>
                      <td><strong>₹{Number(item.total_amount).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* GST Breakup */}
            {Object.keys(gstBp).length > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', gap:20, marginBottom:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:8 }}>GST Breakup (CGST + SGST)</div>
                  <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'var(--surface-2)' }}><th style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, fontSize:10, color:'var(--text-3)' }}>Rate</th><th style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:10, color:'var(--text-3)' }}>Taxable</th><th style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:10, color:'var(--text-3)' }}>CGST</th><th style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:10, color:'var(--text-3)' }}>SGST</th></tr></thead>
                    <tbody>
                      {Object.entries(gstBp).map(([rate, vals]) => (
                        <tr key={rate} style={{ borderTop:'1px solid var(--border)' }}>
                          <td style={{ padding:'6px 10px', fontWeight:600 }}>{rate}</td>
                          <td style={{ padding:'6px 10px', textAlign:'right' }}>₹{Number(vals.taxable).toFixed(2)}</td>
                          <td style={{ padding:'6px 10px', textAlign:'right' }}>₹{Number(vals.cgst).toFixed(2)}</td>
                          <td style={{ padding:'6px 10px', textAlign:'right' }}>₹{Number(vals.sgst).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="invoice-total-inner">
                  <div className="invoice-total-row"><span>Subtotal</span><span>₹{Number(invoice.subtotal).toFixed(2)}</span></div>
                  <div className="invoice-total-row"><span>GST Total</span><span>₹{Number(invoice.gst_total).toFixed(2)}</span></div>
                  {invoice.discount>0 && <div className="invoice-total-row" style={{ color:'var(--success)' }}><span>Discount</span><span>−₹{Number(invoice.discount).toFixed(2)}</span></div>}
                  <div className="invoice-total-row final"><span>Total Amount</span><span>₹{Number(invoice.total_amount).toFixed(2)}</span></div>
                </div>
              </div>
            )}

            <div style={{ borderTop:'2px dashed var(--border)', paddingTop:12, fontSize:11, color:'var(--text-3)', textAlign:'center' }}>
              This is a computer-generated tax invoice. No signature required. — CBIC Rule 46 compliant.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddChargeModal({ patients, onClose, onAdded, toast }) {
  const [form, setForm] = useState({ patient_id:'', description:'', category:'Consultation', hsn_sac:'999312', amount:'', gst_rate:'0', encounter_id:'' })
  const [loading, setLoading] = useState(false)
  const [patSearch, setPatSearch] = useState('')
  const [patResults, setPatResults] = useState([])
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }))

  useEffect(() => {
    if (patSearch.length>1) setPatResults(patients.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase()) || p.uhid.includes(patSearch)).slice(0,5))
    else setPatResults([])
  }, [patSearch, patients])

  useEffect(() => { set('hsn_sac', HSN_DEFAULTS[form.category]||'999399') }, [form.category])

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/charges', form)
      toast('Charge added — ₹' + Number(data.total_amount).toFixed(2), 'success')
      onAdded(data); onClose()
    } catch(err) { toast(err.response?.data?.error||'Failed', 'error') }
    finally { setLoading(false) }
  }

  const selPat = patients.find(p => p.id===form.patient_id)
  const base = parseFloat(form.amount)||0
  const gst = base * (parseFloat(form.gst_rate)||0) / 100
  const total = base + gst

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header"><span style={{ fontSize:20 }}>💰</span><div className="modal-title">Add Charge</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="form-group">
              <label className="form-label">Patient <span className="form-required">*</span></label>
              <div className="autocomplete">
                <input className="input" value={selPat?`${selPat.name} (${selPat.uhid})`:patSearch} onChange={e=>{ if(!form.patient_id) setPatSearch(e.target.value) }} onFocus={() => { if(form.patient_id) { set('patient_id',''); setPatSearch('') } }} placeholder="Search patient…" />
                {patResults.length>0 && <div className="autocomplete-list">{patResults.map(p => <div key={p.id} className="autocomplete-item" onClick={() => { set('patient_id',p.id); setPatSearch(''); setPatResults([]) }}><span className="autocomplete-code">{p.uhid}</span><span className="autocomplete-desc">{p.name} · {p.age}y</span></div>)}</div>}
              </div>
            </div>
            <div className="form-grid form-grid-2" style={{ gap:12 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Description <span className="form-required">*</span></label><input className="input" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="OPD Consultation, CBC, X-Ray Chest PA…" required /></div>
              <div className="form-group"><label className="form-label">Category</label><select className="select" value={form.category} onChange={e=>set('category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label className="form-label">HSN/SAC Code <span className="form-required">*</span></label><input className="input" value={form.hsn_sac} onChange={e=>set('hsn_sac',e.target.value)} placeholder="CBIC Rule 46 mandatory" required /></div>
              <div className="form-group"><label className="form-label">Amount (₹) <span className="form-required">*</span></label><input className="input" type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" min="0" step="0.01" required /></div>
              <div className="form-group"><label className="form-label">GST Rate</label><select className="select" value={form.gst_rate} onChange={e=>set('gst_rate',e.target.value)}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></div>
            </div>
            {base>0 && (
              <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span>Base: <strong>₹{base.toFixed(2)}</strong></span>
                <span>GST ({form.gst_rate}%): <strong>₹{gst.toFixed(2)}</strong></span>
                <span style={{ color:'var(--primary)', fontWeight:800 }}>Total: ₹{total.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-md" disabled={loading||!form.patient_id||!form.amount}>{loading?<><span className="spinner spinner-sm"/>Adding…</>:'+ Add Charge'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GenerateInvoiceModal({ patients, charges, onClose, onInvoiced, toast }) {
  const [patSearch, setPatSearch] = useState('')
  const [patResults, setPatResults] = useState([])
  const [pid, setPid] = useState('')
  const [patCharges, setPatCharges] = useState([])
  const [selected, setSelected] = useState([])
  const [discount, setDiscount] = useState(0)
  const [payMode, setPayMode] = useState('Cash')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (patSearch.length>1) setPatResults(patients.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase()) || p.uhid.includes(patSearch)).slice(0,5))
    else setPatResults([])
  }, [patSearch, patients])

  useEffect(() => {
    if (pid) {
      const pc = charges.filter(c => c.patient_id===pid && c.status==='pending')
      setPatCharges(pc); setSelected(pc.map(c=>c.id))
    }
  }, [pid, charges])

  const selCharges = patCharges.filter(c => selected.includes(c.id))
  const subtotal = selCharges.reduce((s,c) => s+c.amount, 0)
  const gstTotal = selCharges.reduce((s,c) => s+c.gst_amount, 0)
  const total = subtotal + gstTotal - (parseFloat(discount)||0)

  async function generate() {
    if (!pid || !selected.length) return toast('Select patient and at least one charge', 'warning')
    setLoading(true)
    try {
      const { data } = await api.post('/invoices', { patient_id:pid, charge_ids:selected, discount:parseFloat(discount)||0, payment_mode:payMode })
      toast(`Invoice ${data.invoice_no} generated — ₹${Number(data.total_amount).toFixed(2)}`, 'success')
      onInvoiced(data); onClose()
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setLoading(false) }
  }

  const selPat = patients.find(p => p.id===pid)

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header"><span style={{ fontSize:20 }}>🧾</span><div className="modal-title">Generate GST Invoice</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Patient select */}
          <div className="form-group">
            <label className="form-label">Select Patient <span className="form-required">*</span></label>
            <div className="autocomplete">
              <input className="input" value={selPat?`${selPat.name} (${selPat.uhid})`:patSearch} onChange={e=>{ if(!pid) setPatSearch(e.target.value) }} onFocus={()=>{ if(pid){setPid('');setPatSearch('');setPatCharges([]);setSelected([])} }} placeholder="Search patient by name or UHID…" />
              {patResults.length>0 && <div className="autocomplete-list">{patResults.map(p => <div key={p.id} className="autocomplete-item" onClick={() => { setPid(p.id); setPatSearch(''); setPatResults([]) }}><span className="autocomplete-code">{p.uhid}</span><span className="autocomplete-desc">{p.name} · {p.age}y · {p.phone}</span></div>)}</div>}
            </div>
          </div>

          {pid && (
            <>
              {/* Charges to include */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label className="form-label">Pending Charges ({patCharges.length})</label>
                  {patCharges.length>0 && <button className="btn btn-ghost btn-xs" onClick={() => setSelected(selected.length===patCharges.length?[]:patCharges.map(c=>c.id))}>{selected.length===patCharges.length?'Deselect All':'Select All'}</button>}
                </div>
                {patCharges.length===0
                  ? <div style={{ padding:'20px', textAlign:'center', background:'var(--surface-2)', borderRadius:10, color:'var(--text-3)', fontSize:13 }}>No pending charges for this patient</div>
                  : <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                    {patCharges.map(c => (
                      <label key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', background:selected.includes(c.id)?'var(--primary-50)':'white' }}>
                        <input type="checkbox" className="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(s => e.target.checked ? [...s,c.id] : s.filter(x=>x!==c.id))} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{c.description}</div>
                          <div style={{ fontSize:11, color:'var(--text-3)' }}>{c.category} · HSN {c.hsn_sac} · GST {c.gst_rate}%</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:13, fontWeight:700 }}>₹{Number(c.total_amount).toFixed(2)}</div>
                          <div style={{ fontSize:10, color:'var(--text-3)' }}>+₹{Number(c.gst_amount).toFixed(2)} GST</div>
                        </div>
                      </label>
                    ))}
                  </div>
                }
              </div>

              <div className="form-grid form-grid-2" style={{ gap:12 }}>
                <div className="form-group"><label className="form-label">Discount (₹)</label><input className="input" type="number" value={discount} onChange={e=>setDiscount(e.target.value)} min="0" /></div>
                <div className="form-group"><label className="form-label">Payment Mode</label><select className="select" value={payMode} onChange={e=>setPayMode(e.target.value)}><option>Cash</option><option>Card</option><option>UPI</option><option>Insurance</option><option>Cheque</option></select></div>
              </div>

              {selected.length>0 && (
                <div style={{ background:'linear-gradient(135deg,var(--primary-50),var(--success-bg))', border:'1px solid var(--primary-100)', borderRadius:12, padding:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:13, color:'var(--text-2)' }}>Subtotal ({selected.length} items)</span><span style={{ fontSize:13, fontWeight:600 }}>₹{subtotal.toFixed(2)}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:13, color:'var(--text-2)' }}>GST Total</span><span style={{ fontSize:13, fontWeight:600 }}>₹{gstTotal.toFixed(2)}</span></div>
                  {discount>0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:13, color:'var(--success)' }}>Discount</span><span style={{ fontSize:13, fontWeight:600, color:'var(--success)' }}>−₹{parseFloat(discount).toFixed(2)}</span></div>}
                  <div style={{ display:'flex', justifyContent:'space-between', borderTop:'2px solid var(--primary-100)', marginTop:8, paddingTop:8 }}><span style={{ fontSize:15, fontWeight:800 }}>Total Amount</span><span style={{ fontSize:18, fontWeight:800, color:'var(--primary)' }}>₹{total.toFixed(2)}</span></div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-md" onClick={onClose}>Cancel</button>
          <button className="btn btn-success btn-lg" onClick={generate} disabled={loading||!pid||!selected.length}>
            {loading?<><span className="spinner spinner-sm"/>Generating…</>:'🧾 Generate Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Billing() {
  const [charges, setCharges] = useState([])
  const [invoices, setInvoices] = useState([])
  const [patients, setPatients] = useState([])
  const [tab, setTab] = useState('charges')
  const [loading, setLoading] = useState(true)
  const [showAddCharge, setShowAddCharge] = useState(false)
  const [showGenInv, setShowGenInv] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [chargeFilter, setChargeFilter] = useState('all')
  const toast = useContext(ToastContext)

  useEffect(() => {
    Promise.all([api.get('/charges'), api.get('/invoices'), api.get('/patients?limit=200')]).then(([c,i,p]) => {
      setCharges(c.data); setInvoices(i.data); setPatients(p.data.patients); setLoading(false)
    })
  }, [])

  async function loadInvoiceFull(id) {
    const { data } = await api.get(`/invoices/${id}`)
    setViewInvoice(data)
  }

  const filteredCharges = charges.filter(c => chargeFilter==='all' || c.status===chargeFilter)
  const pendingTotal = charges.filter(c=>c.status==='pending').reduce((s,c)=>s+c.total_amount,0)
  const invoicedTotal = charges.filter(c=>c.status==='invoiced').reduce((s,c)=>s+c.total_amount,0)
  const totalRevenue = invoices.filter(i=>i.payment_status==='paid').reduce((s,i)=>s+i.total_amount,0)

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[['⏳','Pending Charges',`₹${(pendingTotal/1000).toFixed(1)}k`,'var(--warning)'],['✅','Invoiced',`₹${(invoicedTotal/1000).toFixed(1)}k`,'var(--primary)'],['💰','Total Revenue',`₹${(totalRevenue/1000).toFixed(1)}k`,'var(--success)'],['🧾','Total Invoices',invoices.length,'var(--purple)']].map(([icon,label,val,color]) => (
          <div key={label} style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, padding:16, boxShadow:'var(--s-sm)', position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:-0.5 }}>{val}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3, textTransform:'uppercase', fontWeight:600, letterSpacing:0.5 }}>{label}</div>
            <div style={{ position:'absolute', right:-10, bottom:-10, fontSize:52, opacity:0.07 }}>{icon}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          <button className={`tab ${tab==='charges'?'active':''}`} onClick={()=>setTab('charges')}>💰 Charge Ledger <span className="tab-count">{charges.filter(c=>c.status==='pending').length}</span></button>
          <button className={`tab ${tab==='invoices'?'active':''}`} onClick={()=>setTab('invoices')}>🧾 Invoices <span className="tab-count">{invoices.length}</span></button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline btn-md" onClick={() => setShowAddCharge(true)}>+ Add Charge</button>
          <button className="btn btn-success btn-md" onClick={() => setShowGenInv(true)}>🧾 Generate Invoice</button>
        </div>
      </div>

      {loading ? <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div> : <>

      {tab==='charges' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>💰</span>
            <div><div className="card-title">All Charges</div><div className="card-subtitle">{filteredCharges.length} records</div></div>
            <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
              {['all','pending','invoiced','waived'].map(s => (
                <button key={s} onClick={() => setChargeFilter(s)}
                  style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid', fontSize:12, fontWeight:600, cursor:'pointer', background:chargeFilter===s?'var(--primary)':'white', color:chargeFilter===s?'white':'var(--text-3)', borderColor:chargeFilter===s?'var(--primary)':'var(--border)', transition:'all 0.15s', fontFamily:'inherit', textTransform:'capitalize' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>Patient</th><th>Description</th><th>Category</th><th>HSN/SAC</th><th>Amount</th><th>GST</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {filteredCharges.map(c => (
                  <tr key={c.id}>
                    <td><div><strong>{c.patient_name}</strong></div><div style={{ fontSize:11, color:'var(--text-3)' }}>{c.uhid}</div></td>
                    <td>{c.description}</td>
                    <td><span className="badge badge-info">{c.category}</span></td>
                    <td><span className="mono-val">{c.hsn_sac||<span style={{color:'var(--danger)'}}>Missing!</span>}</span></td>
                    <td>₹{Number(c.amount).toFixed(2)}</td>
                    <td>{c.gst_rate}% = ₹{Number(c.gst_amount).toFixed(2)}</td>
                    <td><strong>₹{Number(c.total_amount).toFixed(2)}</strong></td>
                    <td><span className={`badge ${c.status==='invoiced'?'badge-success':c.status==='pending'?'badge-warning':'badge-gray'}`}>{c.status}</span></td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
                {filteredCharges.length===0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No charges found</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card-footer">
            <span style={{ fontSize:12, color:'var(--text-3)' }}>
              Pending: <strong style={{ color:'var(--warning)' }}>₹{charges.filter(c=>c.status==='pending').reduce((s,c)=>s+c.total_amount,0).toFixed(2)}</strong>
            </span>
            <div style={{ flex:1 }} />
            <span style={{ fontSize:11, color:'var(--text-3)' }}>⚠ Invoice will be blocked if HSN/SAC is missing (CBIC Rule 46)</span>
          </div>
        </div>
      )}

      {tab==='invoices' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>🧾</span>
            <div><div className="card-title">Invoice History</div><div className="card-subtitle">{invoices.length} invoices</div></div>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>Invoice No</th><th>Patient</th><th>Date</th><th>Items</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Mode</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map(inv => {
                  let items = []; try { items = JSON.parse(inv.line_items||'[]') } catch {}
                  return (
                    <tr key={inv.id}>
                      <td><span className="mono-val" style={{ color:'var(--primary)', fontWeight:700 }}>{inv.invoice_no}</span></td>
                      <td><div><strong>{inv.patient_name}</strong></div><div style={{ fontSize:11, color:'var(--text-3)' }}>{inv.uhid}</div></td>
                      <td style={{ fontSize:12, color:'var(--text-3)' }}>{new Date(inv.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                      <td><span className="badge badge-gray">{items.length} items</span></td>
                      <td>₹{Number(inv.subtotal).toFixed(2)}</td>
                      <td>₹{Number(inv.gst_total).toFixed(2)}</td>
                      <td><strong style={{ color:'var(--success)', fontSize:14 }}>₹{Number(inv.total_amount).toFixed(2)}</strong></td>
                      <td><span className="badge badge-info">{inv.payment_mode}</span></td>
                      <td><span className={`badge ${inv.payment_status==='paid'?'badge-success':inv.payment_status==='pending'?'badge-warning':'badge-gray'}`}>{inv.payment_status}</span></td>
                      <td><button className="btn btn-outline btn-xs" onClick={() => loadInvoiceFull(inv.id)}>View →</button></td>
                    </tr>
                  )
                })}
                {invoices.length===0 && <tr><td colSpan={10} style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No invoices yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>}

      {showAddCharge && <AddChargeModal patients={patients} onClose={() => setShowAddCharge(false)} onAdded={c => setCharges(cs => [c,...cs])} toast={toast} />}
      {showGenInv && <GenerateInvoiceModal patients={patients} charges={charges} onClose={() => setShowGenInv(false)} onInvoiced={inv => { setInvoices(is => [inv,...is]); setCharges(cs => cs.map(c => inv.id && c.invoice_id===inv.id ? {...c,status:'invoiced'} : c)) }} toast={toast} />}
      {viewInvoice && <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
    </div>
  )
}
