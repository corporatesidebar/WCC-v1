const state = {
  current: 'New',
  item: {
    type: 'Upload',
    title: 'Column 4 refinement package',
    content: 'Review the latest Column 4 oversight refinement and route to the correct operational channel for approval.',
    channel: 'Design'
  },
  log: [
    ['Workflow Created', 'System', 'WCC routing workflow initialized', 'Now'],
    ['Intake Opened', 'Admin Operator', 'Awaiting routing recommendation', 'Now']
  ],
  sentItems: []
};

const destinationRules = [
  { channel: 'Design', terms: ['design', 'ui', 'ux', 'figma', 'layout', 'column', 'screenshot', 'png', 'refinement', 'visual'] },
  { channel: 'Governance', terms: ['governance', 'policy', 'approval', 'approve', 'decision', 'rule', 'compliance', 'log'] },
  { channel: 'Deployments', terms: ['deploy', 'deployment', 'render', 'github', 'release', 'production', 'staging', 'rollback', 'version'] },
  { channel: 'EE Core', terms: ['executive engine', 'ee', 'backend', 'frontend', 'api', 'run', 'engine', 'core'] },
  { channel: 'Documents', terms: ['document', 'pdf', 'doc', 'readme', 'brief', 'proposal', 'file', 'asset', 'contract'] },
  { channel: 'Archive', terms: ['archive', 'archived', 'deprecated', 'old', 'remove', 'closed', 'complete'] }
];

const stateMeta = {
  New: { className: 'new-state', stage: 'New Intake', text: 'Awaiting destination suggestion.', score: 35, ready: 'Needs suggestion' },
  Review: { className: 'review-state', stage: 'Review Layer', text: 'Short version, long version, must read, and recommended action are ready for review.', score: 68, ready: 'Review in progress' },
  Approved: { className: 'approved-state', stage: 'Approved', text: 'Destination approved. Ready to send.', score: 86, ready: 'Ready to send' },
  Sent: { className: 'sent-state', stage: 'Sent / Routed', text: 'Item has been pushed into the approved destination channel.', score: 100, ready: 'Routed successfully' },
  Blocked: { className: 'blocked-state', stage: 'Blocked / Hold', text: 'Routing is on hold pending operator decision.', score: 25, ready: 'Blocked' },
  Archived: { className: 'archived-state', stage: 'Archived', text: 'Item closed and preserved for continuity.', score: 100, ready: 'Archived' }
};

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function captureItem() {
  state.item.type = $('itemType').value;
  state.item.title = $('itemTitle').value.trim() || 'Untitled operational item';
  state.item.content = $('itemContent').value.trim();
}

function suggestDestination() {
  captureItem();
  const haystack = `${state.item.type} ${state.item.title} ${state.item.content}`.toLowerCase();
  let best = { channel: 'Design', score: 0 };
  destinationRules.forEach(rule => {
    const score = rule.terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (score > best.score) best = { channel: rule.channel, score };
  });
  state.item.channel = best.channel;
  updateReviewCopy();
  $('destinationReady').textContent = 'Ready';
  addLog('Destination Suggested', 'System', `Suggested destination: ${state.item.channel}`);
  if (state.current === 'New') state.current = 'Review';
  render();
}

function updateReviewCopy() {
  const type = state.item.type;
  const title = state.item.title;
  const channel = state.item.channel;
  $('suggestedChannel').textContent = channel;
  $('destinationTarget').textContent = channel;
  $('affectedChannels').textContent = channel === 'Archive' ? 'Archive Only' : '1 Channel';
  $('shortVersion').textContent = `${type}: ${title} → ${channel}.`;
  $('longVersion').textContent = `This ${type.toLowerCase()} has been interpreted as an operational item for ${channel}. The recommended path is to review the short version, read the critical context, approve the destination, then send it into the correct channel/state for continuity.`;
  $('mustRead').textContent = channel === 'Deployments'
    ? 'Deployment-related items require approval before send. Verify version, environment, and rollback readiness.'
    : channel === 'Archive'
      ? 'Archiving removes the item from active workflow pressure but preserves it for continuity and governance history.'
      : `Confirm this belongs in ${channel}. Do not send until the operator has reviewed the destination and action.`;
  $('recommendedAction').textContent = state.current === 'Approved'
    ? `Send to ${channel}.`
    : `Approve destination, then send to ${channel}.`;
}

function setState(next, shouldLog = true) {
  captureItem();
  state.current = next;
  if (shouldLog) addLog(`State Changed: ${next}`, 'Admin Operator', `Item moved to ${next}`);
  updateReviewCopy();
  render();
}

