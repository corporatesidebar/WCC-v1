const API_BASE = window.WCC_API_BASE || 'https://wcc-backend-f305.onrender.com';
const STATUSES = ['New','In Progress','Waiting','Blocked','Done','Archived'];
const CATEGORIES = ['Emily / Design & Creative','Sarah / Frontend','Alex / Backend','James / Testing','Commander / Governance','Sir Homie / Strategy'];
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
let state = { tasks: [], selectedId: null, online: false, modalMode: 'task' };

const $ = (id) => document.getElementById(id);
const nowISO = () => new Date().toISOString();
function uid(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()); }
function stamp(text){ return { text, created_at: nowISO() }; }
function comment(text, author='WW'){ return { text, author, created_at: nowISO() }; }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function selected(){ return state.tasks.find(t => t.id === state.selectedId); }
function isArchived(t){ return (t.status || '') === 'Archived'; }
function activeTasks(){ return state.tasks.filter(t => !isArchived(t)); }
function archivedTasks(){ return state.tasks.filter(isArchived); }
function normalizeTask(t){
  t.category = t.category || t.destination || 'Commander / Governance';
  t.destination = t.destination || t.category;
  t.sender = t.sender || 'WW - Governance';
  t.message = t.message || t.title || '';
  t.notes = t.notes || '';
  t.status = STATUSES.includes(t.status) ? t.status : 'New';
  t.comments = Array.isArray(t.comments) ? t.comments : [];
  t.files = Array.isArray(t.files) ? t.files : [];
  t.participants = Array.isArray(t.participants) ? t.participants : [];
  t.activity = Array.isArray(t.activity) ? t.activity : [];
  return t;
}

function seedSelects(){
  $('taskStatus').innerHTML = STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');
  $('taskCategory').innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
}
async function api(path, options={}){
  const res = await fetch(`${API_BASE}${path}`, { headers:{'Content-Type':'application/json'}, ...options });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
function localLoad(){ return JSON.parse(localStorage.getItem('wcc_tasks_thread_model') || localStorage.getItem('wcc_tasks') || '[]').map(normalizeTask); }
function localSave(){ localStorage.setItem('wcc_tasks_thread_model', JSON.stringify(state.tasks)); }

async function loadTasks(){
  try{
    const data = await api('/tasks');
    state.tasks = (data.tasks || []).map(normalizeTask);
    state.online = true;
    localSave();
  }catch(e){
    state.tasks = localLoad();
    state.online = false;
  }
  state.tasks.sort(sortByUpdated);
  if(!selected() && activeTasks().length) state.selectedId = activeTasks()[0].id;
  render();
  checkHealth();
}
function sortByUpdated(a,b){ return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||'')); }
async function saveTask(task){
  task = normalizeTask(task);
  if(state.online){
    const saved = await api(`/tasks${task.id ? '/' + task.id : ''}`, { method: task.id ? 'PUT':'POST', body: JSON.stringify(task) });
    return normalizeTask(saved.task);
  }
  const ts = nowISO();
  if(!task.id){ task.id = uid(); task.created_at = ts; task.updated_at = ts; task.activity = task.activity?.length ? task.activity : [stamp('task thread created')]; }
  else { task.updated_at = ts; }
  const i = state.tasks.findIndex(t=>t.id===task.id);
  if(i >= 0) state.tasks[i] = task; else state.tasks.unshift(task);
  localSave();
  return task;
}
async function updateSelected(patch, activityText){
  const task = selected(); if(!task) return;
  const updated = normalizeTask({ ...task, ...patch });
  if(activityText) updated.activity = [...(task.activity||[]), stamp(activityText)];
  const saved = await saveTask(updated);
  const i = state.tasks.findIndex(t=>t.id===saved.id);
  if(i >= 0) state.tasks[i] = saved; else state.tasks.unshift(saved);
  state.selectedId = saved.id;
  state.tasks.sort(sortByUpdated);
  localSave();
  render('Saved');
}

