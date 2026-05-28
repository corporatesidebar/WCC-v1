const WCC_API_BASE_URL = (window.WCC_API_BASE_URL || localStorage.getItem('WCC_API_BASE_URL') || '').replace(/\/$/, '');
const apiState = {
  enabled: Boolean(WCC_API_BASE_URL),
  online: false,
  loading: false,
  error: '',
  loadedFromBackend: false
};

async function apiRequest(path, options = {}) {
  if (!apiState.enabled) throw new Error('Backend URL not configured. Set window.WCC_API_BASE_URL or localStorage.WCC_API_BASE_URL.');
  const response = await fetch(`${WCC_API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json();
}

function isoToLabel(value) {
  if (!value) return 'Now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const state = {
  current: 'New',
  activeChannel: 'Active Workflows',
  lastAction: 'Intake opened',
  lastTimestamp: 'Now',
  confirmation: {
    title: 'Awaiting routing action',
    text: 'Add or review an item, then approve/send when ready.',
    tone: ''
  },
  item: {
    id: null,
    type: 'Upload',
    title: 'Column 4 refinement package',
    content: 'Review the latest Column 4 oversight refinement and route to the correct operational channel for approval.',
    channel: 'Design',
    location: 'Intake / Not Sent'
  },
  log: [
    ['Workflow Created', 'System', 'WCC routing workflow initialized', 'Now'],
    ['Intake Opened', 'Admin Operator', 'Awaiting routing recommendation', 'Now']
  ],
  activity: [
    { action: 'Item created', detail: 'Column 4 refinement package opened in intake.', time: 'Now' },
    { action: 'Workflow initialized', detail: 'Routing state set to New.', time: 'Now' }
  ],
  sentItems: []
};

let modalSelectedType = 'Task';

const destinationRules = [
  { channel: 'Design', terms: ['design', 'ui', 'ux', 'figma', 'layout', 'column', 'screenshot', 'png', 'refinement', 'visual'] },
  { channel: 'Governance', terms: ['governance', 'policy', 'approval', 'approve', 'decision', 'rule', 'compliance', 'log'] },
  { channel: 'Deployments', terms: ['deploy', 'deployment', 'render', 'github', 'release', 'production', 'staging', 'rollback', 'version'] },
  { channel: 'EE Core', terms: ['executive engine', 'ee', 'backend', 'frontend', 'api', 'run', 'engine', 'core'] },
  { channel: 'Documents', terms: ['document', 'pdf', 'doc', 'readme', 'brief', 'proposal', 'file', 'asset', 'contract', 'link'] },
  { channel: 'Archive', terms: ['archive', 'archived', 'deprecated', 'old', 'remove', 'closed', 'complete'] }
];

const stateMeta = {
  New: { className: 'new-state', stage: 'New Intake', text: 'Awaiting destination suggestion.', score: 35, ready: 'Needs suggestion', next: 'Suggest destination' },
  Review: { className: 'review-state', stage: 'Review Layer', text: 'Short version, long version, must read, and recommended action are ready for review.', score: 68, ready: 'Review in progress', next: 'Approve, edit, or hold' },
  Approved: { className: 'approved-state', stage: 'Approved', text: 'Destination approved. Ready to send.', score: 86, ready: 'Ready to send', next: 'Send to destination' },
  Sent: { className: 'sent-state', stage: 'Sent / Routed', text: 'Item has been pushed into the approved destination channel.', score: 100, ready: 'Routed successfully', next: 'Open channel record or archive' },
  Blocked: { className: 'blocked-state', stage: 'Blocked / Hold', text: 'Routing is on hold pending operator decision.', score: 25, ready: 'Blocked', next: 'Edit or archive' },
  Archived: { className: 'archived-state', stage: 'Archived', text: 'Item closed and preserved for continuity.', score: 100, ready: 'Archived', next: 'Create next item' }
};

const channelNavMap = {
  'Deployment Queue': 'Deployments',
  Approvals: 'Governance',
  'Version Registry': 'Deployments',
  Rollbacks: 'Deployments',
  'Governance Logs': 'Governance',
  'Archived Versions': 'Archive',
  Projects: 'EE Core',
  'Active Workflows': 'Design',
  'Integrity Checks': 'Governance',
  Settings: 'Governance',
  'Team Access': 'Governance',
  'Environment Config': 'Deployments'
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

function updateContinuity(action, detail, tone = '') {
  state.lastAction = action;
  state.lastTimestamp = nowLabel();
  state.confirmation = { title: action, text: detail, tone };
  state.activity.unshift({ action, detail, time: state.lastTimestamp });
  state.activity = state.activity.slice(0, 7);
}

function addLog(event, by, note) {
  state.log.unshift([event, by, note, nowLabel()]);
  state.log = state.log.slice(0, 8);
}

function locationForCurrentState() {
  if (state.current === 'Sent') return `${state.item.channel} / Sent`;
  if (state.current === 'Archived') return 'Archive / Closed';
  if (state.current === 'Blocked') return `${state.item.channel} / Blocked Hold`;
  if (state.current === 'Approved') return `${state.item.channel} / Approved Queue`;
  if (state.current === 'Review') return `${state.item.channel} / Review Queue`;
  return 'Intake / Not Sent';
}

function setItemLocation() {
  state.item.location = locationForCurrentState();
}

async function suggestDestination() {
  captureItem();
  const haystack = `${state.item.type} ${state.item.title} ${state.item.content}`.toLowerCase();
  let best = { channel: 'Design', score: 0 };
  destinationRules.forEach(rule => {
    const score = rule.terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (score > best.score) best = { channel: rule.channel, score };
  });
  state.item.channel = best.channel;
  if (state.current === 'New') state.current = 'Review';
  setItemLocation();
  $('destinationReady').textContent = 'Ready';
  addLog('Destination Suggested', 'System', `Suggested destination: ${state.item.channel}`);
  updateContinuity('Destination suggested', `${state.item.title} moved into ${state.item.location}.`, 'warning-confirm');
  updateReviewCopy();
  render();
  await ensureItemPersisted('destination suggested');
  await recordActivity('routed', `Suggested destination ${state.item.channel}; location ${state.item.location}.`);
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
    : state.current === 'Sent'
      ? `Item is now located in ${channel}. Review the channel record or archive when closed.`
      : state.current === 'Archived'
        ? 'Item is archived and preserved for continuity history.'
        : `Approve destination, then send to ${channel}.`;
}


function reviewPayload() {
  return {
    short_version: $('shortVersion') ? $('shortVersion').textContent : `${state.item.type}: ${state.item.title} → ${state.item.channel}.`,
    long_version: $('longVersion') ? $('longVersion').textContent : '',
    must_read: $('mustRead') ? $('mustRead').textContent : ''
  };
}

function itemPayload(overrides = {}) {
  updateReviewCopy();
  return {
    title: state.item.title || 'Untitled operational item',
    content: state.item.content || '',
    type: state.item.type || 'Note',
    channel: state.item.channel || 'Governance',
    state: state.current || 'New',
    ...reviewPayload(),
    ...overrides
  };
}

async function ensureItemPersisted(action = 'item created') {
  if (!apiState.enabled) return null;
  try {
    apiState.loading = true;
    if (state.item.id) {
      const updated = await apiRequest(`/items/${state.item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(itemPayload())
      });
      hydrateActiveItem(updated, false);
      apiState.online = true;
      apiState.error = '';
      return updated;
    }
    const created = await apiRequest('/items', {
      method: 'POST',
      body: JSON.stringify(itemPayload())
    });
    hydrateActiveItem(created, false);
    apiState.online = true;
    apiState.error = '';
    return created;
  } catch (error) {
    apiState.online = false;
    apiState.error = error.message || 'Backend request failed';
    updateContinuity('Persistence warning', 'Local UI updated, but backend persistence did not complete. Check backend URL/CORS.', 'blocked-confirm');
    return null;
  } finally {
    apiState.loading = false;
  }
}

