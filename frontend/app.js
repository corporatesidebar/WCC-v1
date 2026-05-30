const API_BASE = window.WCC_API_BASE || 'https://wcc-backend.onrender.com';
const STATUSES = ['New','In Progress','Waiting','Blocked','Done','Approved'];
const fallbackTasks = [
  'Review and finalize Executive Engine OS navigation structure, hierarchy, user flow behavior, and operational workspace organization',
  'Audit WCC governance architecture for consistency, accountability, compliance, and scalability requirements',
  'Refine dashboard typography, spacing, visual hierarchy, cognition flow, and executive user experience',
  'Document approved product decisions, locked design elements, implementation constraints, and future considerations',
  'Analyze frontend implementation gaps, inconsistencies, missing functionality, and execution quality issues',
  'Develop executive workflow mapping for meetings, decisions, proposals, tasks, approvals, and execution',
  'Review and prioritize outstanding product enhancements, feature requests, and development objectives',
  'Create operational governance framework covering policies, procedures, accountability, and risk management',
  'Evaluate business strategy, growth opportunities, market positioning, and competitive advantages',
  'Prepare implementation roadmap including milestones, dependencies, resources, and execution priorities'
];
let state = { tasks: [], selectedId: null, online: false };

const $ = (id) => document.getElementById(id);