function render(saveText=''){
  renderRecents(); renderCenter(); renderRight();
  const saveState = $('saveState');
  if(saveState){ saveState.textContent = saveText; setTimeout(()=>{ saveState.textContent=''; }, 1500); }
}
function renderRecents(){
  const items = activeTasks().slice(0,10);
  $('recentsList').innerHTML = items.map(t => `<button class="recent-item ${t.id===state.selectedId?'active':''}" data-id="${t.id}"><span>${escapeHtml(t.title||'Untitled Thread')}</span><span class="pin">⌁</span></button>`).join('') || '<p class="empty">No active threads yet.</p>';
}
function renderCenter(){
  const editBtn = $('editTaskBtn');
  if(!state.tasks.length){
    $('taskListHeading').textContent = '10 Tasks that that are a few days old ...';
    $('centerTaskList').className = '';
    $('centerTaskList').innerHTML = fallbackTasks.map(t=>`<li>${escapeHtml(t)}</li>`).join('');
    editBtn.classList.add('hidden');
    return;
  }
  const task = selected();
  editBtn.classList.toggle('hidden', !task);
  if(!task){
    $('taskListHeading').textContent = 'Today';
    renderTodayList();
    return;
  }
  renderThread(task);
}
function renderTodayList(){
  const tasks = activeTasks();
  $('taskListHeading').textContent = 'Today';
  $('centerTaskList').className = 'thread-list';
  $('centerTaskList').innerHTML = tasks.map(t => threadRow(t)).join('') || '<li class="empty-row">No active task threads today.</li>';
}
function threadRow(t){
  const unread = (t.comments || []).length;
  const updated = formatDate(t.updated_at || t.created_at);
  return `<li class="thread-row ${t.id===state.selectedId?'selected':''}" data-id="${t.id}">
    <div><strong>${escapeHtml(t.title || 'Untitled Thread')}</strong><small>${escapeHtml(t.category || '')}</small></div>
    <span class="row-status">${escapeHtml(t.status || 'New')}</span>
    <span class="row-count">${unread} comments</span>
    <span class="row-date">${updated}</span>
  </li>`;
}
function renderThread(task){
  $('taskListHeading').textContent = task.title || 'Selected Task Thread';
  $('centerTaskList').className = 'thread-view';
  const comments = (task.comments||[]).map(c => `<div class="comment-bubble"><strong>${escapeHtml(c.author||'WW')}</strong><p>${escapeHtml(c.text)}</p><small>${formatDate(c.created_at)}</small></div>`).join('');
  $('centerTaskList').innerHTML = `<li class="thread-shell">
    <div class="thread-meta"><span>${escapeHtml(task.category||'')}</span><span>${escapeHtml(task.status||'New')}</span><span>${formatDate(task.updated_at || task.created_at)}</span></div>
    <div class="original-message"><strong>Original Message</strong><p>${escapeHtml(task.message||'')}</p>${task.notes ? `<small>Notes: ${escapeHtml(task.notes)}</small>` : ''}</div>
    <div class="comments-title">Comments / Replies</div>
    <div class="comments-list">${comments || '<p class="empty">No comments yet.</p>'}</div>
    <form id="commentForm" class="comment-form"><input id="commentInput" placeholder="Add a comment / reply to this task thread..." autocomplete="off" /><button type="submit">Add</button></form>
    <div class="thread-actions"><button id="showTodayBtn" type="button">Today</button><button id="completeBtn" type="button">Complete</button><button id="archiveBtn" type="button">Archive</button></div>
  </li>`;
  bindThreadActions();
}
function bindThreadActions(){
  const f = $('commentForm');
  if(f) f.onsubmit = async e => { e.preventDefault(); const text=$('commentInput').value.trim(); if(!text) return; const t=selected(); await updateSelected({ comments:[...(t.comments||[]), comment(text)] }, 'comment added'); };
  const today = $('showTodayBtn'); if(today) today.onclick = () => { state.selectedId = null; render(); };
  const done = $('completeBtn'); if(done) done.onclick = async () => { if(selected()) await updateSelected({ status:'Done' }, 'task completed'); };
  const arch = $('archiveBtn'); if(arch) arch.onclick = async () => { if(selected()) await updateSelected({ status:'Archived' }, 'task archived'); state.selectedId = activeTasks()[0]?.id || null; render(); };
}
function renderRight(){
  const t = selected() || {};
  $('addFileBtn').classList.toggle('hidden', !selected());
  $('addParticipantBtn').classList.toggle('hidden', !selected());
  const activity = t.activity || [];
  $('activityList').innerHTML = activity.slice(-8).reverse().map(a=>`<li>- ${escapeHtml(a.text)}</li>`).join('') || '<li>- Testing all GOOD</li><li>- WW uploaded & deployed</li><li>- Homie reviewed and approved</li><li>- WW forwarded to Homie</li><li>- DDC Uploaded ZIP</li>';
  const files = t.files || [];
  const filesHtml = files.map(f=>`<li>- ${escapeHtml(f.filename)}${f.note ? ' ('+escapeHtml(f.note)+')':''}</li>`).join('') || '<li>- this-is-the-zip-05.zip</li><li>- this-is-the-zip-04.zip</li><li>- this-is-the-zip-03.zip</li><li>- this-is-the-zip-02.zip</li><li>- this-is-the-zip-01.zip</li>';
  $('latestFilesList').innerHTML = filesHtml;
  $('attachedFilesList').innerHTML = filesHtml;
  const status = t.status || 'New';
  $('statusPills').innerHTML = selected() ? STATUSES.map(s=>`<button class="status-pill ${s===status?'active':''}" data-status="${s}">${s}</button>`).join('') : '';
  $('statusText').innerHTML = selected() ? `- ${escapeHtml(status)}<br>- ${escapeHtml(t.category||'')}` : '- need to abc move forward<br>uploaded files GitHub<br>test';
  const people = t.participants || [];
  $('participantsList').innerHTML = people.map(p=>`<li>- ${escapeHtml(p.name)}${p.role ? ' - '+escapeHtml(p.role):''}</li>`).join('') || '<li>- WW - Governance</li><li>- Homie #2 - COO</li><li>- DDC -Digital Design / Creative</li>';
}
async function checkHealth(){
  try{ await api('/health'); $('testList').innerHTML = '<li>health - GOOD</li><li>response - GOOD</li><li>test - GOOD</li>'; }
  catch{ $('testList').innerHTML = '<li>health - local fallback</li><li>response - saved locally</li><li>test - GOOD</li>'; }
}
function formatDate(s){ if(!s) return ''; try{ return new Date(s).toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); }catch{return '';} }
function showModal(mode='task', isNew=false){
  state.modalMode = mode;
  $('modalBackdrop').classList.remove('hidden');
  $('taskForm').classList.toggle('hidden', mode !== 'task');
  $('fileForm').classList.toggle('hidden', mode !== 'file');
  $('participantForm').classList.toggle('hidden', mode !== 'participant');
  $('modalTitle').textContent = mode === 'file' ? 'Add File Reference' : mode === 'participant' ? 'Add Participant' : isNew ? 'New Task Thread' : 'Edit Task Thread';
  if(mode === 'task') fillTaskForm(isNew);
}
function hideModal(){ $('modalBackdrop').classList.add('hidden'); }
function fillTaskForm(isNew=false){
  const q = $('quickTitle').value.trim();
  const t = isNew ? { title:q, category:'Emily / Design & Creative', sender:'WW - Governance', destination:'Emily / Design & Creative', message:q, notes:'', status:'New' } : (selected() || {});
  $('taskTitle').value = t.title || '';
  $('taskCategory').value = t.category || 'Emily / Design & Creative';
  $('taskSender').value = t.sender || 'WW - Governance';
  $('taskDestination').value = t.destination || t.category || '';
  $('taskMessage').value = t.message || '';
  $('taskNotes').value = t.notes || '';
  $('taskStatus').value = t.status || 'New';
}