function addLog(event, by, note) {
  state.log.unshift([event, by, note, nowLabel()]);
  state.log = state.log.slice(0, 8);
}

function approveItem() {
  if (state.current === 'New') suggestDestination();
  state.current = 'Approved';
  addLog('Approval Captured', 'Admin Operator', `Approved routing to ${state.item.channel}`);
  updateReviewCopy();
  render();
}

function sendItem() {
  if (state.current === 'New') suggestDestination();
  if (state.current === 'Review') approveItem();
  state.sentItems.unshift({ ...state.item, state: 'Sent', time: nowLabel() });
  state.current = 'Sent';
  addLog('Item Sent', 'System', `Pushed into ${state.item.channel}`);
  updateReviewCopy();
  render();
}

function render() {
  const meta = stateMeta[state.current];
  const pill = $('currentStatePill');
  pill.textContent = state.current;
  pill.className = `status-pill ${meta.className}`;
  $('currentStage').textContent = meta.stage;
  $('currentStageText').textContent = meta.text;
  $('routingState').textContent = state.current;
  $('readinessScore').textContent = `${meta.score}%`;
  $('readinessBar').style.width = `${meta.score}%`;
  $('readinessText').textContent = meta.ready;
  $('dynamicTag').textContent = state.item.channel.toLowerCase().replace(/\s+/g, '-');

  document.querySelectorAll('.step').forEach(step => step.classList.remove('done', 'current'));
  const flow = ['New', 'Review', 'Approved', 'Sent', 'Archived'];
  const index = flow.indexOf(state.current);
  document.querySelectorAll('.step').forEach((step, idx) => {
    const value = idx === 0 ? 'New' : step.dataset.stateStep;
    if (value === state.current) step.classList.add('current');
    if (index >= 0 && idx <= index) step.classList.add('done');
  });

  $('governanceLog').innerHTML = state.log.map(row => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td><td>${esc(row[2])}</td><td>${esc(row[3])}</td></tr>`).join('');

  const actions = nextActions();
  $('nextActionsTable').innerHTML = actions.map(a => `<tr><td>${esc(a.action)}</td><td><span class="badge ${a.priority.toLowerCase()}">${esc(a.priority)}</span></td><td>${esc(a.owner)}</td><td>${esc(a.due)}</td><td><button class="btn ghost mini-action" data-action="${esc(a.click)}">${esc(a.status)}</button></td></tr>`).join('');
  $('priorityActions').innerHTML = actions.slice(0, 4).map(a => `<div class="feed-row"><div>${esc(a.action)}<small>${esc(a.owner)}</small></div><span>${esc(a.priority)}</span></div>`).join('');

  const pending = ['New', 'Review', 'Approved'].includes(state.current) ? 1 : 0;
  $('pendingList').innerHTML = pending ? `<div class="feed-row"><div>${esc(state.item.title)}<small>${esc(state.item.channel)}</small></div><span>${esc(state.current)}</span></div>` : `<div class="feed-row"><div>No pending approvals<small>Routing queue clear</small></div><span>Clear</span></div>`;
  $('pendingCount').textContent = `${pending} total pending`;

  const blocked = state.current === 'Blocked' ? 1 : 0;
  $('blockedList').innerHTML = blocked ? `<div class="feed-row"><div>${esc(state.item.title)}<small>Operator decision required</small></div><span>Blocked</span></div>` : `<div class="feed-row"><div>No blocked routing items<small>Continuity stable</small></div><span>Clear</span></div>`;
  $('blockedCount').textContent = `${blocked} blocked`;

  $('statNew').textContent = state.current === 'New' ? 1 : 0;
  $('statBlocked').textContent = blocked;
  $('statReview').textContent = state.current === 'Review' ? 1 : 0;
  $('statSent').textContent = state.sentItems.length;
  $('approvalBadge').textContent = Math.max(0, 8 + pending - state.sentItems.length);
  $('deploymentBadge').textContent = state.item.channel === 'Deployments' && state.current !== 'Sent' ? 6 : 5;
  $('approvalCompliance').textContent = state.current === 'Sent' ? '98%' : state.current === 'Blocked' ? '74%' : '82%';
  $('openGaps').textContent = pending + blocked;
  $('validationStatus').textContent = state.current === 'Sent' ? 'Verified' : state.current === 'Blocked' ? 'Blocked' : 'Pending';
  $('warningUnapproved').textContent = pending;
  $('warningTotal').textContent = `${pending + blocked + 2} total`;
  $('atRiskWorkflows').textContent = blocked || (state.current !== 'Sent' && state.current !== 'Archived' ? 1 : 0);
  $('continuityIntegrity').textContent = state.current === 'Sent' ? '96%' : state.current === 'Blocked' ? '71%' : '88%';
}

function nextActions() {
  if (state.current === 'New') return [
    { action: 'Add item and suggest destination', priority: 'High', owner: 'System', due: 'Now', status: 'Suggest', click: 'suggest' },
    { action: 'Review short version and must-read context', priority: 'Medium', owner: 'Admin Operator', due: 'Today', status: 'Review', click: 'review' }
  ];
  if (state.current === 'Review') return [
    { action: 'Approve routing destination', priority: 'High', owner: 'Admin Operator', due: 'Now', status: 'Approve', click: 'approve' },
    { action: `Hold if ${state.item.channel} is wrong`, priority: 'Medium', owner: 'Admin Operator', due: 'Now', status: 'Hold', click: 'hold' }
  ];
  if (state.current === 'Approved') return [
    { action: `Send item to ${state.item.channel}`, priority: 'High', owner: 'Admin Operator', due: 'Now', status: 'Send', click: 'send' },
    { action: 'Archive after send if no longer active', priority: 'Low', owner: 'Admin Operator', due: 'Optional', status: 'Archive', click: 'archive' }
  ];
  if (state.current === 'Blocked') return [
    { action: 'Edit item or destination', priority: 'High', owner: 'Admin Operator', due: 'Now', status: 'Edit', click: 'edit' },
    { action: 'Archive if no longer valid', priority: 'Low', owner: 'Admin Operator', due: 'Today', status: 'Archive', click: 'archive' }
  ];
  return [
    { action: 'Review routed channel record', priority: 'Low', owner: 'Admin Operator', due: 'Complete', status: 'Open', click: 'review' },
    { action: 'Archive completed item', priority: 'Low', owner: 'Admin Operator', due: 'Optional', status: 'Archive', click: 'archive' }
  ];
}

document.addEventListener('click', (event) => {
  const collapse = event.target.closest('[data-collapse]');
  if (collapse) $(collapse.dataset.collapse).classList.toggle('collapsed');

  const nav = event.target.closest('.nav-item');
  if (nav) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    nav.classList.add('active');
    const label = nav.dataset.channel;
    const map = {
      'Deployment Queue': 'Deployments',
      'Approvals': 'Governance',
      'Version Registry': 'Deployments',
      'Rollbacks': 'Deployments',
      'Governance Logs': 'Governance',
      'Archived Versions': 'Archive',
      'Projects': 'EE Core',
      'Active Workflows': 'Design',
      'Integrity Checks': 'Governance'
    };
    state.item.channel = map[label] || state.item.channel;
    addLog('Destination Manually Adjusted', 'Admin Operator', `Destination set to: ${state.item.channel}`);
    updateReviewCopy();
    render();
  }

  const mini = event.target.closest('.mini-action');
  if (mini) {
    if (mini.dataset.action === 'suggest') suggestDestination();
    if (mini.dataset.action === 'review') setState('Review');
    if (mini.dataset.action === 'approve') approveItem();
    if (mini.dataset.action === 'send') sendItem();
    if (mini.dataset.action === 'hold') setState('Blocked');
    if (mini.dataset.action === 'edit') setState('Review');
    if (mini.dataset.action === 'archive') setState('Archived');
  }
});

$('suggestRouteBtn').addEventListener('click', suggestDestination);
$('approveBtn').addEventListener('click', approveItem);
$('editBtn').addEventListener('click', () => setState('Review'));
$('holdBtn').addEventListener('click', () => setState('Blocked'));
$('sendBtn').addEventListener('click', sendItem);
$('archiveBtn').addEventListener('click', () => setState('Archived'));
['itemType', 'itemTitle', 'itemContent'].forEach(id => $(id).addEventListener('input', () => {
  captureItem();
  if (['Sent', 'Archived'].includes(state.current)) state.current = 'New';
  updateReviewCopy();
  render();
}));

document.querySelectorAll('[data-main-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.mainAction;
    if (action === 'approve') approveItem();
    if (action === 'deploy') sendItem();
    if (action === 'hold') setState('Blocked');
    if (action === 'rollback') { state.item.channel = 'Deployments'; setState('Review'); }
  });
});

updateReviewCopy();
render();