function seedSelects(){
  ['taskStatus','statusSelect'].forEach(id => {
    $(id).innerHTML = STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

async function api(path, options={}){
  const res = await fetch(`${API_BASE}${path}`, { headers:{'Content-Type':'application/json'}, ...options });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

function localLoad(){ return JSON.parse(localStorage.getItem('wcc_tasks') || '[]'); }
function localSave(){ localStorage.setItem('wcc_tasks', JSON.stringify(state.tasks)); }
function uid(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()); }
function selected(){ return state.tasks.find(t => t.id === state.selectedId); }

async function loadTasks(){
  try{
    const data = await api('/tasks');
    state.tasks = data.tasks || [];
    state.online = true;
    localSave();
  }catch(e){
    state.tasks = localLoad();
    state.online = false;
  }
  if(state.tasks.length && !state.selectedId) state.selectedId = state.tasks[0].id;
  render();
  checkHealth();
}

async function saveTask(task){
  if(state.online){
    const saved = await api(`/tasks${task.id ? '/' + task.id : ''}`, { method: task.id ? 'PUT':'POST', body: JSON.stringify(task) });
    return saved.task;
  }
  const now = new Date().toISOString();
  if(!task.id){ task.id = uid(); task.created_at = now; task.activity = [{text:'task created', created_at:now}]; }
  else { task.updated_at = now; task.activity = [...(task.activity||[]), {text:'task updated', created_at:now}]; }
  const i = state.tasks.findIndex(t=>t.id===task.id);
  if(i >= 0) state.tasks[i] = task; else state.tasks.unshift(task);
  localSave();
  return task;
}

async function updateSelected(patch, activityText){
  const task = selected(); if(!task) return;
  const updated = { ...task, ...patch };
  if(activityText) updated.activity = [...(task.activity||[]), { text: activityText, created_at: new Date().toISOString() }];
  const saved = await saveTask(updated);
  const i = state.tasks.findIndex(t=>t.id===saved.id);
  if(i >= 0) state.tasks[i] = saved;
  state.selectedId = saved.id;
  localSave();
  render('Saved');
}

function render(saveText=''){
  renderRecents(); renderCenter(); renderEditor(); renderRight();
  $('saveState').textContent = saveText;
  setTimeout(()=>{ if($('saveState')) $('saveState').textContent=''; }, 1500);
}
function renderRecents(){
  $('recentsList').innerHTML = state.tasks.map(t => `<button class="recent-item ${t.id===state.selectedId?'active':''}" data-id="${t.id}"><span>${escapeHtml(t.title||'Untitled Task')}</span><span class="pin">⌁</span></button>`).join('') || '<p class="empty">No saved tasks yet.</p>';
}
function renderCenter(){
  if(!state.tasks.length){
    $('taskListHeading').textContent = '10 Tasks that that are a few days old ...';
    $('centerTaskList').innerHTML = fallbackTasks.map(t=>`<li>${escapeHtml(t)}</li>`).join('');
    $('editorPanel').classList.add('hidden');
    return;
  }
  const task = selected();
  $('taskListHeading').textContent = task?.title || 'Current Task';
  $('centerTaskList').innerHTML = task ? `<li><strong>Sender:</strong> ${escapeHtml(task.sender||'')}</li><li><strong>Destination:</strong> ${escapeHtml(task.destination||'')}</li><li><strong>Message:</strong> ${escapeHtml(task.message||'')}</li><li><strong>Notes:</strong> ${escapeHtml(task.notes||'')}</li>` : '';
  $('editorPanel').classList.remove('hidden');
}
function renderEditor(){
  const t = selected(); if(!t) return;
  $('taskTitle').value = t.title || '';
  $('taskSender').value = t.sender || '';
  $('taskDestination').value = t.destination || '';
  $('taskMessage').value = t.message || '';
  $('taskNotes').value = t.notes || '';
  $('taskStatus').value = t.status || 'New';
}
function renderRight(){
  const t = selected() || {};
  const activity = t.activity || [];
  $('activityList').innerHTML = activity.slice(-8).reverse().map(a=>`<li>- ${escapeHtml(a.text)}</li>`).join('') || '<li>- Testing all GOOD</li><li>- WW uploaded & deployed</li><li>- Homie reviewed and approved</li>';
  const files = t.files || [];
  const filesHtml = files.map(f=>`<li>- ${escapeHtml(f.filename)}${f.note ? ' ('+escapeHtml(f.note)+')':''}</li>`).join('') || '<li>- this-is-the-zip-05.zip</li><li>- this-is-the-zip-04.zip</li><li>- this-is-the-zip-03.zip</li><li>- this-is-the-zip-02.zip</li><li>- this-is-the-zip-01.zip</li>';
  $('latestFilesList').innerHTML = filesHtml; $('attachedFilesList').innerHTML = filesHtml;
  const status = t.status || 'New'; $('statusSelect').value = status; $('statusText').textContent = `- ${status}`;
  const people = t.participants || [];
  $('participantsList').innerHTML = people.map(p=>`<li>- ${escapeHtml(p.name)} - ${escapeHtml(p.role)}</li>`).join('') || '<li>- WW - Governance</li><li>- Homie #2 - COO</li><li>- DDC -Digital Design / Creative</li>';
}
async function checkHealth(){
  try{ await api('/health'); $('testList').innerHTML = '<li>health - GOOD</li><li>response - GOOD</li><li>test - GOOD</li>'; }
  catch{ $('testList').innerHTML = '<li>health - local fallback</li><li>response - saved locally</li><li>test - GOOD</li>'; }
}
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

$('newTaskBtn').onclick = () => { $('quickTitle').focus(); };
$('quickTaskForm').onsubmit = async e => {
  e.preventDefault();
  const title = $('quickTitle').value.trim(); if(!title) return;
  const task = { title, sender:'WW - Governance', destination:'Homie #2 - COO', message:title, notes:'', status:'New', files:[], participants:[], activity:[{text:'task created', created_at:new Date().toISOString()}] };
  const saved = await saveTask(task);
  state.tasks = [saved, ...state.tasks.filter(t=>t.id!==saved.id)]; state.selectedId = saved.id; $('quickTitle').value=''; localSave(); render('Task created');
};
$('taskForm').onsubmit = async e => {
  e.preventDefault();
  await updateSelected({ title:$('taskTitle').value, sender:$('taskSender').value, destination:$('taskDestination').value, message:$('taskMessage').value, notes:$('taskNotes').value, status:$('taskStatus').value }, 'task updated');
};
$('recentsList').onclick = e => { const b=e.target.closest('[data-id]'); if(b){ state.selectedId=b.dataset.id; render(); } };
$('statusSelect').onchange = async e => await updateSelected({ status:e.target.value }, `status changed to ${e.target.value}`);
$('taskStatus').onchange = async e => await updateSelected({ status:e.target.value }, `status changed to ${e.target.value}`);
$('fileForm').onsubmit = async e => { e.preventDefault(); const t=selected(); if(!t) return; const f={ filename:$('fileName').value.trim(), type:$('fileType').value.trim(), note:$('fileNote').value.trim() }; if(!f.filename) return; await updateSelected({ files:[...(t.files||[]), f] }, `file added: ${f.filename}`); e.target.reset(); };
$('participantForm').onsubmit = async e => { e.preventDefault(); const t=selected(); if(!t) return; const p={ name:$('participantName').value.trim(), role:$('participantRole').value.trim() }; if(!p.name) return; await updateSelected({ participants:[...(t.participants||[]), p] }, `participant added: ${p.name}`); e.target.reset(); };
seedSelects(); loadTasks();