$('newTaskBtn').onclick = () => { $('quickTitle').focus(); };
$('quickPlus').onclick = () => showModal('task', true);
$('quickTaskForm').onsubmit = async e => {
  e.preventDefault();
  const text = $('quickTitle').value.trim(); if(!text) return;
  showModal('task', true);
};
$('editTaskBtn').onclick = () => showModal('task', false);
$('closeModal').onclick = hideModal;
$('modalBackdrop').onclick = e => { if(e.target.id === 'modalBackdrop') hideModal(); };
$('taskForm').onsubmit = async e => {
  e.preventDefault();
  const existing = selected();
  const category = $('taskCategory').value;
  const payload = normalizeTask({
    title:$('taskTitle').value.trim(),
    category,
    sender:$('taskSender').value.trim(),
    destination:$('taskDestination').value.trim() || category,
    message:$('taskMessage').value.trim(),
    notes:$('taskNotes').value.trim(),
    status:$('taskStatus').value,
    comments: existing?.comments || [], files: existing?.files || [], participants: existing?.participants || [], activity: existing?.activity || []
  });
  if(!payload.title || !payload.message) return;
  if(existing) await updateSelected(payload, 'task thread updated');
  else {
    payload.activity = [stamp('task thread created')];
    const saved = await saveTask(payload);
    state.tasks = [saved, ...state.tasks.filter(t=>t.id!==saved.id)];
    state.selectedId = saved.id;
    localSave(); render('Task thread created');
  }
  $('quickTitle').value=''; hideModal();
};
$('recentsList').onclick = e => { const b=e.target.closest('[data-id]'); if(b){ state.selectedId=b.dataset.id; render(); } };
$('centerTaskList').onclick = e => { const row=e.target.closest('[data-id]'); if(row){ state.selectedId=row.dataset.id; render(); } };
$('statusPills').onclick = async e => { const b=e.target.closest('[data-status]'); if(b && selected()) await updateSelected({ status:b.dataset.status }, `status changed to ${b.dataset.status}`); };
$('taskStatus').onchange = async e => { if(selected()) await updateSelected({ status:e.target.value }, `status changed to ${e.target.value}`); };
$('addFileBtn').onclick = () => showModal('file');
$('addParticipantBtn').onclick = () => showModal('participant');
$('fileForm').onsubmit = async e => { e.preventDefault(); const t=selected(); if(!t) return; const f={ filename:$('fileName').value.trim(), type:$('fileType').value.trim(), note:$('fileNote').value.trim() }; if(!f.filename) return; await updateSelected({ files:[...(t.files||[]), f] }, `file added: ${f.filename}`); e.target.reset(); hideModal(); };
$('participantForm').onsubmit = async e => { e.preventDefault(); const t=selected(); if(!t) return; const p={ name:$('participantName').value.trim(), role:$('participantRole').value.trim() }; if(!p.name) return; await updateSelected({ participants:[...(t.participants||[]), p] }, `participant added: ${p.name}`); e.target.reset(); hideModal(); };

seedSelects(); loadTasks();
