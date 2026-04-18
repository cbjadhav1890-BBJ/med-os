import { useState, useEffect, useContext } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'
import { useAuthStore } from '../store/authStore'

const STATUS_BADGE = { scheduled:'badge-info', confirmed:'badge-primary', waiting:'badge-warning', 'in-progress':'badge-primary', completed:'badge-success', cancelled:'badge-gray', 'no-show':'badge-danger' }

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBook, setShowBook] = useState(false)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0,10))
  const { user } = useAuthStore()
  const toast = useContext(ToastContext)

  useEffect(() => {
    Promise.all([api.get(`/appointments?date=${dateFilter}`), api.get('/patients?limit=200'), api.get('/dashboard/stats')]).then(([a,p,d]) => {
      setAppointments(a.data); setPatients(p.data.patients); setDoctors(d.data.doctors||[]); setLoading(false)
    })
  }, [dateFilter])

  async function updateStatus(id, status) {
    try { await api.put(`/appointments/${id}`, { status }); setAppointments(a=>a.map(x=>x.id===id?{...x,status}:x)); toast(`Status → ${status}`,'success') }
    catch(err) { toast(err.response?.data?.error||'Failed','error') }
  }

  const scheduled = appointments.filter(a => a.status==='scheduled')
  const inProgress = appointments.filter(a => ['waiting','in-progress'].includes(a.status))
  const completed = appointments.filter(a => a.status==='completed')

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom:20 }}>
        {[
          { icon:'📅', value:appointments.length, label:'Total Today', color:'var(--primary)' },
          { icon:'⏳', value:scheduled.length, label:'Scheduled', color:'var(--cyan)' },
          { icon:'🩺', value:inProgress.length, label:'In Progress', color:'var(--warning)' },
          { icon:'✅', value:completed.length, label:'Completed', color:'var(--success)' },
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
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input type="date" className="input" style={{ width:170 }} value={dateFilter} onChange={e=>setDateFilter(e.target.value)} />
          <button className="btn btn-outline btn-sm" onClick={()=>setDateFilter(new Date().toISOString().slice(0,10))}>Today</button>
        </div>
        <button className="btn btn-primary btn-md" onClick={()=>setShowBook(true)}>+ Book Appointment</button>
      </div>

      {loading ? <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div> : (
        <div className="card">
          <div className="card-header"><span style={{ fontSize:16 }}>📅</span><div><div className="card-title">Appointments — {new Date(dateFilter).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</div><div className="card-subtitle">{appointments.length} appointments</div></div></div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>Apt No</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Complaint</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id}>
                    <td><span className="mono-val" style={{ color:'var(--primary-light)' }}>{a.appointment_no}</span></td>
                    <td style={{ fontWeight:700, fontFamily:'JetBrains Mono, monospace', color:'var(--text-white)' }}>{a.scheduled_time}</td>
                    <td><div><strong>{a.patient_name}</strong></div><div style={{ fontSize:11, color:'var(--text-3)' }}>{a.uhid} · {a.phone}</div></td>
                    <td style={{ fontSize:12 }}>{a.doctor_name}</td>
                    <td><span className="badge badge-info">{a.appointment_type}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-3)', maxWidth:160 }} className="truncate">{a.chief_complaint||'—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>{a.status}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        {a.status==='scheduled' && <><button className="btn btn-primary btn-xs" onClick={()=>updateStatus(a.id,'confirmed')}>Confirm</button><button className="btn btn-outline btn-xs" onClick={()=>updateStatus(a.id,'cancelled')}>✕</button></>}
                        {a.status==='confirmed' && <button className="btn btn-warning btn-xs" style={{ background:'var(--warning)', color:'black' }} onClick={()=>updateStatus(a.id,'waiting')}>Check-in</button>}
                        {a.status==='waiting' && <button className="btn btn-primary btn-xs" onClick={()=>updateStatus(a.id,'in-progress')}>Start</button>}
                        {a.status==='in-progress' && <button className="btn btn-success btn-xs" onClick={()=>updateStatus(a.id,'completed')}>Complete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {appointments.length===0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:'var(--text-3)' }}>No appointments for this date</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBook && <BookModal patients={patients} doctors={doctors} onClose={()=>setShowBook(false)} onBooked={a=>{setAppointments(as=>[a,...as])}} toast={toast} />}
    </div>
  )
}

function BookModal({ patients, doctors, onClose, onBooked, toast }) {
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', scheduled_date:new Date().toISOString().slice(0,10), scheduled_time:'10:00', appointment_type:'New', chief_complaint:'' })
  const [patSearch, setPatSearch] = useState(''); const [patResults, setPatResults] = useState([]); const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const selPat = patients.find(p=>p.id===form.patient_id)

  useEffect(() => { if(patSearch.length>1) setPatResults(patients.filter(p=>p.name.toLowerCase().includes(patSearch.toLowerCase())||p.uhid.includes(patSearch)).slice(0,5)); else setPatResults([]) }, [patSearch, patients])

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { const {data}=await api.post('/appointments',form); toast(`Appointment booked — ${data.appointment_no}`,'success'); onBooked(data); onClose() }
    catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-md">
        <div className="modal-header"><span style={{ fontSize:20 }}>📅</span><div className="modal-title">Book Appointment</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="form-group">
              <label className="form-label">Patient <span className="form-required">*</span></label>
              <div className="autocomplete">
                <input className="input" value={selPat?`${selPat.name} (${selPat.uhid})`:patSearch} onChange={e=>{if(!form.patient_id)setPatSearch(e.target.value)}} onFocus={()=>{if(form.patient_id){set('patient_id','');setPatSearch('')}}} placeholder="Search patient…" />
                {patResults.length>0 && <div className="autocomplete-list">{patResults.map(p=><div key={p.id} className="autocomplete-item" onClick={()=>{set('patient_id',p.id);setPatSearch('');setPatResults([])}}><span className="autocomplete-code">{p.uhid}</span><span className="autocomplete-desc">{p.name} · {p.age}y</span></div>)}</div>}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Doctor <span className="form-required">*</span></label><select className="select" value={form.doctor_id} onChange={e=>set('doctor_id',e.target.value)} required><option value="">Select doctor…</option>{doctors.map(d=><option key={d.id} value={d.id}>{d.name} — {d.department}</option>)}</select></div>
            <div className="form-grid form-grid-3" style={{ gap:12 }}>
              <div className="form-group"><label className="form-label">Date</label><input type="date" className="input" value={form.scheduled_date} onChange={e=>set('scheduled_date',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Time</label><input type="time" className="input" value={form.scheduled_time} onChange={e=>set('scheduled_time',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Type</label><select className="select" value={form.appointment_type} onChange={e=>set('appointment_type',e.target.value)}><option>New</option><option>Follow-up</option><option>Emergency</option></select></div>
            </div>
            <div className="form-group"><label className="form-label">Chief Complaint</label><input className="input" value={form.chief_complaint} onChange={e=>set('chief_complaint',e.target.value)} placeholder="Reason for visit…" /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary btn-md" disabled={loading||!form.patient_id||!form.doctor_id}>{loading?<><span className="spinner spinner-sm"/>Booking…</>:'📅 Book Appointment'}</button></div>
        </form>
      </div>
    </div>
  )
}
