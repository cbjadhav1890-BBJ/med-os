import { useState, useEffect, useContext, useRef } from 'react'
import api from '../api/client'
import { ToastContext } from '../components/Layout'

export default function Reports() {
  const [tab, setTab] = useState('financial')
  const [financial, setFinancial] = useState(null)
  const [stock, setStock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(new Date(Date.now()-30*86400000).toISOString().slice(0,10))
  const [to, setTo] = useState(new Date().toISOString().slice(0,10))
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [attachedFile, setAttachedFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const toast = useContext(ToastContext)

  useEffect(() => { loadFinancial() }, [])
  useEffect(() => { if(tab==='stock'&&!stock) loadStock() }, [tab])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, analyzing])

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

  async function analyzeReport() {
    if (!attachedFile && !inputText) return;
    
    const newMessage = { 
      role: 'user', 
      text: inputText,
      file: attachedFile ? attachedFile.name : null 
    }
    
    setMessages(prev => [...prev, newMessage])
    setInputText('')
    const fileToUpload = attachedFile;
    setAttachedFile(null)
    setAnalyzing(true)

    try {
      if (fileToUpload) {
        const fd = new FormData()
        fd.append('file', fileToUpload)
        const { data } = await api.post('/reports/analyze-pdf', fd, { 
           headers: { 
             'Content-Type': 'multipart/form-data'
           } 
        })
        setMessages(prev => [...prev, { role: 'ai', html: data.html }])
      } else {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'ai', html: '<p>I am the MedOS Clinical Analysis engine. Please attach a PDF lab report utilizing the paperclip icon!</p>' }])
          setAnalyzing(false)
        }, 800)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', html: `<p style="color: var(--danger);">${err.response?.data?.error || err.message}</p>` }])
    } finally {
      if (fileToUpload) setAnalyzing(false)
    }
  }

  const f = financial?.summary || {}
  const maxDailyRev = financial?.daily_revenue?.length ? Math.max(...financial.daily_revenue.map(d=>d.amount)) : 1

  return (
    <div>
      <div className="bento-header" style={{ marginBottom: 20 }}>
        Intelligence <span>{tab === 'financial' ? 'Financials' : 'Inventory'}</span>
      </div>

      <div className="flex-between" style={{ marginBottom:24, background:'rgba(255,255,255,0.03)', padding: 12, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="tabs" style={{ marginBottom:0, background: 'transparent' }}>
          {[['financial','💰 Revenue'],['stock','📦 Stock Intelligence'],['ai_pdf','📄 AI Report Engine']].map(([k,l]) => (
            <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        {tab==='financial' && (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="date" className="input input-sm" style={{ width:140 }} value={from} onChange={e=>setFrom(e.target.value)} />
            <span style={{ color:'var(--text-3)', fontSize:12 }}>to</span>
            <input type="date" className="input input-sm" style={{ width:140 }} value={to} onChange={e=>setTo(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={loadFinancial}>Orbit Search</button>
          </div>
        )}
      </div>

      {tab==='financial' && (loading ? <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div> : financial && (
        <div className="bento-grid">
          {/* Main Visuals Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="bento-card portal-hero" style={{ minHeight: '300px' }}>
              <div style={{ position: 'absolute', top: 24, left: 24, fontSize: 18, fontWeight: 700, color: 'var(--text-white)' }}>
                Gross Value Tracker
              </div>
              
              <div className="portal-concentric" style={{ width: '300px', height: '300px' }}></div>
              <div className="portal-center" style={{ width: 120, height: 120 }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-3)' }}>Collected</div>
                <div style={{ fontSize:20, fontWeight:900, color:'var(--success)', marginTop: 4 }}>₹{((f.total_collected||0)/1000).toFixed(1)}k</div>
              </div>

              <div className="floating-tag" style={{ top: 40, right: 40 }}>
                <span>Total Invoice Count</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>{f.invoice_count||0}</div>
              </div>
              <div className="floating-tag" style={{ bottom: 40, left: 40, borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <span>Outstanding Dues</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger-light)' }}>₹{((f.outstanding_dues||0)/1000).toFixed(1)}k</div>
              </div>
            </div>

            <div className="bento-card">
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text-white)', marginBottom: 20 }}>Revenue Orbit</div>
              <div style={{ height:180, display:'flex', alignItems:'flex-end', gap:6, paddingTop:10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {financial.daily_revenue?.length>0 ? financial.daily_revenue.map((d,i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:'100%', background:'linear-gradient(to top, var(--primary), var(--cyan))', borderRadius:'10px 10px 0 0', height:`${Math.max(4,(d.amount/maxDailyRev)*140)}px`, transition:'height 0.5s var(--ease)', opacity:0.8, boxShadow: '0 0 10px var(--primary-glow)' }}/>
                    <div style={{ fontSize:9, color:'var(--text-3)', transform:'rotate(-45deg)' }}>{d.date.slice(5)}</div>
                  </div>
                )) : <div style={{ width:'100%', textAlign: 'center', color: 'var(--text-3)' }}>No stream data</div>}
              </div>
            </div>
          </div>

          {/* Right Compartment */}
          <div className="orbital-list">
             <div className="bento-card">
               <div style={{ fontSize:14, fontWeight:700, color:'var(--text-2)', marginBottom: 16, textTransform:'uppercase', letterSpacing:1 }}>Mode Breakdown</div>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {financial.payment_modes?.map((pm,i) => {
                    const colors = ['var(--primary)','var(--success)','var(--warning)','var(--purple)','var(--cyan)']
                    const total = financial.payment_modes.reduce((s,p)=>s+(p.total||0),0)
                    const pct = total>0 ? ((pm.total||0)/total*100) : 0
                    return (
                      <div key={i} className="orbital-item" style={{ padding: '12px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8 }}>
                          <span style={{ color:'var(--text-white)', fontWeight:600 }}>{pm.payment_mode}</span>
                          <span style={{ color:'var(--primary-light)', fontWeight:700 }}>₹{(pm.total||0).toFixed(0)}</span>
                        </div>
                        <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:10, overflow:'hidden', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5)' }}>
                          <div style={{ height:'100%', background:colors[i%colors.length], borderRadius:10, width:`${pct}%`, boxShadow: `0 0 10px ${colors[i%colors.length]}` }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
             </div>

             <div className="bento-card">
               <div style={{ fontSize:14, fontWeight:700, color:'var(--text-2)', marginBottom: 16, textTransform:'uppercase', letterSpacing:1 }}>Top Entities</div>
               <div className="orbital-list">
                 {financial.top_services?.map((s,i) => (
                   <div key={i} className="orbital-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <div style={{ fontSize:13, color:'var(--text-white)', fontWeight: 600 }}>{s.category}</div>
                     <div style={{ fontSize:13, fontWeight:800, color:'var(--cyan)' }}>₹{Number(s.total).toFixed(0)}</div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      ))}

      {tab==='stock' && (stock ? (
        <div className="bento-grid">
          <div className="bento-card portal-hero" style={{ minHeight: '300px' }}>
              <div style={{ position: 'absolute', top: 24, left: 24, fontSize: 18, fontWeight: 700, color: 'var(--text-white)' }}>
                System Inventory View
              </div>
              
              <div className="portal-concentric" style={{ width: '350px', height: '350px', borderColor: 'rgba(16, 185, 129, 0.2)' }}></div>
              <div className="portal-center" style={{ width: 130, height: 130, borderColor: 'var(--success-border)', border: '1px solid var(--success)' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--text-3)' }}>Total Assets</div>
                <div style={{ fontSize:24, fontWeight:900, color:'var(--success)', marginTop: 4 }}>{stock.total_medicines}</div>
              </div>

              <div className="floating-tag" style={{ top: 40, right: 40 }}>
                <span>Vault Value</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-light)' }}>₹{((stock.inventory_value||0)/1000).toFixed(1)}k</div>
              </div>
          </div>

          <div className="orbital-list">
            <div className="bento-card">
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-2)', marginBottom: 16, textTransform:'uppercase', letterSpacing:1 }}>Supply Drops</div>
              <div className="orbital-list" style={{ maxHeight: 200, overflowY: 'auto' }}>
                 {stock.low_stock?.map(m=>(
                  <div key={m.id} className="orbital-item" style={{ borderLeft: '3px solid var(--danger)' }}>
                     <div style={{ fontSize:13, color:'var(--text-white)', fontWeight: 700 }}>{m.name}</div>
                     <div style={{ fontSize:11, color:'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Current: {m.current_stock}</span>
                        <span>Threshold: {m.reorder_level}</span>
                     </div>
                  </div>
                 ))}
              </div>
            </div>

            <div className="bento-card">
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-2)', marginBottom: 16, textTransform:'uppercase', letterSpacing:1 }}>Time Warp (Expiring)</div>
              <div className="orbital-list" style={{ maxHeight: 200, overflowY: 'auto' }}>
                 {stock.expiring_soon?.map(b=>(
                  <div key={b.id} className="orbital-item" style={{ borderLeft: '3px solid var(--warning)' }}>
                     <div style={{ fontSize:13, color:'var(--text-white)', fontWeight: 700 }}>{b.medicine_name}</div>
                     <div style={{ fontSize:11, color:'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Batch: {b.batch_no}</span>
                        <span style={{ color: 'var(--warning-light)' }}>{b.expiry_date}</span>
                     </div>
                  </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      ) : <div style={{ padding:60, textAlign:'center' }}><div className="spinner spinner-lg" style={{ margin:'0 auto' }}/></div>)}
      {tab==='ai_pdf' && (
        <div className="bento-card" style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '600px', padding: 0, overflow: 'hidden' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {messages.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <span style={{ fontSize: 32 }}>🧠</span>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-white)' }}>How can I help you today?</h2>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexDirection: m.role==='user'?'row-reverse':'row' }}>
                    <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '4px', background: m.role==='user'?'var(--surface-3)':'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {m.role==='user' ? '👤' : '✨'}
                    </div>
                    <div style={{ maxWidth: '85%', lineHeight: 1.6, fontSize: '15px', color: 'var(--text-white)' }}>
                      {m.text && <div style={{ background: m.role==='user'?'var(--surface-2)':'transparent', padding: m.role==='user'?'12px 16px':0, borderRadius: '12px' }}>{m.text}</div>}
                      {m.file && (
                        <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: m.text?8:0 }}>
                          <span>📎</span> <span>{m.file}</span>
                        </div>
                      )}
                      {m.html && (
                        <div className="gpt-html-content" dangerouslySetInnerHTML={{ __html: m.html }} />
                      )}
                    </div>
                  </div>
                ))}
                {analyzing && (
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                     <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '4px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✨</div>
                     <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--primary)' }}></span>
                       <span style={{ color: 'var(--text-3)', fontSize: 14 }}>Analyzing clinical data...</span>
                     </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', background: 'var(--surface-1)' }}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
              {attachedFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', background: 'var(--surface-3)', borderRadius: '8px', marginBottom: 12, width: 'fit-content' }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-white)' }}>{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>✕</button>
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="file" ref={fileInputRef} accept="application/pdf" style={{ display: 'none' }} onChange={e => setAttachedFile(e.target.files[0])} />
                <button onClick={() => fileInputRef.current.click()} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 20 }}>
                  📎
                </button>
                
                <input 
                  type="text" 
                  placeholder="Upload a PDF report, or type a message..." 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && analyzeReport()}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-white)', fontSize: '15px', outline: 'none' }}
                />
                
                <button onClick={analyzeReport} disabled={analyzing || (!inputText && !attachedFile)} style={{ background: (inputText||attachedFile) ? 'var(--text-white)' : 'var(--surface-3)', color: 'var(--surface-1)', border: 'none', width: 32, height: 32, borderRadius: '8px', cursor: (inputText||attachedFile) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ↑
                </button>
              </div>
            </div>
          </div>
          
          <style>{`
            .gpt-html-content h3 { margin-top: 16px; margin-bottom: 8px; font-size: 16px; color: var(--text-white); }
            .gpt-html-content ul { padding-left: 20px; margin-bottom: 12px; }
            .gpt-html-content li { margin-bottom: 6px; }
            .gpt-html-content p { margin-bottom: 12px; }
          `}</style>
        </div>
      )}
    </div>
  )
}
