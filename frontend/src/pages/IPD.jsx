import { useState, useEffect, useContext } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'

export default function IPD() {
  const [tab, setTab] = useState('admissions')
  const [admissions, setAdmissions] = useState([])
  const [rooms, setRooms] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdmit, setShowAdmit] = useState(false)
  const [showDischarge, setShowDischarge] = useState(null)
  const toast = useContext(ToastContext)

  useEffect(() => {
    Promise.all([api.get('/admissions'), api.get('/rooms'), api.get('/patients?limit=200'), api.get('/dashboard/stats')]).then(([a,r,p,d]) => {
      setAdmissions(a.data); setRooms(r.data); setPatients(p.data.patients); setDoctors(d.data.doctors||[]); setLoading(false)
    })
  }, [])

  const admitted = admissions.filter(a => a.status==='admitted')
  const discharged = admissions.filter(a => a.status==='discharged')
  const totalBeds = rooms.reduce((s,r) => s+r.beds_total, 0)
  const occupiedBeds = rooms.reduce((s,r) => s+r.beds_occupied, 0)

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom:20 }}>
        {[
          { icon:'🛏️', value:admitted.length, label:'Currently Admitted', color:'var(--primary)' },
          { icon:'🏥', value:rooms.length, label:'Total Rooms', color:'var(--cyan)' },
          { icon:'📊', value:`${occupiedBeds}/${totalBeds}`, label:'Bed Occupancy', color:'var(--warning)' },
          { icon:'✅', value:discharged.length, label:'Discharged', color:'var(--success)' },
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
          {[['admissions','🛏️ Admissions'],['rooms','🏥 Room Map']].map(([k,l]) => (
            <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-md" onClick={()=>setShowAdmit(true)}>+ Admit Patient</button>
      </div>

      {loading ? <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div> : <>

      {tab==='admissions' && (
        <div className="card">
          <div className="card-header"><span style={{ fontSize:16 }}>🛏️</span><div><div className="card-title">All Admissions</div><div className="card-subtitle">{admissions.length} records</div></div></div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>Admission No</th><th>Patient</th><th>Doctor</th><th>Room</th><th>Admitted</th><th>Days</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {admissions.map(a => (
                  <tr key={a.id}>
                    <td><span className="mono-val" style={{ color:'var(--primary-light)', fontWeight:700 }}>{a.admission_no}</span></td>
                    <td><div><strong style={{ color:'var(--text-white)' }}>{a.patient_name}</strong></div><div style={{ fontSize:11, color:'var(--text-3)' }}>{a.uhid} · {a.blood_group}</div></td>
                    <td style={{ fontSize:12 }}>{a.doctor_name}</td>
                    <td>{a.room_no ? <><span className="badge badge-info">{a.room_type}</span> <span className="mono-val">{a.room_no}</span></> : '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-3)' }}>{new Date(a.admission_date).toLocaleDateString('en-IN')}</td>
                    <td>{a.days_admitted || Math.max(1,Math.ceil((Date.now()-new Date(a.admission_date))/86400000))}</td>
                    <td><span className={`badge ${a.status==='admitted'?'badge-warning':'badge-success'}`}>{a.status}</span></td>
                    <td>{a.status==='admitted' && <button className="btn btn-success btn-xs" onClick={()=>setShowDischarge(a)}>Discharge</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='rooms' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:14 }}>
          {rooms.map(r => {
            const pct = r.beds_total>0 ? (r.beds_occupied/r.beds_total*100) : 0
            return (
              <div key={r.id} className="card" style={{ cursor:'default' }}>
                <div style={{ padding:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:18, fontWeight:800, color:'var(--text-white)' }}>{r.room_no}</div>
                      <span className="badge badge-info">{r.room_type}</span>
                    </div>
                    <span className={`badge ${pct>=100?'badge-danger':pct>=50?'badge-warning':'badge-success'}`}>
                      {r.beds_occupied}/{r.beds_total} beds
                    </span>
                  </div>
                  <div style={{ height:6, background:'var(--border)', borderRadius:99, overflow:'hidden', marginBottom:8 }}>
                    <div style={{ height:'100%', background:pct>=100?'var(--danger)':pct>=50?'var(--warning)':'var(--success)', borderRadius:99, width:`${pct}%`, transition:'width 0.5s' }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)' }}>
                    <span>₹{r.daily_rate}/day</span>
                    <span>{r.department_name||'—'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>}

      {/* Admit Modal */}
      {showAdmit && <AdmitModal patients={patients} doctors={doctors} rooms={rooms} onClose={()=>setShowAdmit(false)} onAdmitted={a=>{setAdmissions(as=>[a,...as]); api.get('/rooms').then(r=>setRooms(r.data))}} toast={toast} />}
      {/* Discharge Modal */}
      {showDischarge && <DischargeModal admission={showDischarge} onClose={()=>setShowDischarge(null)} onDischarged={()=>{Promise.all([api.get('/admissions'),api.get('/rooms')]).then(([a,r])=>{setAdmissions(a.data);setRooms(r.data)})}} toast={toast} />}
    </div>
  )
}

function AdmitModal({ patients, doctors, rooms, onClose, onAdmitted, toast }) {
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', room_id:'', bed_no:'', admission_diagnosis:'' })
  const [patSearch, setPatSearch] = useState(''); const [patResults, setPatResults] = useState([]); const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const selPat = patients.find(p=>p.id===form.patient_id)

  useEffect(() => { if(patSearch.length>1) setPatResults(patients.filter(p=>p.name.toLowerCase().includes(patSearch.toLowerCase())||p.uhid.includes(patSearch)).slice(0,5)); else setPatResults([]) }, [patSearch, patients])

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { const {data}=await api.post('/admissions',form); toast(`Patient admitted — ${data.admission_no}`,'success'); onAdmitted(data); onClose() }
    catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-md">
        <div className="modal-header"><span style={{ fontSize:20 }}>🛏️</span><div className="modal-title">Admit Patient (IPD)</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="form-group">
              <label className="form-label">Patient <span className="form-required">*</span></label>
              <div className="autocomplete">
                <input className="input" value={selPat?`${selPat.name} (${selPat.uhid})`:patSearch} onChange={e=>{if(!form.patient_id)setPatSearch(e.target.value)}} onFocus={()=>{if(form.patient_id){set('patient_id','');setPatSearch('')}}} placeholder="Search patient…" />
                {patResults.length>0 && <div className="autocomplete-list">{patResults.map(p=><div key={p.id} className="autocomplete-item" onClick={()=>{set('patient_id',p.id);setPatSearch('');setPatResults([])}}><span className="autocomplete-code">{p.uhid}</span><span className="autocomplete-desc">{p.name} · {p.age}y {p.gender}</span></div>)}</div>}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Doctor <span className="form-required">*</span></label><select className="select" value={form.doctor_id} onChange={e=>set('doctor_id',e.target.value)} required><option value="">Select doctor…</option>{doctors.map(d=><option key={d.id} value={d.id}>{d.name} — {d.department}</option>)}</select></div>
            <div className="form-grid form-grid-2" style={{ gap:12 }}>
              <div className="form-group"><label className="form-label">Room</label><select className="select" value={form.room_id} onChange={e=>set('room_id',e.target.value)}><option value="">Select room…</option>{rooms.filter(r=>r.beds_occupied<r.beds_total).map(r=><option key={r.id} value={r.id}>{r.room_no} — {r.room_type} — ₹{r.daily_rate}/day ({r.beds_total-r.beds_occupied} beds free)</option>)}</select></div>
              <div className="form-group"><label className="form-label">Bed No</label><input className="input" value={form.bed_no} onChange={e=>set('bed_no',e.target.value)} placeholder="e.g. B1" /></div>
            </div>
            <div className="form-group"><label className="form-label">Admission Diagnosis</label><textarea className="textarea" value={form.admission_diagnosis} onChange={e=>set('admission_diagnosis',e.target.value)} placeholder="Reason for admission…" rows={3} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary btn-md" disabled={loading||!form.patient_id||!form.doctor_id}>{loading?<><span className="spinner spinner-sm"/>Admitting…</>:'🛏️ Admit Patient'}</button></div>
        </form>
      </div>
    </div>
  )
}

function DischargeModal({ admission, onClose, onDischarged, toast }) {
  const [form, setForm] = useState({ discharge_diagnosis:'', discharge_summary:'' })
  const [loading, setLoading] = useState(false)
  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { const {data}=await api.put(`/admissions/${admission.id}/discharge`,form); toast(`Patient discharged — ${data.days_admitted} days`,'success'); onDischarged(); onClose() }
    catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-md">
        <div className="modal-header"><span style={{ fontSize:20 }}>✅</span><div className="modal-title">Discharge — {admission.patient_name}</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--surface-3)', borderRadius:12, padding:14, border:'1px solid var(--border)' }}>
              <div style={{ fontSize:13 }}><strong>{admission.patient_name}</strong> · {admission.uhid}</div>
              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>Admission: {admission.admission_no} · Room: {admission.room_no||'—'} · Doctor: {admission.doctor_name}</div>
              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Admitted: {new Date(admission.admission_date).toLocaleDateString('en-IN')} · Days: {Math.max(1,Math.ceil((Date.now()-new Date(admission.admission_date))/86400000))}</div>
            </div>
            <div className="form-group"><label className="form-label">Discharge Diagnosis</label><textarea className="textarea" value={form.discharge_diagnosis} onChange={e=>setForm(f=>({...f,discharge_diagnosis:e.target.value}))} placeholder="Final diagnosis…" rows={2} /></div>
            <div className="form-group"><label className="form-label">Discharge Summary</label><textarea className="textarea" value={form.discharge_summary} onChange={e=>setForm(f=>({...f,discharge_summary:e.target.value}))} placeholder="Discharge summary, instructions, follow-up…" rows={4} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-success btn-md" disabled={loading}>{loading?<><span className="spinner spinner-sm"/>Processing…</>:'✅ Discharge Patient'}</button></div>
        </form>
      </div>
    </div>
  )
}
