const state = {
  current: 'New',
  item: {
    type: 'Upload',
    title: 'Column 4 refinement package',
    content: 'Review the latest Column 4 oversight refinement and route to the correct operational channel for approval.',
    channel: 'Active Workflows'
  },
  log: [
    ['Workflow Created', 'System', 'WCC routing workflow initialized', 'Now'],
    ['Intake Opened', 'Admin Operator', 'Awaiting routing recommendation', 'Now']
  ],
  sentItems: []
};

const channelRules = [
  { channel: 'Deployment Queue', terms: ['deploy', 'deployment', 'render', 'github', 'release', 'production', 'staging'] },
  { channel: 'Approvals', terms: ['approve', 'approval', 'sign off', 'review request', 'pending approval'] },
  { channel: 'Version Registry', terms: ['version', 'registry', 'v1', 'v2', 'build', 'release id'] },
  { channel: 'Rollbacks', terms: ['rollback', 'restore', 'revert', 'snapshot'] },
  { channel: 'Governance Logs', terms: ['governance', 'policy', 'decision', 'log', 'compliance'] },
  { channel: 'Archived Versions', terms: ['archive', 'archived', 'deprecated', 'old version'] },
  { channel: 'Integrity Checks', terms: ['integrity', 'dependency', 'blocked', 'risk', 'validation'] },
  { channel: 'Projects', terms: ['project', 'initiative', 'new product'] },
  { channel: 'Active Workflows', terms: ['workflow', 'design', 'refinement', 'column', 'task', 'note'] }
];

const stateMeta = {
  New: { className: 'new-state', stage: 'New Intake', text: 'Awaiting routing recommendation.', score: 42, ready: 'Needs review' },
  Review: { className: 'review-state', stage: 'Operator Review', text: 'Short and long versions are ready for operator review.', score: 68, ready: 'Review in progress' },
  Approved: { className: 'approved-state', stage: 'Approved', text: 'Routing decision approved. Ready to send.', score: 86, ready: 'Ready to send' },
  Sent: { className: 'sent-state', stage: 'Sent / Routed', text: 'Item has been pushed into the destination channel.', score: 100, ready: 'Routed successfully' },
  Blocked: { className: 'blocked-state', stage: 'Blocked', text: 'Routing is blocked pending operator decision.', score: 25, ready: 'Blocked' },
  Archived: { className: 'archived-state', stage: 'Archived', text: 'Item closed and preserved for continuity.', score: 100, ready: 'Archived' }
};

const $ = (id) => document.getElementById(id);

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function suggestRoute() {
  state.item.type = $('itemType').value;
  state.item.title = $('itemTitle').value.trim() || 'Untitled operational item';
  state.item.content = $('itemContent').value.trim();
  const haystack = `${state.item.type} ${state.item.title} ${state.item.content}`.toLowerCase();
  let best = { channel: 'Active Workflows', score: 0 };
  channelRules.forEach(rule => {
    const score = rule.terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (score > best.score) best = { channel: rule.channel, score };
  });
  state.item.channel = best.channel;
  $('suggestedChannel').textContent = state.item.channel;
  $('destinationTarget').textContent = state.item.channel;
  $('affectedChannels').textContent = state.item.channel === 'Active Workflows' ? '1 Channel' : '2 Channels';
  $('shortVersion').textContent = `${state.item.type}: ${state.item.title} → ${state.item.channel}.`;
  $('longVersion').textContent = `This ${state.item.type.toLowerCase()} appears related to ${state.item.channel.toLowerCase()}. Suggested route: ${state.item.channel}. Review the summary, confirm the destination, then approve/send to preserve workflow continuity.`;
  $('destinationReady').textContent = 'Ready';
  addLog('Route Suggested', 'System', `Suggested destination: ${state.item.channel}`);
  if (state.current === 'New') setState('Review', false);
  render();
}

function setState(next, shouldLog = true) {
  state.current = next;
  if (shouldLog) addLog(`State Changed: ${next}`, 'Admin Operator', `Item moved to ${next}`);
  render();
}

function addLog(event, by, note) {
  state.log.unshift([event, by, note, nowLabel()]);
  state.log = state.log.slice(0, 8);
}

