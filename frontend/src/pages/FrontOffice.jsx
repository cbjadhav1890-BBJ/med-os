import { useState, useEffect, useContext } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const PRIORITIES = ['normal','urgent','emergency']
const STATUS_BADGE = { waiting:{ cls:'badge-warning', label:'Waiting' }, 'in-progress':{ cls:'badge-primary', label:'In Progress' }, completed:{ cls:'badge-success', label:'Done' }, cancelled:{ cls:'badge-gray', label:'Cancelled' } }
const PRI_BADGE    = { normal:{ cls:'badge-gray', label:'Normal' }, urgent:{ cls:'badge-warning', label:'Urgent' }, emergency:{ cls:'badge-emergency', label:'Emergency' } }

function PatientForm({ onClose, onCreated, toast }) {
  const [form, setForm] = useState({ name:'', age:'', gender:'', phone:'', email:'', address:'', city:'', blood_group:'', allergies:'', abha_id:'', dpdp_consent:false, dpdp_purpose:'' })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1=basic, 2=medical, 3=consent

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/patients', { ...form, dpdp_consent:form.dpdp_consent?1:0 })
      toast('Patient registered: ' + data.uhid, 'success')
      onCreated(data); onClose()
    } catch (err) { toast(err.response?.data?.error || 'Registration failed', 'error') }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }))

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize:20 }}>👤</span>
          <div className="modal-title">Register New Patient</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', gap:0, padding:'0 24px', borderBottom:'1px solid var(--border)' }}>
          {[['1','Basic Info'],['2','Medical Info'],['3','DPDP Consent']].map(([n,l],i) => (
            <button key={n} onClick={() => setStep(i+1)}
              style={{ padding:'10px 16px', border:'none', borderBottom:`2px solid ${step===i+1?'var(--primary)':'transparent'}`, background:'none', color:step===i+1?'var(--primary)':'var(--text-3)', fontWeight:step===i+1?700:500, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:-2 }}>
              <span style={{ width:20, height:20, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', background:step===i+1?'var(--primary)':'var(--border)', color:step===i+1?'white':'var(--text-3)', fontSize:11, fontWeight:700, marginRight:8 }}>{n}</span>{l}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            {step===1 && (
              <div className="form-grid form-grid-2" style={{ gap:16 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Full Name <span className="form-required">*</span></label>
                  <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Patient's full name" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="input" type="number" value={form.age} onChange={e=>set('age',e.target.value)} placeholder="Age in years" min="0" max="150" />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="select" value={form.gender} onChange={e=>set('gender',e.target.value)}>
                    <option value="">Select gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone <span className="form-required">*</span></label>
                  <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="10-digit mobile" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Address</label>
                  <input className="input" value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Street address" />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="input" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="City" />
                </div>
                <div className="form-group">
                  <label className="form-label">ABHA ID (Health ID)</label>
                  <input className="input" value={form.abha_id} onChange={e=>set('abha_id',e.target.value)} placeholder="14-digit ABHA number" />
                </div>
              </div>
            )}
            {step===2 && (
              <div className="form-grid form-grid-2" style={{ gap:16 }}>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="select" value={form.blood_group} onChange={e=>set('blood_group',e.target.value)}>
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="input" type="date" value={form.dob||''} onChange={e=>set('dob',e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Known Allergies</label>
                  <textarea className="textarea" value={form.allergies} onChange={e=>set('allergies',e.target.value)} placeholder="List any known allergies (drugs, food, etc.)" rows={3} />
                </div>
              </div>
            )}
            {step===3 && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ background:'linear-gradient(135deg,#EFF6FF,#F0FDF4)', border:'1px solid var(--primary-100)', borderRadius:12, padding:20 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>🔒 DPDP Consent — Digital Personal Data Protection Act, 2023</div>
                  <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>
                    The patient's personal health data will be collected, processed, and stored for the purpose of providing medical care. Data may be shared with treating doctors, nurses, and billing staff within this facility only.
                  </div>
                </div>
                <label className="checkbox-group" style={{ alignItems:'flex-start', gap:12 }}>
                  <input type="checkbox" className="checkbox" style={{ marginTop:2 }} checked={form.dpdp_consent} onChange={e=>set('dpdp_consent',e.target.checked)} />
                  <div>
                    <div className="checkbox-label" style={{ fontWeight:600 }}>I give informed consent for data collection and processing</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Patient has been explained the purpose and given voluntary consent</div>
                  </div>
                </label>
                {form.dpdp_consent && (
                  <div className="form-group">
                    <label className="form-label">Purpose of Data Processing</label>
                    <select className="select" value={form.dpdp_purpose} onChange={e=>set('dpdp_purpose',e.target.value)}>
                      <option value="">Select purpose</option>
                      <option>Medical treatment and care</option>
                      <option>Medical treatment, insurance and billing</option>
                      <option>Medical treatment, research (de-identified)</option>
                      <option>Full access – treatment, billing, insurance, follow-up</option>
                    </select>
                  </div>
                )}
                {!form.dpdp_consent && (
                  <div style={{ background:'var(--warning-bg)', border:'1px solid var(--warning-border)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--warning)' }}>
                    ⚠️ Without consent, limited services may be provided. Consent can be obtained at any time.
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            {step>1 && <button type="button" className="btn btn-outline btn-md" onClick={() => setStep(step-1)}>← Back</button>}
            <div style={{ flex:1 }} />
            {step<3 ? (
              <button type="button" className="btn btn-primary btn-md" onClick={() => setStep(step+1)} disabled={step===1 && (!form.name||!form.phone)}>Continue →</button>
            ) : (
              <button type="submit" className="btn btn-success btn-md" disabled={loading}>
                {loading ? <><span className="spinner spinner-sm"/>Registering…</> : '✓ Register Patient'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function AddToQueueModal({ patients, doctors, onClose, onAdded, toast }) {
  const [pid, setPid] = useState(''), [did, setDid] = useState(''), [prio, setPrio] = useState('normal'), [search, setSearch] = useState(''), [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (search.length > 1) setFiltered(patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.uhid.includes(search)).slice(0,5))
    else setFiltered([])
  }, [search, patients])

  async function add(e) {
    e.preventDefault(); if (!pid) return toast('Select a patient', 'warning'); setLoading(true)
    try {
      const { data } = await api.post('/queue', { patient_id:pid, doctor_id:did||null, priority:prio })
      toast(`Token ${data.token_no} issued for ${data.patient_name}`, 'success')
      onAdded(data); onClose()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  const selPat = patients.find(p => p.id===pid)

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <span style={{ fontSize:20 }}>🔢</span>
          <div className="modal-title">Add to Queue</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={add}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="form-group">
              <label className="form-label">Search Patient <span className="form-required">*</span></label>
              <div className="autocomplete">
                <input className="input" value={selPat?selPat.name:search} onChange={e=>{ if(!pid){setSearch(e.target.value)} }} onFocus={()=>{ if(pid){setPid('');setSearch('')} }} placeholder="Type name or UHID…" />
                {filtered.length>0 && (
                  <div className="autocomplete-list">
                    {filtered.map(p => (
                      <div key={p.id} className="autocomplete-item" onClick={() => { setPid(p.id); setSearch(''); setFiltered([]) }}>
                        <span className="autocomplete-code">{p.uhid}</span>
                        <span className="autocomplete-desc">{p.name} · {p.age}y {p.gender} · {p.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selPat && (
              <div style={{ background:'var(--primary-50)', border:'1px solid var(--primary-100)', borderRadius:10, padding:'10px 12px', display:'flex', gap:10, alignItems:'center' }}>
                <div className="avatar avatar-sm avatar-blue">{selPat.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                <div><div style={{ fontSize:13, fontWeight:600 }}>{selPat.name}</div><div style={{ fontSize:11, color:'var(--text-3)' }}>{selPat.uhid} · {selPat.age}y {selPat.gender} · {selPat.blood_group}</div></div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Assign Doctor (optional)</label>
              <select className="select" value={did} onChange={e=>setDid(e.target.value)}>
                <option value="">Any available doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.department}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display:'flex', gap:8 }}>
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setPrio(p)}
                    style={{ flex:1, padding:'8px', border:`2px solid ${prio===p?'var(--primary)':'var(--border)'}`, borderRadius:8, background:prio===p?'var(--primary-50)':'white', color:prio===p?'var(--primary)':'var(--text-3)', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize', fontFamily:'inherit' }}>
                    {p==='emergency'?'🚨':p==='urgent'?'⚡':'🟢'} {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-md" disabled={loading||!pid}>
              {loading ? <><span className="spinner spinner-sm"/>Adding…</> : '🔢 Issue Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FrontOffice() {
  const [tab, setTab] = useState('queue')
  const [patients, setPatients] = useState([])
  const [queue, setQueue] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReg, setShowReg] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [patSearch, setPatSearch] = useState('')
  const toast = useContext(ToastContext)

  async function loadData() {
    setLoading(true)
    const [pRes, qRes, dRes] = await Promise.all([
      api.get('/patients?limit=100'), api.get('/queue'), api.get('/dashboard/stats')
    ])
    setPatients(pRes.data.patients)
    setQueue(qRes.data)
    setDoctors(dRes.data.doctors || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])
  // Poll queue every 30s
  useEffect(() => { const t = setInterval(() => api.get('/queue').then(r => setQueue(r.data)), 30000); return () => clearInterval(t) }, [])

  async function updateQueueStatus(id, status) {
    try { await api.put(`/queue/${id}`, { status }); setQueue(q => q.map(x => x.id===id ? { ...x, status } : x)); toast(`Status → ${status}`, 'success') }
    catch(err) { toast(err.response?.data?.error||'Failed', 'error') }
  }

  async function updateConsent(pid, consent) {
    try { await api.patch(`/patients/${pid}/consent`, { dpdp_consent:consent, dpdp_purpose:'Medical treatment and care' }); setPatients(ps => ps.map(p => p.id===pid ? { ...p, dpdp_consent:consent?1:0 } : p)); toast('Consent updated', 'success') }
    catch(err) { toast('Failed to update consent', 'error') }
  }

  const waiting = queue.filter(q => q.status==='waiting').length
  const inProgress = queue.filter(q => q.status==='in-progress').length
  const filteredPats = patients.filter(p => !patSearch || p.name.toLowerCase().includes(patSearch.toLowerCase()) || p.uhid.includes(patSearch) || p.phone.includes(patSearch))

  return (
    <div>
      {/* Quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[['👥','Total Patients',patients.length,'var(--primary)'],['⏳','Waiting',waiting,'var(--warning)'],['🩺','In Progress',inProgress,'var(--purple)'],['✅','Completed Today',queue.filter(q=>q.status==='completed').length,'var(--success)']].map(([icon,label,val,color]) => (
          <div key={label} style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, padding:'16px', boxShadow:'var(--s-sm)' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:'var(--text)' }}>{val}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3, textTransform:'uppercase', fontWeight:600, letterSpacing:0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="flex-between" style={{ marginBottom:16 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {[['queue','🔢 Queue Board'],['patients','👥 Patients'],['consent','🔒 DPDP Consent']].map(([k,l]) => (
            <button key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline btn-md" onClick={() => setShowQueue(true)}>🔢 Add to Queue</button>
          <button className="btn btn-primary btn-md" onClick={() => setShowReg(true)}>+ Register Patient</button>
        </div>
      </div>

      {loading ? <div style={{ padding:40, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div> : <>

      {tab==='queue' && (
        <div>
          <div className="queue-board">
            {queue.length===0 && (
              <div style={{ gridColumn:'1/-1' }}>
                <div className="empty-state"><div className="empty-state-icon">🔢</div><div className="empty-state-title">Queue is empty</div><div className="empty-state-desc">Add patients to the queue to see them here.</div></div>
              </div>
            )}
            {queue.map(q => (
              <div key={q.id} className={`queue-card ${q.status} ${q.priority==='emergency'?'emergency':''}`}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div className="queue-token">{q.token_no}</div>
                  <span className={`badge ${PRI_BADGE[q.priority]?.cls}`}>{PRI_BADGE[q.priority]?.label}</span>
                </div>
                <div className="queue-name">{q.patient_name}</div>
                <div className="queue-meta">{q.uhid} · {q.age}y {q.gender}</div>
                {q.doctor_name && <div className="queue-meta" style={{ marginTop:2 }}>Dr: {q.doctor_name}</div>}
                <div style={{ marginTop:6 }}><span className={`badge ${STATUS_BADGE[q.status]?.cls}`}>{STATUS_BADGE[q.status]?.label}</span></div>
                <div className="queue-actions">
                  {q.status==='waiting'     && <button className="btn btn-primary btn-xs" onClick={() => updateQueueStatus(q.id,'in-progress')}>▶ Call</button>}
                  {q.status==='in-progress' && <button className="btn btn-success btn-xs" onClick={() => updateQueueStatus(q.id,'completed')}>✓ Done</button>}
                  {['waiting','in-progress'].includes(q.status) && <button className="btn btn-outline btn-xs" onClick={() => updateQueueStatus(q.id,'cancelled')}>✕</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='patients' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>👥</span>
            <div><div className="card-title">All Patients</div><div className="card-subtitle">{filteredPats.length} of {patients.length}</div></div>
            <div style={{ marginLeft:'auto' }}>
              <div className="search-box"><span className="search-icon">🔍</span><input className="search-input" placeholder="Search by name, UHID, phone…" value={patSearch} onChange={e=>setPatSearch(e.target.value)} /></div>
            </div>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>UHID</th><th>Patient</th><th>Age / Gender</th><th>Phone</th><th>Blood Group</th><th>City</th><th>DPDP Consent</th><th>Registered</th></tr></thead>
              <tbody>
                {filteredPats.map(p => (
                  <tr key={p.id}>
                    <td><span className="mono-val">{p.uhid}</span></td>
                    <td><div style={{ display:'flex', alignItems:'center', gap:8 }}><div className="avatar avatar-sm avatar-blue">{p.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div><strong>{p.name}</strong></div></td>
                    <td>{p.age || '—'}y / {p.gender || '—'}</td>
                    <td>{p.phone}</td>
                    <td><span className="badge badge-info">{p.blood_group||'—'}</span></td>
                    <td>{p.city||'—'}</td>
                    <td>
                      <span className={`badge ${p.dpdp_consent ? 'badge-success':'badge-warning'}`}>{p.dpdp_consent ? '✓ Obtained':'Pending'}</span>
                    </td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
                {filteredPats.length===0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No patients found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='consent' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>🔒</span>
            <div><div className="card-title">DPDP Consent Tracker</div><div className="card-subtitle">Digital Personal Data Protection Act, 2023 compliance</div></div>
            <div style={{ marginLeft:'auto' }}>
              <span className="badge badge-warning">{patients.filter(p=>!p.dpdp_consent).length} pending</span>
            </div>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>UHID</th><th>Patient</th><th>Phone</th><th>Consent Status</th><th>Date Obtained</th><th>Action</th></tr></thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}>
                    <td><span className="mono-val">{p.uhid}</span></td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.phone}</td>
                    <td><span className={`badge ${p.dpdp_consent?'badge-success':'badge-warning'}`}>{p.dpdp_consent?'✓ Consent Given':'⚠ Pending'}</span></td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{p.dpdp_consent_date ? new Date(p.dpdp_consent_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      {!p.dpdp_consent
                        ? <button className="btn btn-success btn-xs" onClick={() => updateConsent(p.id, true)}>✓ Obtain Consent</button>
                        : <button className="btn btn-outline btn-xs" style={{ color:'var(--danger)' }} onClick={() => updateConsent(p.id, false)}>Revoke</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>}

      {showReg && <PatientForm onClose={() => setShowReg(false)} onCreated={p => setPatients(ps => [p, ...ps])} toast={toast} />}
      {showQueue && <AddToQueueModal patients={patients} doctors={doctors} onClose={() => setShowQueue(false)} onAdded={q => setQueue(qs => [q, ...qs])} toast={toast} />}
    </div>
  )
}
