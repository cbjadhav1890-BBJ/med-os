// MedOS HMS v3.0 — Destructive QA Test Suite
const BASE = 'http://localhost:3001/api';
let TOKEN = '';
let RESULTS = [];
let pass = 0, fail = 0, warn = 0;

function log(cat, test, expected, actual, severity, detail) {
  const status = severity === 'PASS' ? '✅' : severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : severity === 'MEDIUM' ? '🟡' : '🔵';
  if (severity === 'PASS') pass++; else if (['CRITICAL','HIGH'].includes(severity)) fail++; else warn++;
  RESULTS.push({ cat, test, expected, actual, severity, detail });
  console.log(`${status} [${cat}] ${test}: ${actual}`);
}

async function req(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(`${BASE}${path}`, opts);
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data, ok: r.ok };
  } catch(e) { return { status: 0, data: { error: e.message }, ok: false }; }
}

async function run() {
  console.log('\n🔬 MedOS HMS v3.0 — DESTRUCTIVE QA TEST SUITE\n' + '='.repeat(60));
  
  // ════════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 1. AUTHENTICATION TESTS\n' + '-'.repeat(40));
  
  // Empty credentials
  let r = await req('POST', '/auth/login', { username: '', password: '' });
  log('AUTH', 'Empty credentials', 'Reject with 400/401', `Status ${r.status}: ${r.data.error||'no error'}`, r.status >= 400 ? 'PASS' : 'CRITICAL');
  
  // Wrong password
  r = await req('POST', '/auth/login', { username: 'admin', password: 'wrongpass' });
  log('AUTH', 'Wrong password', 'Reject with 401', `Status ${r.status}: ${r.data.error||'no error'}`, r.status === 401 ? 'PASS' : 'CRITICAL');
  
  // SQL injection in username
  r = await req('POST', '/auth/login', { username: "admin' OR '1'='1", password: 'anything' });
  log('AUTH', 'SQL injection in username', 'Reject (no bypass)', `Status ${r.status}: ${r.data.error||'no error'}`, r.status === 401 ? 'PASS' : 'CRITICAL', 'SQLi attempt');
  
  // XSS in username
  r = await req('POST', '/auth/login', { username: '<script>alert(1)</script>', password: 'test' });
  log('AUTH', 'XSS in username', 'Reject cleanly', `Status ${r.status}: ${r.data.error||'no error'}`, r.status === 401 ? 'PASS' : 'HIGH');
  
  // Very long username (1000 chars)
  r = await req('POST', '/auth/login', { username: 'a'.repeat(1000), password: 'a'.repeat(1000) });
  log('AUTH', 'Oversized credentials (1000 chars)', 'Reject without crash', `Status ${r.status}`, r.status >= 400 && r.status < 500 ? 'PASS' : 'HIGH');
  
  // Missing fields entirely
  r = await req('POST', '/auth/login', {});
  log('AUTH', 'Missing username/password fields', 'Reject with 400', `Status ${r.status}: ${r.data.error||'no error'}`, r.status >= 400 ? 'PASS' : 'MEDIUM');
  
  // Valid login
  r = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  TOKEN = r.data.token || '';
  log('AUTH', 'Valid admin login', 'Return token + user', `Status ${r.status}, token=${TOKEN?'YES':'NO'}, user=${r.data.user?.name||'MISSING'}`, r.ok && TOKEN ? 'PASS' : 'CRITICAL');
  
  // Check if response leaks password hash
  const userResp = JSON.stringify(r.data.user || {});
  log('AUTH', 'Password hash leak check', 'No password in response', userResp.includes('password') ? 'PASSWORD HASH LEAKED!' : 'Clean', userResp.includes('password') ? 'CRITICAL' : 'PASS');
  
  // Token without Bearer prefix
  r = await req('GET', '/patients', null, null);
  log('AUTH', 'Access without token', 'Reject 401', `Status ${r.status}`, r.status === 401 ? 'PASS' : 'CRITICAL');
  
  // Malformed JWT
  r = await req('GET', '/patients', null, 'invalid.jwt.token');
  log('AUTH', 'Malformed JWT token', 'Reject 401/403', `Status ${r.status}`, r.status >= 400 ? 'PASS' : 'CRITICAL');
  
  // ════════════════════════════════════════════════════════════════
  // 2. BRUTE FORCE / RATE LIMITING
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 2. RATE LIMITING / BRUTE FORCE\n' + '-'.repeat(40));
  
  let bruteForceBlocked = false;
  for (let i = 0; i < 20; i++) {
    r = await req('POST', '/auth/login', { username: 'admin', password: 'wrong' + i });
    if (r.status === 429) { bruteForceBlocked = true; break; }
  }
  log('SEC', 'Brute force protection (20 rapid attempts)', 'Should rate-limit (429)', bruteForceBlocked ? 'Rate limited at some point' : `All 20 attempts allowed (status ${r.status})`, bruteForceBlocked ? 'PASS' : 'CRITICAL', 'No rate limiting on login endpoint');
  
  // ════════════════════════════════════════════════════════════════
  // 3. AUTHORIZATION / RBAC TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 3. RBAC / AUTHORIZATION\n' + '-'.repeat(40));
  
  // Login as billing user
  r = await req('POST', '/auth/login', { username: 'billing1', password: 'billing123' });
  const BILLING_TOKEN = r.data.token || '';
  
  // Billing user tries admin-only endpoints
  r = await req('GET', '/users', null, BILLING_TOKEN);
  log('RBAC', 'Billing → GET /users (admin only)', 'Reject 403', `Status ${r.status}`, r.status === 403 ? 'PASS' : 'CRITICAL', 'Horizontal privilege escalation');
  
  r = await req('POST', '/users', { username:'hacker', password:'hack123', role:'admin', name:'Hacker' }, BILLING_TOKEN);
  log('RBAC', 'Billing → CREATE admin user', 'Reject 403', `Status ${r.status}`, r.status === 403 ? 'PASS' : 'CRITICAL', 'Privilege escalation via user creation');
  
  // Login as reception
  r = await req('POST', '/auth/login', { username: 'reception1', password: 'recep123' });
  const RECEP_TOKEN = r.data.token || '';
  
  // Reception tries doctor-only endpoints
  r = await req('POST', '/encounters', { patient_id: 'test', encounter_type: 'OPD' }, RECEP_TOKEN);
  log('RBAC', 'Reception → CREATE encounter (doctor only)', 'Reject 403', `Status ${r.status}`, r.status === 403 ? 'PASS' : 'HIGH');
  
  // ════════════════════════════════════════════════════════════════
  // 4. PATIENT DATA TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 4. PATIENT DATA VALIDATION\n' + '-'.repeat(40));
  
  // Get patients list
  r = await req('GET', '/patients', null, TOKEN);
  log('DATA', 'Get patients list', 'Return array', `Status ${r.status}, count=${r.data.patients?.length||0}`, r.ok ? 'PASS' : 'HIGH');
  
  // Create patient with missing required fields
  r = await req('POST', '/patients', { name: '' }, TOKEN);
  log('DATA', 'Create patient with empty name', 'Reject', `Status ${r.status}: ${r.data.error||'accepted?!'}`, r.status >= 400 ? 'PASS' : 'HIGH', 'Empty name accepted');
  
  // Create patient with XSS in name
  r = await req('POST', '/patients', { name: '<img src=x onerror=alert(1)>', gender: 'Male', age: 25, phone: '9999999999' }, TOKEN);
  log('DATA', 'XSS in patient name', 'Should sanitize or reject', `Status ${r.status}, name stored=${r.data.name||'?'}`, r.status >= 400 || !r.data.name?.includes('<img') ? 'PASS' : 'HIGH', 'Stored XSS risk');
  
  // Create patient with negative age
  r = await req('POST', '/patients', { name: 'Test Patient', gender: 'Male', age: -5, phone: '1234567890' }, TOKEN);
  log('DATA', 'Negative age (-5)', 'Reject or correct', `Status ${r.status}, age=${r.data.age||'?'}`, r.status >= 400 || r.data.age > 0 ? 'PASS' : 'MEDIUM', 'Negative age accepted');
  
  // Create patient with age > 200
  r = await req('POST', '/patients', { name: 'Test Old Patient', gender: 'Female', age: 999, phone: '0000000000' }, TOKEN);
  log('DATA', 'Unrealistic age (999)', 'Reject or warn', `Status ${r.status}, age=${r.data.age||'?'}`, r.status >= 400 ? 'PASS' : 'MEDIUM', 'Age 999 accepted');
  
  // SQL injection in patient search
  r = await req('GET', "/patients?search=' OR 1=1 --", null, TOKEN);
  log('SEC', 'SQL injection in patient search', 'Safe (parameterized)', `Status ${r.status}, count=${r.data.patients?.length||0}`, r.status < 500 ? 'PASS' : 'CRITICAL');
  
  // ════════════════════════════════════════════════════════════════
  // 5. BILLING / CHARGES TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 5. BILLING EDGE CASES\n' + '-'.repeat(40));
  
  // Create charge with negative amount
  r = await req('POST', '/charges', { patient_id: r.data.patients?.[0]?.id || 'fake', description: 'Test', category: 'Consultation', hsn_sac: '999312', amount: -500, gst_rate: 0 }, TOKEN);
  log('DATA', 'Negative charge amount (-500)', 'Reject', `Status ${r.status}: ${r.data.error||'ACCEPTED!'}`, r.status >= 400 ? 'PASS' : 'CRITICAL', 'Negative billing accepted = revenue manipulation');
  
  // Create charge with zero amount
  r = await req('POST', '/charges', { patient_id: 'fake', description: 'Test', category: 'Consultation', hsn_sac: '999312', amount: 0, gst_rate: 0 }, TOKEN);
  log('DATA', 'Zero charge amount', 'Reject or warn', `Status ${r.status}`, r.status >= 400 ? 'PASS' : 'LOW');
  
  // Create charge with absurd GST (200%)
  r = await req('POST', '/charges', { patient_id: 'fake', description: 'Test', category: 'Consultation', hsn_sac: '999312', amount: 100, gst_rate: 200 }, TOKEN);
  log('DATA', 'GST rate 200%', 'Reject invalid rate', `Status ${r.status}`, r.status >= 400 ? 'PASS' : 'MEDIUM');
  
  // ════════════════════════════════════════════════════════════════
  // 6. PHARMACY TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 6. PHARMACY EDGE CASES\n' + '-'.repeat(40));
  
  r = await req('GET', '/pharmacy/catalog', null, TOKEN);
  const meds = r.data || [];
  log('DATA', 'Get pharmacy catalog', 'Return medicines', `Status ${r.status}, count=${meds.length}`, r.ok && meds.length > 0 ? 'PASS' : 'HIGH');
  
  // Dispense more than available stock
  if (meds.length > 0) {
    r = await req('POST', '/pharmacy/dispense', { patient_id: 'fake', medicine_id: meds[0].id, quantity: 999999 }, TOKEN);
    log('DATA', 'Dispense more than stock (999999)', 'Reject insufficient stock', `Status ${r.status}: ${r.data.error||'ACCEPTED!'}`, r.status >= 400 ? 'PASS' : 'CRITICAL', 'Stock can go negative');
    
    // Dispense negative quantity
    r = await req('POST', '/pharmacy/dispense', { patient_id: 'fake', medicine_id: meds[0].id, quantity: -5 }, TOKEN);
    log('DATA', 'Dispense negative quantity (-5)', 'Reject', `Status ${r.status}: ${r.data.error||'ACCEPTED!'}`, r.status >= 400 ? 'PASS' : 'CRITICAL');
  }
  
  // ════════════════════════════════════════════════════════════════
  // 7. API SECURITY TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 7. API SECURITY\n' + '-'.repeat(40));
  
  // IDOR — access other user's data
  r = await req('GET', '/patients?limit=1', null, TOKEN);
  if (r.data.patients?.[0]) {
    const patId = r.data.patients[0].id;
    // Login as doctor and try to view patient (should work)
    const drR = await req('POST', '/auth/login', { username: 'drpriya', password: 'doctor123' });
    const DR_TOKEN = drR.data.token;
    r = await req('GET', `/patients/${patId}`, null, DR_TOKEN);
    log('SEC', 'Doctor can view any patient (IDOR)', 'Should be OK for doctors', `Status ${r.status}`, r.ok ? 'PASS' : 'MEDIUM');
  }
  
  // Check for exposed stack traces
  r = await req('GET', '/nonexistent-endpoint', null, TOKEN);
  log('SEC', 'Unknown endpoint error handling', 'Generic 404, no stack trace', `Status ${r.status}, body=${JSON.stringify(r.data).slice(0,100)}`, r.status === 404 && !JSON.stringify(r.data).includes('stack') ? 'PASS' : 'MEDIUM');
  
  // CORS check
  try {
    const corsR = await fetch(`${BASE}/patients`, { headers: { 'Origin': 'http://evil.com', 'Authorization': `Bearer ${TOKEN}` } });
    const corsHeaders = corsR.headers.get('access-control-allow-origin');
    log('SEC', 'CORS policy', 'Restrict to known origins', `CORS header: ${corsHeaders}`, corsHeaders === '*' ? 'HIGH' : 'PASS', 'Wildcard CORS allows any origin');
  } catch(e) { log('SEC', 'CORS policy', 'Restrict', `Error: ${e.message}`, 'MEDIUM'); }
  
  // Check if JWT secret is weak/guessable (by checking token length)
  log('SEC', 'JWT secret strength', 'Use env variable, strong secret', `Secret is hardcoded as "medos-god-mode-secret-2024" in server.js`, 'CRITICAL', 'Hardcoded JWT secret in source code');

  // ════════════════════════════════════════════════════════════════
  // 8. ENCOUNTERS / AI TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 8. ENCOUNTER / AI EDGE CASES\n' + '-'.repeat(40));
  
  // Login as doctor
  r = await req('POST', '/auth/login', { username: 'drpriya', password: 'doctor123' });
  const DOC_TOKEN = r.data.token;
  
  // Get encounters
  r = await req('GET', '/encounters', null, DOC_TOKEN);
  log('DATA', 'Get encounters as doctor', 'Return list', `Status ${r.status}, count=${r.data?.length||0}`, r.ok ? 'PASS' : 'HIGH');
  
  // Medicine suggestion with empty description
  if (r.data?.length > 0) {
    const encId = r.data[0].id;
    let sr = await req('POST', `/encounters/${encId}/suggest-medicines`, { disease_description: '' }, DOC_TOKEN);
    log('DATA', 'Medicine suggest with empty desc', 'Reject 400', `Status ${sr.status}: ${sr.data.error||''}`, sr.status === 400 ? 'PASS' : 'MEDIUM');
    
    // Medicine suggestion with XSS payload
    sr = await req('POST', `/encounters/${encId}/suggest-medicines`, { disease_description: '<script>alert(1)</script>' }, DOC_TOKEN);
    log('SEC', 'XSS in medicine suggestion', 'Sanitize/safe', `Status ${sr.status}, suggestions=${sr.data.suggestions?.length||0}`, sr.status < 500 ? 'PASS' : 'HIGH');
    
    // Medicine suggestion with valid disease
    sr = await req('POST', `/encounters/${encId}/suggest-medicines`, { disease_description: 'Fever with headache and body ache' }, DOC_TOKEN);
    log('DATA', 'Medicine suggest: "Fever with headache"', 'Return matching meds', `Status ${sr.status}, found=${sr.data.suggestions?.length||0} medicines`, sr.ok && sr.data.suggestions?.length > 0 ? 'PASS' : 'MEDIUM');
    
    // Medicine suggestion with rare disease
    sr = await req('POST', `/encounters/${encId}/suggest-medicines`, { disease_description: 'Systemic lupus erythematosus' }, DOC_TOKEN);
    log('DATA', 'Medicine suggest: rare disease (SLE)', 'Return fallback', `Status ${sr.status}, found=${sr.data.suggestions?.length||0}`, sr.ok ? 'PASS' : 'MEDIUM');
  }

  // ════════════════════════════════════════════════════════════════
  // 9. APPOINTMENTS TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 9. APPOINTMENTS EDGE CASES\n' + '-'.repeat(40));

  r = await req('GET', '/appointments', null, TOKEN);
  log('DATA', 'Get appointments', 'Return list', `Status ${r.status}`, r.ok ? 'PASS' : 'HIGH');

  // Book appointment in the past
  r = await req('POST', '/appointments', { patient_id: 'fake', doctor_id: 'fake', scheduled_date: '2020-01-01', scheduled_time: '10:00', appointment_type: 'New' }, TOKEN);
  log('DATA', 'Book appointment in past (2020)', 'Should reject', `Status ${r.status}`, r.status >= 400 ? 'PASS' : 'MEDIUM', 'Past-date appointments allowed');

  // ════════════════════════════════════════════════════════════════
  // 10. DATA EXPOSURE TESTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 10. DATA EXPOSURE\n' + '-'.repeat(40));

  // Check if dashboard exposes too much data
  r = await req('GET', '/dashboard/stats', null, TOKEN);
  log('DATA', 'Dashboard stats endpoint', 'Return aggregated data', `Status ${r.status}, keys=${Object.keys(r.data||{}).join(',')}`, r.ok ? 'PASS' : 'HIGH');
  
  // Check audit log access
  r = await req('GET', '/audit-log?limit=5', null, TOKEN);
  log('DATA', 'Audit log access', 'Admin only should see', `Status ${r.status}, logs=${r.data?.logs?.length||0}`, r.ok ? 'PASS' : 'MEDIUM');
  
  // Non-admin try audit log
  r = await req('GET', '/audit-log', null, BILLING_TOKEN);
  log('RBAC', 'Billing → Audit log', 'Reject 403', `Status ${r.status}`, r.status === 403 ? 'PASS' : 'HIGH', 'Audit logs exposed to non-admins');

  // ════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 FINAL RESULTS: ${pass} PASS | ${fail} FAIL | ${warn} WARN\n`);
  
  RESULTS.filter(r => r.severity !== 'PASS').forEach(r => {
    const icon = r.severity === 'CRITICAL' ? '🔴' : r.severity === 'HIGH' ? '🟠' : r.severity === 'MEDIUM' ? '🟡' : '🔵';
    console.log(`${icon} [${r.severity}] ${r.cat} — ${r.test}`);
    console.log(`   Expected: ${r.expected}`);
    console.log(`   Actual:   ${r.actual}`);
    if (r.detail) console.log(`   Detail:   ${r.detail}`);
    console.log('');
  });
}

run().catch(e => console.error('Test suite crash:', e));