function approveSend() {
  if (state.current === 'New') suggestRoute();
  if (state.current === 'Review') {
    setState('Approved');
    addLog('Approval Captured', 'Admin Operator', `Approved routing to ${state.item.channel}`);
  }
  state.sentItems.unshift({ ...state.item, state: 'Sent', time: nowLabel() });
  setState('Sent');
  addLog('Item Sent', 'System', `Pushed into ${state.item.channel}`);
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
  $('dynamicTag').textContent = state.current.toLowerCase();

  document.querySelectorAll('.step').forEach(step => {
    const value = step.dataset.stateStep;
    step.classList.remove('done', 'current');
    if (value === state.current) step.classList.add('current');
  });

  const completedMap = ['New', 'Review', 'Approved', 'Sent', 'Archived'];
  const index = completedMap.indexOf(state.current);
  document.querySelectorAll('.step').forEach((step, idx) => {
    if (idx <= index && index > 0) step.classList.add('done');
  });
  document.querySelector('.step:first-child').classList.add('done');

  $('governanceLog').innerHTML = state.log.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`).join('');

  const actions = nextActions();
  $('nextActionsTable').innerHTML = actions.map(a => `<tr><td>${a.action}</td><td><span class="badge ${a.priority.toLowerCase()}">${a.priority}</span></td><td>${a.owner}</td><td>${a.due}</td><td><button class="btn ghost mini-action" data-action="${a.click}">${a.status}</button></td></tr>`).join('');

  $('priorityActions').innerHTML = actions.slice(0, 4).map(a => `<div class="feed-row"><div>${a.action}<small>${a.owner}</small></div><span>${a.priority}</span></div>`).join('');

  const pending = ['New', 'Review', 'Approved'].includes(state.current) ? 1 : 0;
  $('pendingList').innerHTML = pending ? `<div class="feed-row"><div>${state.item.title}<small>${state.item.channel}</small></div><span>${state.current}</span></div>` : `<div class="feed-row"><div>No pending approvals<small>Routing queue clear</small></div><span>Clear</span></div>`;
  $('pendingCount').textContent = `${pending} total pending`;

  const blocked = state.current === 'Blocked' ? 1 : 0;
  $('blockedList').innerHTML = blocked ? `<div class="feed-row"><div>${state.item.title}<small>Operator decision required</small></div><span>Blocked</span></div>` : `<div class="feed-row"><div>No blocked routing items<small>Continuity stable</small></div><span>Clear</span></div>`;
  $('blockedCount').textContent = `${blocked} blocked`;

  $('statNew').textContent = state.current === 'New' ? 1 : 0;
  $('statBlocked').textContent = blocked;
  $('statReview').textContent = state.current === 'Review' ? 1 : 0;
  $('statSent').textContent = state.sentItems.length;
  $('approvalBadge').textContent = Math.max(0, 8 + pending - state.sentItems.length);
  $('deploymentBadge').textContent = state.item.channel === 'Deployment Queue' && state.current !== 'Sent' ? 6 : 5;
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
    { action: 'Suggest destination channel', priority: 'High', owner: 'System', due: 'Now', status: 'Suggest', click: 'suggest' },
    { action: 'Review short and long versions', priority: 'Medium', owner: 'Admin Operator', due: 'Today', status: 'View', click: 'review' },
    { action: 'Confirm governance path', priority: 'Low', owner: 'Admin Operator', due: 'Today', status: 'Open', click: 'review' }
  ];
  if (state.current === 'Review') return [
    { action: 'Approve routing decision', priority: 'High', owner: 'Admin Operator', due: 'Now', status: 'Approve', click: 'approve' },
    { action: `Validate ${state.item.channel} destination`, priority: 'Medium', owner: 'System', due: 'Today', status: 'Verify', click: 'suggest' },
    { action: 'Preserve governance log', priority: 'Low', owner: 'System', due: 'Today', status: 'Open', click: 'review' }
  ];
  if (state.current === 'Approved') return [
    { action: `Send item to ${state.item.channel}`, priority: 'High', owner: 'Admin Operator', due: 'Now', status: 'Send', click: 'approve' },
    { action: 'Confirm item state after routing', priority: 'Medium', owner: 'System', due: 'Today', status: 'Verify', click: 'approve' }
  ];
  if (state.current === 'Blocked') return [
    { action: 'Resolve routing blocker', priority: 'High', owner: 'Admin Operator', due: 'Now', status: 'Review', click: 'review' },
    { action: 'Archive if no longer needed', priority: 'Low', owner: 'Admin Operator', due: 'Today', status: 'Archive', click: 'archive' }
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
    state.item.channel = nav.dataset.channel;
    $('suggestedChannel').textContent = state.item.channel;
    $('destinationTarget').textContent = state.item.channel;
    addLog('Channel Selected', 'Admin Operator', `Manual channel selected: ${state.item.channel}`);
    render();
  }

  const mini = event.target.closest('.mini-action');
  if (mini) {
    if (mini.dataset.action === 'suggest') suggestRoute();
    if (mini.dataset.action === 'review') setState('Review');
    if (mini.dataset.action === 'approve') approveSend();
    if (mini.dataset.action === 'archive') setState('Archived');
  }
});

$('suggestRouteBtn').addEventListener('click', suggestRoute);
$('reviewBtn').addEventListener('click', () => setState('Review'));
$('approveSendBtn').addEventListener('click', approveSend);
$('blockBtn').addEventListener('click', () => setState('Blocked'));
$('archiveBtn').addEventListener('click', () => setState('Archived'));
['itemType', 'itemTitle', 'itemContent'].forEach(id => $(id).addEventListener('input', () => { if (state.current === 'Sent') setState('New'); }));

document.querySelectorAll('[data-main-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.mainAction;
    if (action === 'approve') setState('Approved');
    if (action === 'deploy') approveSend();
    if (action === 'hold') setState('Blocked');
    if (action === 'rollback') { state.item.channel = 'Rollbacks'; $('suggestedChannel').textContent = 'Rollbacks'; $('destinationTarget').textContent = 'Rollbacks'; setState('Review'); }
  });
});

render();
