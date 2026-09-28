const API=(window.BSL_CONFIG&&window.BSL_CONFIG.API_URL)||'';
const DB='bsl-hrcf-db', STORE='pending';
let user=JSON.parse(localStorage.getItem('bslUser')||'null');
let selectedShift='A Shift';
let equipmentCache=[], areasCache=[];
function $(id){return document.getElementById(id)}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(window._t);window._t=setTimeout(()=>$('toast').classList.add('hidden'),2600)}
function today(){const d=new Date();return d.toISOString().slice(0,10)}
function currentShift(){const h=new Date().getHours();return h<14&&h>=6?'A Shift':h<22?'B Shift':'C Shift'}
function setNet(){const on=navigator.onLine;$('net').textContent=on?'🟢 Online':'🔴 You are offline — entries will be saved on this device';$('net').className='statusbar '+(on?'online':'offline')}
window.addEventListener('online',()=>{setNet();syncPending()});window.addEventListener('offline',setNet);
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'localId',autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function queue(item){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).add(item);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function pending(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function removePending(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function api(action,data={},method='POST'){
  if(!API||API.includes('PASTE_YOUR')) throw new Error('Set API_URL in config.js first.');
  const payload={action,...data};
  if(method==='GET'){
    const u=new URL(API);u.searchParams.set('api','1');u.searchParams.set('action',action);Object.entries(data).forEach(([k,v])=>u.searchParams.set(k,typeof v==='string'?v:JSON.stringify(v)));
    const r=await fetch(u.toString(),{redirect:'follow'});return await r.json();
  }
  const r=await fetch(API,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});return await r.json();
}
function showApp(){ $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('userMini').textContent=`${user?.name||''} • Staff ${user?.staffNo||''}`;setNet();home() }
async function login(){const staffNo=$('staffNo').value.trim(),password=$('password').value;if(!/^\d{6}$/.test(staffNo)){ $('loginMsg').textContent='Enter exactly 6 digit Staff No.';return }$('loginBtn').disabled=true;$('loginMsg').textContent='Checking...';try{const r=await api('login',{staffNo,password});if(r.success){user=r;localStorage.setItem('bslUser',JSON.stringify(r));$('loginMsg').textContent='';showApp()}else $('loginMsg').textContent=r.message||'Login failed.'}catch(e){$('loginMsg').textContent=navigator.onLine?'Connection error.':'Offline login is available only after a previous successful login.'}finally{$('loginBtn').disabled=false}}
$('loginBtn').onclick=login;
function openDrawer(){$('drawer').classList.remove('hidden')}function closeDrawer(e){if(!e||e.target.id==='drawer')$('drawer').classList.add('hidden')}
function setHeader(title, subtitle, right='home'){
  const t=$('topTitle'), r=$('topRight');
  if(title){ t.innerHTML=`<b>${esc(title)}</b><small>${esc(subtitle||'')}</small>`; }
  else { t.innerHTML='BSL<small>Maintenance Log System</small>'; }
  r.textContent=right==='home'?'⌂':'🔔'; r.onclick=right==='home'?home:showSync;
}
function home(){
  closeDrawer(); setHeader('BSL','Maintenance Log System','bell'); selectedShift=currentShift();
  $('main').innerHTML=`
  <div class="install-hint">📱 <b>Install PWA:</b> Chrome → Add to Home screen</div>
  <div class="shift-grid hero-shifts">
    <div class="shift-card a" onclick="shiftPage('A Shift')"><strong>A</strong><b>SHIFT</b><small>06:00 – 14:00</small></div>
    <div class="shift-card b" onclick="shiftPage('B Shift')"><strong>B</strong><b>SHIFT</b><small>14:00 – 22:00</small></div>
    <div class="shift-card c" onclick="shiftPage('C Shift')"><strong>C</strong><b>SHIFT</b><small>22:00 – 06:00</small></div>
  </div>
  <div class="quick-grid dashboard-grid">
    <div class="quick" onclick="reports()"><div class="quick-icon">▤</div><b>Today's Reports</b></div>
    <div class="quick" onclick="reports()"><div class="quick-icon">⌕</div><b>Search</b></div>
    <div class="quick" onclick="dashboard()"><div class="quick-icon">▥</div><b>Dashboard</b></div>
    <div class="quick" onclick="equipmentPage()"><div class="quick-icon">⚙</div><b>Equipment</b></div>
    <div class="quick" onclick="reports()"><div class="quick-icon">▣</div><b>Reports</b></div>
    <div class="quick" onclick="logout()"><div class="quick-icon logout-icon">↪</div><b>Logout</b></div>
  </div>`;
}
function shiftPage(shift){
  closeDrawer(); selectedShift=shift; setHeader(shift,shift==='A Shift'?'06:00 – 14:00':shift==='B Shift'?'14:00 – 22:00':'22:00 – 06:00','home');
  $('main').innerHTML=`<div class="backline"><button class="backbtn" onclick="home()">←</button><div><b>${esc(shift)}</b><span>${shift==='A Shift'?'06:00 – 14:00':shift==='B Shift'?'14:00 – 22:00':'22:00 – 06:00'}</span></div><button class="homebtn" onclick="home()">⌂</button></div>
  <div class="entry-tabs"><button class="active" onclick="newEntry('${esc(shift)}')">New Entry</button><button onclick="reportsFor('${esc(shift)}')">View Reports</button></div>
  <div class="card shift-info"><div><b>${esc(shift)}</b><span>Maintenance entries for selected shift</span></div><button class="btn primary" onclick="newEntry('${esc(shift)}')">+ New Entry</button></div>`;
}
function reportsFor(shift){selectedShift=shift;reports()}
async function dashboard(){
  closeDrawer(); setHeader('Dashboard','Today','home'); $('main').innerHTML='<div class="card">Loading dashboard...</div>';
  try{const r=await api('dashboard',{},'GET');$('main').innerHTML=`<div class="section-title">Dashboard</div><div class="stats-grid"><div class="stat-card"><span>Total</span><b>${r.total||0}</b></div><div class="stat-card"><span>Completed</span><b>${r.completed||0}</b></div><div class="stat-card"><span>Pending</span><b>${r.pending||0}</b></div></div><div class="card"><b>Current Shift</b><p>${esc(r.currentShift||currentShift())}</p><b>Shift In-charge</b><p>${esc(r.shiftIncharge||'Not entered')}</p><b>Crew</b><p>${Number(r.totalCrew||0)} (BSL ${Number(r.bslEmployees||0)}, Contract ${Number(r.contractWorkers||0)})</p></div>`}catch(e){$('main').innerHTML='<div class="card">Unable to load dashboard. You can still create offline entries.</div>'}}
function newEntry(shift){
  closeDrawer(); selectedShift=shift||currentShift(); setHeader(selectedShift,'New Entry','home'); const now=new Date(); const hh=String(now.getHours()).padStart(2,'0'),mm=String(now.getMinutes()).padStart(2,'0');
  $('main').innerHTML=`<div class="backline"><button class="backbtn" onclick="shiftPage('${esc(selectedShift)}')">←</button><div><b>${esc(selectedShift)} - New Entry</b><span>Maintenance details</span></div><button class="homebtn" onclick="home()">⌂</button></div>
  <div class="entry-tabs"><button class="active">New Entry</button><button onclick="reportsFor('${esc(selectedShift)}')">View Reports</button></div>
  <div id="offlineBox" class="offline-box ${navigator.onLine?'hidden':''}">🔴 <b>You are offline</b><br>Data will be saved and submitted when online.</div>
  <div class="form-card">
  <div class="field"><label>Date</label><input id="date" type="date" class="input" value="${today()}"></div>
  <div class="field"><label>Shift In-charge</label><select id="incharge" class="select"><option value="">Select In-charge</option></select></div>
  <div class="field"><label>Employee</label><input id="employee" class="input" value="${esc(user?.name||'')}" placeholder="Select / Enter"></div>
  <div class="field"><label>Equipment</label><select id="equipment" class="select"><option value="">Select Equipment</option></select></div>
  <div class="field"><label>Sub System</label><select id="area" class="select"><option value="">Select Sub System</option></select></div>
  <div class="field"><label>Problem / Complaint</label><select id="problemSelect" class="select"><option value="">Select Complaint</option><option>Hydraulic Leakage</option><option>Bearing Noise</option><option>Motor Issue</option><option>Belt Misalignment</option><option>Other</option></select></div>
  <div class="field hidden" id="manualProblemWrap"><label>Others (Manual Entry)</label><input id="problem" class="input" placeholder="Enter manually if not in list"></div>
  <div class="field"><label>Breakdown Type</label><select id="breakdown" class="select"><option>Mechanical</option><option>Electrical</option><option>Instrumentation</option><option>Other</option></select></div>
  <div class="field"><label>Action Taken</label><select id="solution" class="select"><option value="">Select Action</option><option>Repair completed</option><option>Replaced component</option><option>Adjusted / aligned</option><option>Temporary restoration</option><option>Other</option></select></div>
  <div class="field"><label>Spare / Material Used</label><input id="spare" class="input" placeholder="Enter details"></div>
  <div class="time-grid"><div class="field"><label>Start Time</label><input id="start" type="time" class="input" value="${hh}:${mm}"></div><div class="field"><label>End Time</label><input id="end" type="time" class="input"></div></div>
  <div class="field"><label>Downtime (min)</label><input id="downtime" class="input" readonly placeholder="Auto calculated"></div>
  <div class="field"><label>Status</label><select id="status" class="select status-select"><option>Completed</option><option>In Progress</option><option>Pending</option><option>Overlook</option></select></div>
  <div class="field"><label>Remarks</label><textarea id="remarks" class="textarea" placeholder="Enter remarks..."></textarea></div>
  <div class="field"><label class="photo-btn"><span>📷</span> Add Photo<input id="photo" type="file" accept="image/*" capture="environment" hidden></label><img id="photoPreview" class="photo-preview hidden"></div>
  <button class="btn primary full submit big-submit" onclick="submitEntry()">Submit</button><div id="entryMsg" class="form-msg"></div></div>`;
  $('shift')?.remove(); loadMasters(); $('start').onchange=calcDowntime; $('end').onchange=calcDowntime; $('photo').onchange=previewPhoto; $('problemSelect').onchange=()=>{const v=$('problemSelect').value;$('manualProblemWrap').classList.toggle('hidden',v!=='Other');};
}
async function loadMasters(){try{if(!areasCache.length)areasCache=await api('areas',{},'GET');if(!equipmentCache.length)equipmentCache=await api('equipment',{},'GET');const a=$('area'),e=$('equipment');if(!a||!e)return;areasCache.forEach(x=>a.insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));equipmentCache.forEach(x=>e.insertAdjacentHTML('beforeend',`<option value="${attr(x.equipment)}">${esc(x.equipment)}${x.area?' — '+esc(x.area):''}</option>`))}catch(e){}}
function calcDowntime(){const s=$('start')?.value,e=$('end')?.value;if(!s||!e)return $('downtime').value='';let [sh,sm]=s.split(':').map(Number),[eh,em]=e.split(':').map(Number);let a=sh*60+sm,b=eh*60+em;if(b<a)b+=1440;$('downtime').value=String(b-a)}
function previewPhoto(){const f=$('photo').files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('photoPreview').src=r.result;$('photoPreview').classList.remove('hidden')};r.readAsDataURL(f)}
async function submitEntry(){const log={date:$('date').value,shift:selectedShift,startTime:$('start').value,endTime:$('end').value,area:$('area').value,equipment:$('equipment').value,problem:(($('problemSelect')?.value==='Other')?$('problem').value.trim():($('problemSelect')?.value||$('problem')?.value||'').trim()),breakdownType:$('breakdown').value,solution:$('solution').value.trim(),spareMaterial:$('spare').value.trim(),downtime:$('downtime').value,shiftIncharge:$('incharge').value.trim(),employee:$('employee').value.trim(),status:$('status').value,remarks:$('remarks').value.trim(),staffNo:user?.staffNo||''};if(!log.date||!log.startTime||!log.area||!log.equipment||!log.problem||!log.status){$('entryMsg').textContent='Please fill all required fields.';return}const photo=$('photo').files?.[0];if(photo){log.photoName=photo.name;log.photoData=await fileToData(photo)};$('entryMsg').textContent='Saving...';try{if(!navigator.onLine){await queue(log);$('entryMsg').textContent='Saved offline. It will sync automatically when online.';toast('Offline entry saved');return}const r=await api('saveLog',{log});if(r.success){$('entryMsg').textContent='Saved successfully to Google Sheet.';toast('Maintenance report saved');setTimeout(()=>newEntry(selectedShift),500)}else throw new Error(r.message||'Save failed')}catch(e){await queue(log);$('entryMsg').textContent='Network unavailable. Saved on device and queued for sync.';toast('Saved offline')}}
function fileToData(file){return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(file)})}
async function syncPending(){if(!navigator.onLine)return;const items=await pending();if(!items.length)return;let ok=0;for(const x of items){try{const r=await api('saveLog',{log:x});if(r.success){await removePending(x.localId);ok++}}catch(e){break}}if(ok)toast(`Synced ${ok} pending ${ok===1?'entry':'entries'}`)}
async function showSync(){closeDrawer();const items=await pending();$('main').innerHTML=`<div class="section-title">Offline & Sync</div><div class="card"><div class="sync-row"><div><b>Pending Sync</b><div class="muted">Entries waiting for Google Sheet</div></div><div class="count">${items.length}</div></div><button class="btn primary full" style="margin-top:12px" onclick="syncPending().then(showSync)">🔄 Sync Now</button></div>${items.length?items.map((x,i)=>`<div class="card"><b>${esc(x.problem)}</b><div class="muted">${esc(x.date)} • ${esc(x.shift)} • ${esc(x.equipment)}</div><span class="pill Pending">Pending Sync</span></div>`).join(''):'<div class="empty">No pending offline entries.</div>'}`}
async function reports(){
  closeDrawer(); setHeader(selectedShift+' Reports','Selected shift','home'); $('main').innerHTML=`<div class="backline"><button class="backbtn" onclick="shiftPage('${esc(selectedShift)}')">←</button><div><b>${esc(selectedShift)} Reports</b><span>All entries of selected shift</span></div><button class="homebtn" onclick="home()">⌂</button></div><div class="report-filter"><div class="field"><label>Date</label><input id="rdate" type="date" class="input" value="${today()}"></div><div class="field"><label>Shift</label><select id="rshift" class="select"><option>A Shift</option><option>B Shift</option><option>C Shift</option></select></div><button class="btn primary full" onclick="loadReport()">View Report</button></div><div id="reportBox"></div>`; $('rshift').value=selectedShift; loadReport();
}
async function loadReport(){const box=$('reportBox');box.innerHTML='<div class="card">Loading...</div>';try{const r=await api('report',{date:$('rdate').value,shift:$('rshift').value},'GET');const logs=r.logs||[];box.innerHTML=`<div class="report-card"><div class="report-title"><b>${esc($('rshift').value)} Reports</b><span>${logs.length} entries</span></div><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Date</th><th>Equipment</th><th>Problem</th><th>Status</th></tr></thead><tbody>${logs.length?logs.map(x=>`<tr><td>${esc(x.date||$('rdate').value)}</td><td>${esc(x.equipment||'')}</td><td>${esc(x.problem||'')}</td><td><span class="status-pill ${String(x.status||'Pending').replace(/\s/g,'')}">${esc(x.status||'')}</span></td></tr>`).join(''):`<tr><td colspan="4" class="empty">No maintenance logs found.</td></tr>`}</tbody></table></div></div>`}catch(e){box.innerHTML='<div class="card">Report unavailable while offline.</div>'}}
async function equipmentPage(){closeDrawer();try{if(!equipmentCache.length)equipmentCache=await api('equipment',{},'GET');$('main').innerHTML='<div class="section-title">Equipment Master</div>'+equipmentCache.map(x=>`<div class="card"><b>${esc(x.equipment)}</b><div class="muted">${esc(x.area||'')}</div></div>`).join('')}catch(e){$('main').innerHTML='<div class="card">Equipment master unavailable offline.</div>'}}
function logout(){localStorage.removeItem('bslUser');user=null;$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('password').value=''}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}function attr(v){return esc(v)}
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(console.error)}
if(user)showApp();else setNet();