async function persistItemPatch(patch = {}) {
  if (!apiState.enabled) return null;
  if (!state.item.id) return ensureItemPersisted();
  try {
    const updated = await apiRequest(`/items/${state.item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...itemPayload(), ...patch })
    });
    hydrateActiveItem(updated, false);
    apiState.online = true;
    apiState.error = '';
    return updated;
  } catch (error) {
    apiState.online = false;
    apiState.error = error.message || 'Backend request failed';
    updateContinuity('Persistence warning', 'State changed locally, but backend update failed. Check deployed backend.', 'blocked-confirm');
    return null;
  }
}

async function recordActivity(action, details) {
  if (!apiState.enabled) return null;
  try {
    const created = await apiRequest('/activity', {
      method: 'POST',
      body: JSON.stringify({ item_id: state.item.id || null, action, details })
    });
    apiState.online = true;
    apiState.error = '';
    return created;
  } catch (error) {
    apiState.online = false;
    apiState.error = error.message || 'Activity request failed';
    return null;
  }
}

function hydrateActiveItem(item, makeActive = true) {
  if (!item) return;
  state.item.id = item.id || state.item.id || null;
  state.item.title = item.title || state.item.title;
  state.item.content = item.content || state.item.content;
  state.item.type = item.type || state.item.type;
  state.item.channel = item.channel || state.item.channel;
  state.current = item.state || state.current;
  if (makeActive) {
    state.lastAction = 'Loaded from backend';
    state.lastTimestamp = isoToLabel(item.updated_at || item.created_at);
    state.confirmation = {
      title: 'Persistence loaded',
      text: `${state.item.title} restored from backend.`,
      tone: 'confirmed'
    };
  }
  setItemLocation();
}

function hydrateActivity(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  state.activity = rows.slice(0, 7).map(row => ({
    action: row.action || 'Activity',
    detail: row.details || '',
    time: isoToLabel(row.created_at)
  }));
  state.log = rows.slice(0, 8).map(row => [row.action || 'Activity', 'Backend', row.details || '', isoToLabel(row.created_at)]);
}

async function loadFromBackend() {
  if (!apiState.enabled) {
    apiState.error = 'Backend URL not configured';
    return;
  }
  try {
    apiState.loading = true;
    const [items, activity] = await Promise.all([
      apiRequest('/items?limit=50'),
      apiRequest('/activity?limit=50')
    ]);
    if (Array.isArray(items) && items.length) {
      hydrateActiveItem(items[0], true);
      state.sentItems = items.filter(item => item.state === 'Sent').map(item => ({
        ...item,
        time: isoToLabel(item.updated_at || item.created_at)
      }));
      $('itemType').value = state.item.type || 'Note';
      $('itemTitle').value = state.item.title || '';
      $('itemContent').value = state.item.content || '';
    }
    hydrateActivity(activity);
    apiState.online = true;
    apiState.loadedFromBackend = true;
    apiState.error = '';
  } catch (error) {
    apiState.online = false;
    apiState.error = error.message || 'Backend unavailable';
    updateContinuity('Backend offline', 'Frontend is running locally. Persistence will resume when the deployed backend is reachable.', 'blocked-confirm');
  } finally {
    apiState.loading = false;
  }
}

async function setState(next, shouldLog = true, actionLabel = `State changed: ${next}`) {
  captureItem();
  state.current = next;
  setItemLocation();
  if (shouldLog) addLog(`State Changed: ${next}`, 'Admin Operator', `Item moved to ${next}`);
  updateContinuity(actionLabel, `${state.item.title} is now in ${state.item.location}.`, next === 'Blocked' ? 'blocked-confirm' : next === 'Archived' || next === 'Approved' ? 'confirmed' : '');
  updateReviewCopy();
  render();
  await persistItemPatch({ state: next, channel: state.item.channel });
  await recordActivity(next.toLowerCase(), `${state.item.title} moved to ${state.item.location}.`);
  render();
}

async function approveItem() {
  if (state.current === 'New') {
    await suggestDestination();
  }
  state.current = 'Approved';
  setItemLocation();
  addLog('Approval Captured', 'Admin Operator', `Approved routing to ${state.item.channel}`);
  updateContinuity('Approved', `${state.item.title} approved for ${state.item.channel}. Next step: send.`, 'confirmed');
  updateReviewCopy();
  render();
  await persistItemPatch({ state: 'Approved', channel: state.item.channel });
  await recordActivity('approved', `${state.item.title} approved for ${state.item.channel}.`);
  render();
}

async function sendItem() {
  if (state.current === 'New') await suggestDestination();
  if (state.current === 'Review') {
    state.current = 'Approved';
    addLog('Approval Captured', 'Admin Operator', `Auto-approved routing to ${state.item.channel} before send`);
  }
  state.current = 'Sent';
  setItemLocation();
  state.sentItems.unshift({ ...state.item, state: 'Sent', time: nowLabel() });
  addLog('Item Sent', 'System', `Pushed into ${state.item.channel}`);
  updateContinuity('Sent', `${state.item.title} was pushed into ${state.item.channel}. Location: ${state.item.location}.`, 'confirmed');
  updateReviewCopy();
  render();
  await persistItemPatch({ state: 'Sent', channel: state.item.channel });
  await recordActivity('sent', `${state.item.title} pushed into ${state.item.channel}.`);
  render();
}

async function archiveItem() {
  state.current = 'Archived';
  state.item.channel = 'Archive';
  setItemLocation();
  addLog('Item Archived', 'Admin Operator', 'Item closed and preserved in Archive');
  updateContinuity('Archived', `${state.item.title} moved to Archive / Closed.`, 'confirmed');
  updateReviewCopy();
  render();
  await persistItemPatch({ state: 'Archived', channel: 'Archive' });
  await recordActivity('archived', `${state.item.title} moved to Archive / Closed.`);
  render();
}

function renderStatusVisibility() {
  const meta = stateMeta[state.current];
  const location = state.item.location || locationForCurrentState();
  $('statusCurrentState').textContent = state.current;
  $('statusDestinationChannel').textContent = state.item.channel;
  $('statusItemLocation').textContent = location;
  $('statusLastAction').textContent = state.lastAction;
  $('statusTimestamp').textContent = state.lastTimestamp;
  $('activeChannelLabel').textContent = state.activeChannel;
  $('destinationChannelLabel').textContent = state.item.channel;
  $('itemLocationLabel').textContent = location;
  $('nextStepLabel').textContent = meta.next;

  const banner = $('confirmationBanner');
  banner.className = `confirmation-banner ${state.confirmation.tone}`.trim();
  $('confirmationTitle').textContent = state.confirmation.title;
  $('confirmationText').textContent = state.confirmation.text;

  $('recentActivityList').innerHTML = state.activity.map(item => `
    <div class="activity-item">
      <div><strong>${esc(item.action)}</strong><small>${esc(item.detail)}</small></div>
      <time>${esc(item.time)}</time>
    </div>
  `).join('');
  $('activitySummary').textContent = `${state.activity.length} latest continuity events`;
}

function render() {
  setItemLocation();
  const meta = stateMeta[state.current];
  const pill = $('currentStatePill');
  pill.textContent = state.current;
  pill.className = `status-pill ${meta.className}`;
  $('currentStage').textContent = meta.stage;
  $('currentStageText').textContent = `${meta.text} Location: ${state.item.location}.`;
  $('routingState').textContent = state.current;
  $('readinessScore').textContent = `${meta.score}%`;
  $('readinessBar').style.width = `${meta.score}%`;
  $('readinessText').textContent = meta.ready;
  $('dynamicTag').textContent = state.item.channel.toLowerCase().replace(/\s+/g, '-');
  $('destinationReady').textContent = ['Review', 'Approved', 'Sent', 'Archived'].includes(state.current) ? 'Ready' : 'Pending';

  document.querySelectorAll('.step').forEach(step => step.classList.remove('done', 'current'));
  const flow = ['New', 'Review', 'Approved', 'Sent', 'Archived'];
  const index = flow.indexOf(state.current);
  document.querySelectorAll('.step').forEach((step, idx) => {
    const value = idx === 0 ? 'New' : step.dataset.stateStep;
    if (value === state.current) step.classList.add('current');
    if (index >= 0 && idx <= index) step.classList.add('done');
  });

  document.querySelectorAll('.sequence-step').forEach(step => step.classList.remove('sequence-current', 'sequence-done'));
  const sequenceFlow = ['New', 'Review', 'Approved', 'Sent'];
  const sequenceIndex = state.current === 'Archived' ? 3 : Math.max(0, sequenceFlow.indexOf(state.current));
  document.querySelectorAll('.sequence-step').forEach((step, idx) => {
    if (idx < sequenceIndex) step.classList.add('sequence-done');
    if (idx === sequenceIndex) step.classList.add('sequence-current');
  });

  $('governanceLog').innerHTML = state.log.map(row => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td><td>${esc(row[2])}</td><td>${esc(row[3])}</td></tr>`).join('');

  const actions = nextActions();
  $('nextActionsTable').innerHTML = actions.map(a => `<tr><td>${esc(a.action)}</td><td><span class="badge ${a.priority.toLowerCase()}">${esc(a.priority)}</span></td><td>${esc(a.owner)}</td><td>${esc(a.due)}</td><td><button class="btn ghost mini-action" data-action="${esc(a.click)}">${esc(a.status)}</button></td></tr>`).join('');
  $('priorityActions').innerHTML = actions.slice(0, 4).map(a => `<div class="feed-row"><div>${esc(a.action)}<small>${esc(a.owner)}</small></div><span>${esc(a.priority)}</span></div>`).join('');

  const pending = ['New', 'Review', 'Approved'].includes(state.current) ? 1 : 0;
  $('pendingList').innerHTML = pending ? `<div class="feed-row"><div>${esc(state.item.title)}<small class="location-note">${esc(state.item.location)}</small></div><span>${esc(state.current)}</span></div>` : `<div class="feed-row"><div>No pending approvals<small>Routing queue clear</small></div><span>Clear</span></div>`;
  $('pendingCount').textContent = `${pending} total pending`;

  const blocked = state.current === 'Blocked' ? 1 : 0;
  $('blockedList').innerHTML = blocked ? `<div class="feed-row"><div>${esc(state.item.title)}<small class="location-note">${esc(state.item.location)}</small></div><span>Blocked</span></div>` : `<div class="feed-row"><div>No blocked routing items<small>Continuity stable</small></div><span>Clear</span></div>`;
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

  renderStatusVisibility();
}


function openAddItemModal() {
  modalSelectedType = $('itemType').value || 'Task';
  $('modalItemTitle').value = '';
  $('modalItemContent').value = '';
  document.querySelectorAll('#modalTypeGrid button').forEach(button => {
    button.classList.toggle('active', button.dataset.type === modalSelectedType);
  });
  $('addItemModal').classList.add('open');
  $('addItemModal').setAttribute('aria-hidden', 'false');
  setTimeout(() => $('modalItemTitle').focus(), 0);
}

function closeAddItemModal() {
  $('addItemModal').classList.remove('open');
  $('addItemModal').setAttribute('aria-hidden', 'true');
}

async function createItemFromModal() {
  const title = $('modalItemTitle').value.trim() || `New ${modalSelectedType}`;
  const content = $('modalItemContent').value.trim() || `${modalSelectedType} created from the primary Add Item workflow.`;
  state.item = {
    id: null,
    type: modalSelectedType,
    title,
    content,
    channel: 'Design',
    location: 'Intake / Not Sent'
  };
  state.current = 'New';
  $('itemType').value = modalSelectedType;
  $('itemTitle').value = title;
  $('itemContent').value = content;
  addLog('Item Created', 'Admin Operator', `${modalSelectedType} added from primary action`);
  updateContinuity('Item created', `${title} added to intake. Next step: suggest destination.`, 'confirmed');
  updateReviewCopy();
  closeAddItemModal();
  render();
  await ensureItemPersisted('item created');
  await recordActivity('item created', `${title} created as ${modalSelectedType}.`);
  await suggestDestination();
}

function nextActions() {
  if (state.current === 'New') return [
    { action: 'Add item and suggest destination', priority: 'High', owner: 'System', due: 'Now', status: 'Suggest', click: 'suggest' },
    { action: 'Review short version and must-read context', priority: 'Medium', owner: 'Admin Operator', due: 'Today', status: 'Review', click: 'review' }
  ];
  if (state.current === 'Review') return [
    { action: `Approve routing to ${state.item.channel}`, priority: 'High', owner: 'Admin Operator', due: 'Now', status: 'Approve', click: 'approve' },
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
  if (state.current === 'Sent') return [
    { action: `Confirm item is visible in ${state.item.channel}`, priority: 'Low', owner: 'Admin Operator', due: 'Complete', status: 'Open', click: 'review' },
    { action: 'Archive completed item', priority: 'Low', owner: 'Admin Operator', due: 'Optional', status: 'Archive', click: 'archive' }
  ];
  return [
    { action: 'Create next routing item', priority: 'Low', owner: 'Admin Operator', due: 'Optional', status: 'New', click: 'new' }
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
    state.activeChannel = label;
    state.item.channel = channelNavMap[label] || state.item.channel;
    if (state.current === 'Sent') state.current = 'Review';
    setItemLocation();
    addLog('Destination Manually Adjusted', 'Admin Operator', `Destination set to: ${state.item.channel}`);
    updateContinuity('Channel visibility updated', `Active channel: ${state.activeChannel}. Destination: ${state.item.channel}. Location: ${state.item.location}.`);
    updateReviewCopy();
    render();
  }

  const mini = event.target.closest('.mini-action');
  if (mini) {
    if (mini.dataset.action === 'suggest') suggestDestination();
    if (mini.dataset.action === 'review') setState('Review', true, 'Review reopened');
    if (mini.dataset.action === 'approve') approveItem();
    if (mini.dataset.action === 'send') sendItem();
    if (mini.dataset.action === 'hold') setState('Blocked', true, 'Held / blocked');
    if (mini.dataset.action === 'edit') setState('Review', true, 'Edit mode opened');
    if (mini.dataset.action === 'archive') archiveItem();
    if (mini.dataset.action === 'new') {
      state.current = 'New';
      setItemLocation();
      updateContinuity('New intake ready', 'Current item reset to New intake state.');
      render();
    }
  }
});

$('suggestRouteBtn').addEventListener('click', suggestDestination);
$('approveBtn').addEventListener('click', approveItem);
$('editBtn').addEventListener('click', () => setState('Review', true, 'Edit mode opened'));
$('holdBtn').addEventListener('click', () => setState('Blocked', true, 'Held / blocked'));
$('sendBtn').addEventListener('click', sendItem);
$('archiveBtn').addEventListener('click', archiveItem);
['itemType', 'itemTitle', 'itemContent'].forEach(id => $(id).addEventListener('input', () => {
  captureItem();
  if (['Sent', 'Archived'].includes(state.current)) state.current = 'New';
  setItemLocation();
  updateContinuity('Item edited', `${state.item.title} updated. Current location: ${state.item.location}.`);
  updateReviewCopy();
  render();
}));


$('openAddItemBtn').addEventListener('click', openAddItemModal);
$('closeAddItemBtn').addEventListener('click', closeAddItemModal);
$('cancelAddItemBtn').addEventListener('click', closeAddItemModal);
$('createAddItemBtn').addEventListener('click', createItemFromModal);
$('addItemModal').addEventListener('click', (event) => { if (event.target.id === 'addItemModal') closeAddItemModal(); });
document.querySelectorAll('#modalTypeGrid button').forEach(button => {
  button.addEventListener('click', () => {
    modalSelectedType = button.dataset.type;
    document.querySelectorAll('#modalTypeGrid button').forEach(btn => btn.classList.toggle('active', btn === button));
  });
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('addItemModal').classList.contains('open')) closeAddItemModal(); });

document.querySelectorAll('[data-main-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.mainAction;
    if (action === 'approve') approveItem();
    if (action === 'deploy') sendItem();
    if (action === 'hold') setState('Blocked', true, 'Held / blocked');
    if (action === 'rollback') { state.item.channel = 'Deployments'; setState('Review', true, 'Rollback review opened'); }
  });
});

async function initWcc() {
  updateReviewCopy();
  render();
  await loadFromBackend();
  updateReviewCopy();
  render();
}

initWcc();
