import { useState, useEffect, useContext } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'

const ROLE_INFO = { admin:{ label:'Administrator', color:'#7C3AED', bg:'#F5F3FF' }, doctor:{ label:'Doctor', color:'#2563EB', bg:'#EFF6FF' }, nurse:{ label:'Nurse', color:'#059669', bg:'#ECFDF5' }, reception:{ label:'Reception', color:'#0891B2', bg:'#ECFEFF' }, billing:{ label:'Billing', color:'#D97706', bg:'#FFFBEB' } }
const ACTION_ICONS = { LOGIN:'🔑', REGISTER_PATIENT:'👤', CREATE_ENCOUNTER:'📋', SIGN_ENCOUNTER:'✍️', CREATE_INVOICE:'🧾', GENERATE_AI_NOTE:'🤖', UPDATE_PATIENT:'✏️', CREATE_ORDER:'🔬', ADD_TO_QUEUE:'🔢', CREATE_CHARGE:'💰', UPDATE_DPDP_CONSENT:'🔒', CREATE_USER:'👥', UPDATE_USER:'✏️', REMOVE_PRESCRIPTION:'💊' }

function UserModal({ user, onClose, onSaved, toast }) {
  const isNew = !user
  const [form, setForm] = useState(user || { username:'', password:'', role:'doctor', name:'', department:'', email:'', phone:'' })
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }))

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try {
      if (isNew) {
        const { data } = await api.post('/users', form)
        toast('User created: ' + data.username, 'success'); onSaved(data, true)
      } else {
        await api.put(`/users/${user.id}`, form)
        toast('User updated', 'success'); onSaved({ ...user, ...form }, false)
      }
      onClose()
    } catch(err) { toast(err.response?.data?.error||'Failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <span style={{ fontSize:20 }}>{isNew?'👥':'✏️'}</span>
          <div className="modal-title">{isNew?'Create New User':'Edit User'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-grid form-grid-2" style={{ gap:14 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Full Name <span className="form-required">*</span></label>
                <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Full name" required />
              </div>
              {isNew && <>
                <div className="form-group">
                  <label className="form-label">Username <span className="form-required">*</span></label>
                  <input className="input" value={form.username} onChange={e=>set('username',e.target.value)} placeholder="login username" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="form-required">*</span></label>
                  <input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="min 6 characters" required minLength={6} />
                </div>
              </>}
              <div className="form-group">
                <label className="form-label">Role <span className="form-required">*</span></label>
                <select className="select" value={form.role} onChange={e=>set('role',e.target.value)}>
                  {Object.entries(ROLE_INFO).map(([r,i]) => <option key={r} value={r}>{i.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="input" value={form.department} onChange={e=>set('department',e.target.value)} placeholder="Department / Specialty" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@hospital.in" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="Mobile number" />
              </div>
              {!isNew && (
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="checkbox-group">
                    <input type="checkbox" className="checkbox" checked={form.is_active!==false&&form.is_active!==0} onChange={e=>set('is_active',e.target.checked)} />
                    <span className="checkbox-label">Account is active (uncheck to deactivate login)</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline btn-md" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
              {loading ? <><span className="spinner spinner-sm"/>Saving…</> : isNew ? '+ Create User' : '✓ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [logOffset, setLogOffset] = useState(0)
  const [logTotal, setLogTotal] = useState(0)
  
  // AI Settings State
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('AI_PROVIDER') || 'anthropic')
  const [aiKey, setAiKey] = useState(localStorage.getItem('AI_KEY') || '')
  
  const toast = useContext(ToastContext)
  const LOG_LIMIT = 50

  useEffect(() => {
    api.get('/users').then(r => { setUsers(r.data); setLoading(false) })
  }, [])

  useEffect(() => {
    if (tab==='audit') loadLogs(0)
  }, [tab])

  async function loadLogs(offset) {
    setLogsLoading(true)
    const { data } = await api.get(`/audit-log?limit=${LOG_LIMIT}&offset=${offset}`)
    setLogs(data.logs); setLogTotal(data.total); setLogOffset(offset); setLogsLoading(false)
  }

  function onUserSaved(u, isNew) {
    if (isNew) setUsers(us => [...us, u])
    else setUsers(us => us.map(x => x.id===u.id ? u : x))
  }

  const activeUsers = users.filter(u => u.is_active!==0)
  const byRole = Object.keys(ROLE_INFO).reduce((a, r) => ({ ...a, [r]: users.filter(u=>u.role===r).length }), {})

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {Object.entries(ROLE_INFO).map(([role, info]) => (
          <div key={role} style={{ background:'white', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', boxShadow:'var(--s-sm)' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:info.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:10 }}>
              {role==='admin'?'⚙️':role==='doctor'?'🩺':role==='nurse'?'💉':role==='reception'?'🏢':'💳'}
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{byRole[role]||0}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2, fontWeight:600 }}>{info.label}s</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          <button className={`tab ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>👥 Users <span className="tab-count">{users.length}</span></button>
          <button className={`tab ${tab==='audit'?'active':''}`} onClick={()=>setTab('audit')}>📋 Audit Log <span className="tab-count">{logTotal}</span></button>
          <button className={`tab ${tab==='system'?'active':''}`} onClick={()=>setTab('system')}>⚙️ System</button>
        </div>
        {tab==='users' && <button className="btn btn-primary btn-md" onClick={() => { setEditUser(null); setShowUserModal(true) }}>+ Add User</button>}
      </div>

      {tab==='users' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>👥</span>
            <div><div className="card-title">System Users</div><div className="card-subtitle">{activeUsers.length} active of {users.length}</div></div>
          </div>
          {loading ? <div style={{ padding:40, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div>
          : <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="table">
              <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Department</th><th>Contact</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map(u => {
                  const ri = ROLE_INFO[u.role] || { label:u.role, color:'#64748B', bg:'#F1F5F9' }
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:10, background:ri.bg, color:ri.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12 }}>
                            {u.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{u.name}</div>
                            {u.email && <div style={{ fontSize:11, color:'var(--text-3)' }}>{u.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className="mono-val">{u.username}</span></td>
                      <td><span className="badge" style={{ background:ri.bg, color:ri.color, border:`1px solid ${ri.color}30` }}>{ri.label}</span></td>
                      <td style={{ fontSize:12, color:'var(--text-2)' }}>{u.department||'—'}</td>
                      <td style={{ fontSize:12, color:'var(--text-3)' }}>{u.phone||'—'}</td>
                      <td style={{ fontSize:11, color:'var(--text-3)' }}>{u.last_login ? new Date(u.last_login).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Never'}</td>
                      <td><span className={`badge ${u.is_active?'badge-success':'badge-gray'}`}>{u.is_active?'Active':'Inactive'}</span></td>
                      <td><button className="btn btn-outline btn-xs" onClick={() => { setEditUser(u); setShowUserModal(true) }}>Edit</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {tab==='audit' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:16 }}>📋</span>
            <div><div className="card-title">Audit Trail</div><div className="card-subtitle">Immutable log — every action recorded with timestamp and user</div></div>
            <div style={{ marginLeft:'auto' }}><span className="badge badge-primary">{logTotal} total events</span></div>
          </div>
          {logsLoading ? <div style={{ padding:40, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div>
          : <>
            <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
              <table className="table">
                <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Role</th><th>Entity</th><th>Details</th></tr></thead>
                <tbody>
                  {logs.map(l => {
                    let det = {}; try { det = JSON.parse(l.details||'{}') } catch {}
                    const ri = ROLE_INFO[l.user_role] || { label:l.user_role, color:'#64748B', bg:'#F1F5F9' }
                    return (
                      <tr key={l.id}>
                        <td style={{ fontSize:11, color:'var(--text-3)', whiteSpace:'nowrap' }}>
                          {new Date(l.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:14 }}>{ACTION_ICONS[l.action]||'📌'}</span>
                            <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{l.action.replace(/_/g,' ')}</span>
                          </div>
                        </td>
                        <td><span style={{ fontSize:12, fontWeight:600 }}>{l.username}</span></td>
                        <td><span className="badge" style={{ background:ri.bg, color:ri.color, border:`1px solid ${ri.color}30`, fontSize:10 }}>{ri.label}</span></td>
                        <td style={{ fontSize:11, color:'var(--text-3)' }}>{l.entity_type}{l.entity_id ? ` #${l.entity_id.slice(-6)}` : ''}</td>
                        <td style={{ fontSize:11, color:'var(--text-3)' }}>
                          {det.name || det.uhid || det.enc_no || det.inv_no || det.total ? Object.entries(det).slice(0,2).map(([k,v]) => `${k}: ${v}`).join(' · ') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {logs.length===0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No audit logs yet</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card-footer">
              <span style={{ fontSize:12, color:'var(--text-3)' }}>Showing {logOffset+1}–{Math.min(logOffset+LOG_LIMIT,logTotal)} of {logTotal}</span>
              <div style={{ flex:1 }} />
              <button className="btn btn-outline btn-sm" disabled={logOffset===0} onClick={() => loadLogs(logOffset-LOG_LIMIT)}>← Prev</button>
              <button className="btn btn-outline btn-sm" disabled={logOffset+LOG_LIMIT>=logTotal} onClick={() => loadLogs(logOffset+LOG_LIMIT)}>Next →</button>
            </div>
          </>}
        </div>
      )}

      {tab==='system' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card" style={{ gridColumn:'1/-1' }}>
            <div className="card-header"><span style={{ fontSize:16 }}>🧠</span><div><div className="card-title">Global AI Engine Configuration</div><div className="card-subtitle">Connect MedOS to Anthropic or OpenAI to power clinical analysis apps</div></div></div>
            <div className="card-body" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-white)' }}>Select AI Provider</label>
                <select className="input" value={aiProvider} onChange={e => setAiProvider(e.target.value)} style={{ width: '100%', marginBottom: 16 }}>
                   <option value="anthropic">Anthropic (Claude 3 Haiku)</option>
                   <option value="openai">OpenAI (ChatGPT-4o-mini)</option>
                </select>
                
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-white)' }}>Enter Secret API Key</label>
                <input 
                  type="password" 
                  className="input" 
                  value={aiKey} 
                  onChange={e => setAiKey(e.target.value)} 
                  placeholder={aiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'} 
                  style={{ width: '100%', marginBottom: 16 }} 
               />
               <button className="btn btn-primary" onClick={() => {
                   localStorage.setItem('AI_PROVIDER', aiProvider);
                   localStorage.setItem('AI_KEY', aiKey);
                   toast('Globally connected to ' + (aiProvider==='openai'?'ChatGPT':'Claude'), 'success');
               }}>Save AI Configuration</button>
              </div>
              <div style={{ flex: 1, background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                 <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>How to generate your key:</div>
                 {aiProvider === 'openai' ? (
                   <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                     1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: 'var(--primary)' }}>platform.openai.com/api-keys</a><br/>
                     2. Create a new secret key.<br/>
                     3. Make sure your account has a billing method attached.<br/>
                     4. Paste it here. Your key is stored securely in your browser and never saved to our database.
                   </div>
                 ) : (
                   <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                     1. Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" style={{ color: 'var(--primary)' }}>console.anthropic.com/settings/keys</a><br/>
                     2. Click "Create Key".<br/>
                     3. Add credits to your Anthropic billing account.<br/>
                     4. Paste it here. Your key is stored securely in your browser and never saved to our database.
                   </div>
                 )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span style={{ fontSize:16 }}>🔒</span><div><div className="card-title">DPDP Compliance</div></div></div>
            <div className="card-body">
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[['Data Purpose Limitation','Purpose for each patient is captured and logged at registration.'],['Consent Tracking','DPDP consent is recorded with timestamp and purpose per patient.'],['Audit Logging','Every data access and modification is immutably logged.'],['Role-Based Access','Each user role can only access authorised data and functions.'],['Data Minimisation','Only necessary health data is collected per consultation.']].map(([title, desc]) => (
                  <div key={title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ color:'var(--success)', fontSize:16, flexShrink:0, marginTop:1 }}>✓</span>
                    <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{title}</div><div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span style={{ fontSize:16 }}>💳</span><div><div className="card-title">GST / CBIC Compliance</div></div></div>
            <div className="card-body">
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[['HSN/SAC Mandatory','Invoice blocked if HSN/SAC code is missing — CBIC Rule 46.'],['CGST + SGST Split','GST breakup shown as CGST + SGST in every invoice.'],['Tax Invoice Format','Invoice includes GSTIN, date, serial number, taxable value.'],['Healthcare HSN Codes','999312 (Consultation), 999315 (Lab/Radiology) pre-set.'],['Auto Charge Posting','Charges auto-posted with correct HSN when orders are placed.']].map(([title, desc]) => (
                  <div key={title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ color:'var(--success)', fontSize:16, flexShrink:0, marginTop:1 }}>✓</span>
                    <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{title}</div><div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ gridColumn:'1/-1' }}>
            <div className="card-header"><span style={{ fontSize:16 }}>⚙️</span><div><div className="card-title">Production Upgrade Checklist</div><div className="card-subtitle">Tasks for your CTO to go live</div></div></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { title:'Swap SQLite → PostgreSQL', desc:'Change DATABASE_URL in .env. Schema auto-migrates.', done:false, tag:'1 line change' },
                  { title:'Add HTTPS + Helmet.js', desc:'npm install helmet. Add app.use(helmet()) to server.js', done:false, tag:'Security' },
                  { title:'Deploy backend to AWS/Azure', desc:'Use PM2 or Docker. Environment variables for secrets.', done:false, tag:'Infra' },
                  { title:'Set ANTHROPIC_API_KEY', desc:'Add to .env for live AI SOAP note generation.', done:false, tag:'AI' },
                  { title:'Connect ABDM Sandbox', desc:'NHA sandbox credentials for real ABHA QR flow.', done:false, tag:'ABDM' },
                  { title:'WhatsApp Business API', desc:'Meta approval required. Add for appointment reminders.', done:false, tag:'Notifications' },
                ].map(item => (
                  <div key={item.title} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{item.title}</span>
                      <span className="badge badge-warning" style={{ fontSize:10 }}>{item.tag}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-3)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserModal && <UserModal user={editUser} onClose={() => { setShowUserModal(false); setEditUser(null) }} onSaved={onUserSaved} toast={toast} />}
    </div>
  )
}
