import { useState, useEffect, useRef, useContext } from 'react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { ToastContext } from '../components/Layout'

const FREQ = ['Once daily','Twice daily','Thrice daily','Four times daily','Every 8 hours','Every 12 hours','As needed','Bedtime','Before meals','After meals']
const ROUTES = ['Oral','IV','IM','SC','Topical','Inhalation','Sublingual']

function ICD10Search({ selected, onChange }) {
  const [q, setQ] = useState(''), [results, setResults] = useState([]), timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    if (q.length<2) { setResults([]); return }
    timer.current = setTimeout(() => api.get(`/icd10/search?q=${q}`).then(r => setResults(r.data)), 300)
  }, [q])
  function add(code) { if (!selected.find(s=>s.code===code.code)) onChange([...selected, code]); setQ(''); setResults([]) }
  function remove(code) { onChange(selected.filter(s=>s.code!==code)) }
  return (
    <div>
      <div className="pill-list" style={{ marginBottom:8 }}>
        {selected.map(s => <span key={s.code} className="pill">{s.code} <button className="pill-remove" onClick={()=>remove(s.code)}>×</button></span>)}
      </div>
      <div className="autocomplete">
        <input className="input input-sm" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ICD-10 code or description…" />
        {results.length>0 && (
          <div className="autocomplete-list">
            {results.map(r => (
              <div key={r.code} className="autocomplete-item" onClick={()=>add(r)}>
                <span className="autocomplete-code">{r.code}</span>
                <span className="autocomplete-desc">{r.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EncounterDetail({ enc: initEnc, onUpdate, toast }) {
  const [enc, setEnc] = useState(initEnc)
  const [tab, setTab] = useState('vitals')
  const [vitals, setVitals] = useState(() => { try { return JSON.parse(initEnc.vitals_json||'{}') } catch { return {} } })
  const [notes, setNotes] = useState({ history: initEnc.history||'', examination: initEnc.examination||'', chief_complaint: initEnc.chief_complaint||'', follow_up_date: initEnc.follow_up_date||'' })
  const [icd10, setIcd10] = useState(() => { try { return JSON.parse(initEnc.icd10_codes||'[]') } catch { return [] } })
  const [aiNote, setAiNote] = useState(initEnc.ai_note||'')
  const [transcript, setTranscript] = useState('')
  const [rxForm, setRxForm] = useState({ medicine:'', strength:'', dosage:'1 tablet', frequency:'Twice daily', duration:'5 days', route:'Oral', instructions:'' })
  const [prescriptions, setPrescriptions] = useState(initEnc.prescriptions||[])
  const [orders, setOrders] = useState(initEnc.orders||[])
  const [orderForm, setOrderForm] = useState({ test_name:'', category:'Lab', priority:'routine' })
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [signing, setSigning] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => { setEnc(initEnc); setVitals(()=>{ try{return JSON.parse(initEnc.vitals_json||'{}')}catch{return {}} }); setNotes({ history:initEnc.history||'', examination:initEnc.examination||'', chief_complaint:initEnc.chief_complaint||'', follow_up_date:initEnc.follow_up_date||'' }); setIcd10(()=>{ try{return JSON.parse(initEnc.icd10_codes||'[]')}catch{return []} }); setAiNote(initEnc.ai_note||''); setPrescriptions(initEnc.prescriptions||[]); setOrders(initEnc.orders||[]) }, [initEnc])

  const signed = enc.status==='signed'

  async function save() {
    setSaving(true)
    try {
      await api.put(`/encounters/${enc.id}`, { vitals_json: JSON.stringify(vitals), icd10_codes: JSON.stringify(icd10), ai_note: aiNote, ...notes })
      toast('Encounter saved', 'success')
    } catch(err) { toast(err.response?.data?.error||'Save failed', 'error') }
    finally { setSaving(false) }
  }

  async function generateNote() {
    setGenerating(true); setTab('notes')
    try {
      const { data } = await api.post(`/encounters/${enc.id}/ai-note`, { transcript, vitals, chief_complaint: notes.chief_complaint })
      setAiNote(data.note)
      toast(data.ai_generated ? '🤖 AI note generated' : '📝 Template note applied', data.ai_generated?'success':'info')
    } catch(err) { toast(err.response?.data?.error||'Generation failed', 'error') }
    finally { setGenerating(false) }
  }

  async function addRx(e) {
    e.preventDefault(); if (!rxForm.medicine) return
    try {
      const { data } = await api.post(`/encounters/${enc.id}/prescriptions`, rxForm)
      setPrescriptions(r => [...r, data]); setRxForm({ medicine:'', strength:'', dosage:'1 tablet', frequency:'Twice daily', duration:'5 days', route:'Oral', instructions:'' })
      toast('Prescription added', 'success')
    } catch(err) { toast(err.response?.data?.error||'Failed', 'error') }
  }

  async function removeRx(rxid) {
    try { await api.delete(`/encounters/${enc.id}/prescriptions/${rxid}`); setPrescriptions(r => r.filter(x=>x.id!==rxid)); toast('Removed', 'info') }
    catch { toast('Failed to remove', 'error') }
  }

  async function addOrder(e) {
    e.preventDefault(); if (!orderForm.test_name) return
    try {
      const { data } = await api.post(`/encounters/${enc.id}/orders`, orderForm)
      setOrders(o => [...o, data]); setOrderForm({ test_name:'', category:'Lab', priority:'routine' })
      toast(`Order placed — charge auto-posted`, 'success')
    } catch(err) { toast(err.response?.data?.error||'Failed', 'error') }
  }

  async function signOff() {
    if (!window.confirm('Sign off this encounter? This action cannot be undone.')) return
    setSigning(true)
    try {
      await save()
      await api.post(`/encounters/${enc.id}/sign`)
      setEnc(e => ({ ...e, status:'signed', signed_at: new Date().toISOString() }))
      onUpdate({ ...enc, status:'signed' })
      toast('Encounter signed and locked ✓', 'success')
    } catch(err) { toast(err.response?.data?.error||'Sign-off failed', 'error') }
    finally { setSigning(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, background:'var(--surface)', flexShrink:0 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, fontWeight:700 }}>{enc.patient_name}</span>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>{enc.uhid}</span>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>· {enc.age}y {enc.gender}</span>
            {enc.blood_group && <span className="badge badge-info">{enc.blood_group}</span>}
            {enc.allergies && <span className="badge badge-danger" style={{ fontSize:10 }}>⚠ {enc.allergies}</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
            {enc.encounter_no} · Dr. {enc.doctor_name} · {new Date(enc.created_at).toLocaleDateString('en-IN')}
          </div>
        </div>
        <span className={`badge ${enc.status==='signed'?'badge-success':enc.status==='cancelled'?'badge-gray':'badge-warning'}`}>
          {enc.status==='signed'?'✓ Signed':enc.status==='cancelled'?'Cancelled':'Open'}
        </span>
        {!signed && (
          <>
            <button className="btn btn-outline btn-sm" onClick={save} disabled={saving}>{saving?<><span className="spinner spinner-sm"/>Saving…</>:'💾 Save'}</button>
            <button className="btn btn-success btn-sm" onClick={signOff} disabled={signing}>{signing?<><span className="spinner spinner-sm"/>Signing…</>:'✍ Sign Off'}</button>
          </>
        )}
      </div>

      <div className="tabs" style={{ padding:'0 16px', marginBottom:0, flexShrink:0 }}>
        {[['vitals','📊 Vitals'],['notes','📝 Notes & AI'],['icd','🏷 Diagnosis'],['rx','💊 Prescriptions'],['orders','🔬 Orders']].map(([k,l]) => (
          <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:16 }}>
        {tab==='vitals' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <div className="form-label" style={{ marginBottom:8 }}>Chief Complaint</div>
              <input className="input" value={notes.chief_complaint} onChange={e=>setNotes(n=>({...n,chief_complaint:e.target.value}))} placeholder="Patient's main complaint…" disabled={signed} />
            </div>
            <div>
              <div className="form-label" style={{ marginBottom:10 }}>Vitals</div>
              <div className="vitals-grid">
                {[['bp','Blood Pressure','mmHg'],['pulse','Pulse','bpm'],['temp','Temp','°F'],['spo2','SpO2','%'],['weight','Weight','kg'],['height','Height','cm'],['rr','Resp Rate','/min'],['bmi','BMI','kg/m²'],['sugar','Blood Sugar','mg/dL'],['pain','Pain Scale','0-10']].slice(0,5).map(([k,l,u]) => (
                  <div key={k} className="vital-box">
                    <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, marginBottom:6 }}>{l}</div>
                    <input className="input input-sm" style={{ textAlign:'center', fontWeight:700, fontSize:15, border:'none', background:'none', outline:'none', padding:'2px 0' }}
                      value={vitals[k]||''} onChange={e=>setVitals(v=>({...v,[k]:e.target.value}))} placeholder="—" disabled={signed} />
                    <div className="vital-unit">{u}</div>
                  </div>
                ))}
              </div>
              <div className="vitals-grid" style={{ marginTop:10 }}>
                {[['height','Height','cm'],['rr','Resp Rate','/min'],['bmi','BMI','kg/m²'],['sugar','Blood Sugar','mg/dL'],['pain','Pain','0-10']].map(([k,l,u]) => (
                  <div key={k} className="vital-box">
                    <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, marginBottom:6 }}>{l}</div>
                    <input className="input input-sm" style={{ textAlign:'center', fontWeight:700, fontSize:15, border:'none', background:'none', outline:'none', padding:'2px 0' }}
                      value={vitals[k]||''} onChange={e=>setVitals(v=>({...v,[k]:e.target.value}))} placeholder="—" disabled={signed} />
                    <div className="vital-unit">{u}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-grid form-grid-2" style={{ gap:12 }}>
              <div className="form-group"><label className="form-label">History of Present Illness</label><textarea className="textarea" value={notes.history} onChange={e=>setNotes(n=>({...n,history:e.target.value}))} placeholder="Onset, duration, character…" rows={4} disabled={signed} /></div>
              <div className="form-group"><label className="form-label">Examination Findings</label><textarea className="textarea" value={notes.examination} onChange={e=>setNotes(n=>({...n,examination:e.target.value}))} placeholder="Systemic examination findings…" rows={4} disabled={signed} /></div>
            </div>
          </div>
        )}

        {tab==='notes' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {!signed && (
              <div>
                <label className="form-label" style={{ marginBottom:6 }}>Clinical Transcript / Notes (for AI)</label>
                <textarea className="textarea" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Type or paste the clinical transcript, patient's history, findings, etc. The AI will convert this into a structured SOAP note…" rows={4} />
                <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={generateNote} disabled={generating}>
                    {generating ? <><span className="spinner spinner-sm"/>Generating…</> : '🤖 Generate SOAP Note'}
                  </button>
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>Powered by Claude AI · Requires ANTHROPIC_API_KEY</span>
                </div>
              </div>
            )}
            {aiNote ? (
              <div>
                <div className="form-label" style={{ marginBottom:6 }}>Clinical Note (SOAP Format)</div>
                <div className="ai-note-box" dangerouslySetInnerHTML={{ __html: aiNote.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">🤖</div><div className="empty-state-title">No AI note yet</div><div className="empty-state-desc">Enter transcript and click Generate SOAP Note</div></div>
            )}
            {signed && enc.signed_at && (
              <div style={{ background:'var(--success-bg)', border:'1px solid var(--success-border)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--success)' }}>
                ✍ Signed by Dr. {enc.doctor_name} on {new Date(enc.signed_at).toLocaleString('en-IN')}
              </div>
            )}
          </div>
        )}

        {tab==='icd' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><div className="form-label" style={{ marginBottom:8 }}>ICD-10 Diagnosis Codes</div>
            {!signed && <ICD10Search selected={icd10} onChange={setIcd10} />}</div>
            {icd10.length>0 && (
              <div className="card"><div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {icd10.map(code => (
                  <div key={code.code} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--primary-50)', borderRadius:8 }}>
                    <span className="badge badge-primary">{code.code}</span>
                    <span style={{ fontSize:13, flex:1 }}>{code.desc}</span>
                    {!signed && <button className="btn btn-ghost btn-xs" style={{ color:'var(--danger)' }} onClick={() => setIcd10(l => l.filter(x=>x.code!==code.code))}>✕</button>}
                  </div>
                ))}
              </div></div>
            )}
            {icd10.length===0 && <div className="empty-state"><div className="empty-state-icon">🏷</div><div className="empty-state-title">No diagnoses added</div><div className="empty-state-desc">Search and add ICD-10 codes</div></div>}
            {!signed && (
              <div className="form-group"><label className="form-label">Follow-up Date</label><input type="date" className="input" style={{ maxWidth:200 }} value={notes.follow_up_date||''} onChange={e=>setNotes(n=>({...n,follow_up_date:e.target.value}))} /></div>
            )}
          </div>
        )}

        {tab==='rx' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {!signed && (
              <form onSubmit={addRx} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:12 }}>💊 Add Prescription</div>
                <div className="form-grid form-grid-3" style={{ gap:10 }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">Medicine Name <span className="form-required">*</span></label>
                    <input className="input" value={rxForm.medicine} onChange={e=>setRxForm(f=>({...f,medicine:e.target.value}))} placeholder="Drug name (generic preferred)" required />
                  </div>
                  <div className="form-group"><label className="form-label">Strength</label><input className="input" value={rxForm.strength} onChange={e=>setRxForm(f=>({...f,strength:e.target.value}))} placeholder="500mg" /></div>
                  <div className="form-group"><label className="form-label">Dosage</label><input className="input" value={rxForm.dosage} onChange={e=>setRxForm(f=>({...f,dosage:e.target.value}))} placeholder="1 tablet" /></div>
                  <div className="form-group"><label className="form-label">Route</label><select className="select" value={rxForm.route} onChange={e=>setRxForm(f=>({...f,route:e.target.value}))}>{ROUTES.map(r=><option key={r}>{r}</option>)}</select></div>
                  <div className="form-group" style={{ gridColumn:'span 2' }}><label className="form-label">Frequency</label><select className="select" value={rxForm.frequency} onChange={e=>setRxForm(f=>({...f,frequency:e.target.value}))}>{FREQ.map(f=><option key={f}>{f}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Duration</label><input className="input" value={rxForm.duration} onChange={e=>setRxForm(f=>({...f,duration:e.target.value}))} placeholder="5 days" /></div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}><label className="form-label">Special Instructions</label><input className="input" value={rxForm.instructions} onChange={e=>setRxForm(f=>({...f,instructions:e.target.value}))} placeholder="Take after meals, avoid sunlight, etc." /></div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop:10 }}>+ Add to Prescription</button>
              </form>
            )}
            {prescriptions.length>0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Medicine</th><th>Strength</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Route</th><th>Instructions</th>{!signed&&<th></th>}</tr></thead>
                  <tbody>
                    {prescriptions.map(rx => (
                      <tr key={rx.id}>
                        <td><strong>{rx.medicine}</strong></td>
                        <td>{rx.strength||'—'}</td>
                        <td>{rx.dosage||'—'}</td>
                        <td>{rx.frequency||'—'}</td>
                        <td>{rx.duration||'—'}</td>
                        <td><span className="badge badge-info">{rx.route}</span></td>
                        <td style={{ fontSize:12, color:'var(--text-3)' }}>{rx.instructions||'—'}</td>
                        {!signed && <td><button className="btn btn-ghost btn-xs" style={{ color:'var(--danger)' }} onClick={() => removeRx(rx.id)}>✕</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state"><div className="empty-state-icon">💊</div><div className="empty-state-title">No prescriptions yet</div></div>}
          </div>
        )}

        {tab==='orders' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {!signed && (
              <form onSubmit={addOrder} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>🔬 Place Order</div>
                <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                  <div className="form-group" style={{ flex:2 }}><label className="form-label">Test / Procedure Name</label><input className="input" value={orderForm.test_name} onChange={e=>setOrderForm(f=>({...f,test_name:e.target.value}))} placeholder="CBC, X-Ray Chest PA, USG Abdomen…" /></div>
                  <div className="form-group" style={{ flex:1 }}><label className="form-label">Category</label><select className="select" value={orderForm.category} onChange={e=>setOrderForm(f=>({...f,category:e.target.value}))}><option>Lab</option><option>Radiology</option><option>Procedure</option></select></div>
                  <div className="form-group" style={{ flex:1 }}><label className="form-label">Priority</label><select className="select" value={orderForm.priority} onChange={e=>setOrderForm(f=>({...f,priority:e.target.value}))}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></div>
                  <button type="submit" className="btn btn-primary btn-md" style={{ marginBottom:0, flexShrink:0 }}>+ Order</button>
                </div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>⚡ Charges auto-posted to billing on order placement</div>
              </form>
            )}
            {orders.length>0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Test / Procedure</th><th>Category</th><th>Priority</th><th>Status</th><th>Ordered At</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.test_name}</strong></td>
                        <td><span className="badge badge-info">{o.category}</span></td>
                        <td><span className={`badge ${o.priority==='stat'?'badge-danger':o.priority==='urgent'?'badge-warning':'badge-gray'}`}>{o.priority}</span></td>
                        <td><span className={`badge ${o.status==='completed'?'badge-success':'badge-warning'}`}>{o.status}</span></td>
                        <td style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(o.created_at).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state"><div className="empty-state-icon">🔬</div><div className="empty-state-title">No orders yet</div></div>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OPD() {
  const [encounters, setEncounters] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ patient_id:'', chief_complaint:'', doctor_id:'' })
  const [search, setSearch] = useState('')
  const [patSearch, setPatSearch] = useState('')
  const [patResults, setPatResults] = useState([])
  const [creating, setCreating] = useState(false)
  const { user } = useAuthStore()
  const toast = useContext(ToastContext)

  useEffect(() => {
    Promise.all([api.get('/encounters'), api.get('/patients?limit=200'), api.get('/dashboard/stats')]).then(([e,p,d]) => {
      setEncounters(e.data); setPatients(p.data.patients); setDoctors(d.data.doctors||[]); setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (patSearch.length>1) setPatResults(patients.filter(p => p.name.toLowerCase().includes(patSearch.toLowerCase()) || p.uhid.includes(patSearch)).slice(0,6))
    else setPatResults([])
  }, [patSearch, patients])

  async function loadEncounter(id) {
    const { data } = await api.get(`/encounters/${id}`)
    setSelected(data)
  }

  async function createEncounter(e) {
    e.preventDefault(); if (!newForm.patient_id) return toast('Select a patient','warning')
    setCreating(true)
    try {
      const { data } = await api.post('/encounters', { ...newForm, doctor_id: user.role==='doctor' ? user.id : (newForm.doctor_id||user.id) })
      setEncounters(es => [data, ...es]); setShowNew(false)
      const full = await api.get(`/encounters/${data.id}`)
      setSelected(full.data); toast('Encounter created', 'success')
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setCreating(false) }
  }

  const filtered = encounters.filter(e => !search || e.patient_name?.toLowerCase().includes(search.toLowerCase()) || e.encounter_no?.includes(search) || e.uhid?.includes(search))

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:0, height:'calc(100vh - var(--header-h) - 48px)', background:'var(--surface)', borderRadius:16, overflow:'hidden', border:'1px solid var(--border)', boxShadow:'var(--s)' }}>
      {/* Left: Encounter List */}
      <div style={{ borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>🩺 Encounters</span>
            <button className="btn btn-primary btn-xs" onClick={() => setShowNew(true)}>+ New</button>
          </div>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text-3)', pointerEvents:'none' }}>🔍</span>
            <input style={{ width:'100%', padding:'6px 10px 6px 26px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:12, outline:'none', fontFamily:'inherit', color:'var(--text)' }}
              placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading ? <div style={{ padding:20, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
          : filtered.length===0 ? <div className="empty-state"><div className="empty-state-icon">🩺</div><div className="empty-state-title">No encounters</div><div className="empty-state-desc" style={{ fontSize:11 }}>Create a new OPD encounter</div></div>
          : filtered.map(enc => (
            <div key={enc.id} onClick={() => loadEncounter(enc.id)}
              style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', background:selected?.id===enc.id?'var(--primary-50)':'white', transition:'background 0.1s', borderLeft:`3px solid ${enc.status==='signed'?'var(--success)':enc.status==='cancelled'?'var(--border)':'var(--warning)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{enc.patient_name}</div>
                <span className={`badge ${enc.status==='signed'?'badge-success':enc.status==='cancelled'?'badge-gray':'badge-warning'}`} style={{ fontSize:10 }}>{enc.status}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{enc.uhid} · {enc.age}y {enc.gender}</div>
              <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }} className="truncate">{enc.chief_complaint||'No chief complaint'}</div>
              <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{enc.encounter_no} · {new Date(enc.created_at).toLocaleDateString('en-IN')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Detail */}
      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {selected
          ? <EncounterDetail enc={selected} onUpdate={upd => setEncounters(es => es.map(e => e.id===upd.id ? { ...e, ...upd } : e))} toast={toast} />
          : <div className="empty-state" style={{ flex:1, justifyContent:'center' }}><div className="empty-state-icon">🩺</div><div className="empty-state-title">Select an encounter</div><div className="empty-state-desc">Or create a new one to start documenting</div><button className="btn btn-primary btn-md" style={{ marginTop:16 }} onClick={() => setShowNew(true)}>+ New Encounter</button></div>
        }
      </div>

      {/* New Encounter Modal */}
      {showNew && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNew(false)}>
          <div className="modal modal-sm">
            <div className="modal-header"><span style={{ fontSize:20 }}>🩺</span><div className="modal-title">New OPD Encounter</div><button className="btn btn-ghost btn-icon" onClick={() => setShowNew(false)}>✕</button></div>
            <form onSubmit={createEncounter}>
              <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Patient <span className="form-required">*</span></label>
                  <div className="autocomplete">
                    {(() => { const sp = patients.find(p=>p.id===newForm.patient_id); return (
                      <input className="input" value={sp?`${sp.name} (${sp.uhid})`:patSearch} onChange={e=>{ if(!newForm.patient_id){setPatSearch(e.target.value)} }} onFocus={()=>{ if(newForm.patient_id){setNewForm(f=>({...f,patient_id:''}));setPatSearch('')} }} placeholder="Type patient name or UHID…" />
                    )})()}
                    {patResults.length>0 && (
                      <div className="autocomplete-list">
                        {patResults.map(p => (
                          <div key={p.id} className="autocomplete-item" onClick={() => { setNewForm(f=>({...f,patient_id:p.id})); setPatSearch(''); setPatResults([]) }}>
                            <span className="autocomplete-code">{p.uhid}</span>
                            <span className="autocomplete-desc">{p.name} · {p.age}y {p.gender} · {p.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {user.role==='admin' && (
                  <div className="form-group">
                    <label className="form-label">Assign Doctor</label>
                    <select className="select" value={newForm.doctor_id} onChange={e=>setNewForm(f=>({...f,doctor_id:e.target.value}))}>
                      <option value="">Select doctor</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Chief Complaint</label>
                  <input className="input" value={newForm.chief_complaint} onChange={e=>setNewForm(f=>({...f,chief_complaint:e.target.value}))} placeholder="Primary reason for visit…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-md" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-md" disabled={creating||!newForm.patient_id}>{creating?<><span className="spinner spinner-sm"/>Creating…</>:'Create Encounter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
