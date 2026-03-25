(function () {
  'use strict';

  const state = {
    payload: null,
    strategicIndex: 0,
  };

  const els = {
    lastUpdated: document.getElementById('ceoLastUpdated'),
    hero: document.getElementById('ceoHero'),
    heroStatus: document.getElementById('ceoHeroStatus'),
    summaryStrip: document.getElementById('ceoSummaryStrip'),
    pulseGrid: document.getElementById('ceoPulseGrid'),
    todayContent: document.getElementById('ceoTodayContent'),
    todayMeta: document.getElementById('ceoTodayMeta'),
    systemMap: document.getElementById('ceoSystemMap'),
    workspaceContent: document.getElementById('ceoWorkspaceContent'),
    strategicTabs: document.getElementById('ceoStrategicTabs'),
    strategicPanel: document.getElementById('ceoStrategicPanel'),
    velocityGrid: document.getElementById('ceoVelocityGrid'),
    forgeDrawer: document.getElementById('ceoForgeDrawer'),
    forgeTools: document.getElementById('ceoForgeTools'),
    forgeOverlay: document.getElementById('ceoForgeOverlay'),
    refreshBtn: document.getElementById('ceoRefreshBtn'),
    forgeBtn: document.getElementById('ceoForgeBtn'),
    forgeClose: document.getElementById('ceoForgeClose'),
    forgeForm: document.getElementById('ceoForgeForm'),
    forgeTool: document.getElementById('ceoForgeTool'),
    forgeTitle: document.getElementById('ceoForgeTitle'),
    forgeNotes: document.getElementById('ceoForgeNotes'),
    forgeSubmit: document.getElementById('ceoForgeSubmit'),
    forgeStatus: document.getElementById('ceoForgeStatus'),
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toneLabel(tone) {
    if (tone === 'critical') return 'Critical';
    if (tone === 'warning') return 'Warning';
    if (tone === 'healthy') return 'Healthy';
    if (tone === 'fresh') return 'Fresh';
    if (tone === 'aging') return 'Aging';
    if (tone === 'stale') return 'Stale';
    return 'Info';
  }

  function toneClass(tone) {
    if (tone === 'critical' || tone === 'stale') return 'pill-red';
    if (tone === 'warning' || tone === 'aging') return 'pill-amber';
    if (tone === 'healthy' || tone === 'fresh') return 'pill-green';
    if (tone === 'next') return 'pill-blue';
    return 'pill-purple';
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function buildMainAppUrl(item = {}) {
    const params = new URLSearchParams();
    if (item.targetView) params.set('view', item.targetView);
    if (item.owner) params.set('owner', item.owner);
    if (item.focusArea) params.set('focusArea', item.focusArea);
    if (item.mode) params.set('mode', item.mode);
    const query = params.toString();
    return query ? `/?${query}` : '/';
  }

  function renderJumpLink(item, label = 'Open in Main App') {
    if (!item || !item.targetView) return '';
    return `<a class="btn-ghost btn-sm" href="${escapeHtml(buildMainAppUrl(item))}">${escapeHtml(label)}</a>`;
  }

  function formatCalendarTimeRange(item) {
    if (!item || !item.start) return 'No time';
    const start = new Date(item.start);
    if (Number.isNaN(start.getTime())) return item.start;
    const startLabel = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (!item.end) return startLabel;
    const end = new Date(item.end);
    if (Number.isNaN(end.getTime())) return startLabel;
    return `${startLabel} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  function renderList(items, renderItem, emptyLabel) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="ceo-empty">${escapeHtml(emptyLabel)}</div>`;
    }
    return items.map(renderItem).join('');
  }

  function renderSummary(payload) {
    els.summaryStrip.innerHTML = renderList(
      payload.heroMetrics,
      (item) => `
        <article class="metric-card ceo-summary-card">
          <div class="metric-card-label">${escapeHtml(item.label)}</div>
          <div class="metric-card-value">${escapeHtml(String(item.value))}</div>
          <span class="pill ${toneClass(item.tone)}">${escapeHtml(toneLabel(item.tone))}</span>
        </article>
      `,
      'No executive summary metrics available.',
    );
  }

  function renderPulse(payload) {
    const pulse = payload.pulseBar || {};
    const focusAreas = renderList(
      pulse.focusAreaHealth,
      (item) => `
        <div class="ceo-dot-card">
          <span class="ceo-health-dot ceo-health-dot--${escapeHtml(item.tone)}"></span>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="ceo-muted">${escapeHtml(item.health)}</div>
          </div>
        </div>
      `,
      'No focus areas available yet.',
    );

    const teamLoad = renderList(
      pulse.teamLoad && pulse.teamLoad.people,
      (person) => `
        <div class="ceo-mini-row">
          <span>${escapeHtml(person.name)}</span>
          <span class="pill ${toneClass(person.tone)}">${escapeHtml(String(person.openCount))} open</span>
        </div>
      `,
      'No team-load data available.',
    );

    const systemHealth = pulse.systemHealth || {};
    const cadence = pulse.cadence || {};

    els.pulseGrid.innerHTML = `
      <article class="metric-card ceo-pulse-card">
        <div class="metric-card-label">Focus Area Health</div>
        <div class="ceo-dot-grid">${focusAreas}</div>
      </article>
      <article class="metric-card ceo-pulse-card">
        <div class="metric-card-label">Overdue Badge</div>
        <div class="metric-card-value">${escapeHtml(String(pulse.overdueBadge?.count || 0))}</div>
        <div class="ceo-mini-list">
          ${renderList(
            pulse.overdueBadge && pulse.overdueBadge.items,
            (item) => `<div class="ceo-mini-line"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.owner || 'Unassigned')}</span>${renderJumpLink(item, 'Open')}</div>`,
            'No overdue items.',
          )}
        </div>
      </article>
      <article class="metric-card ceo-pulse-card">
        <div class="metric-card-label">Decisions Pending Rationale</div>
        <div class="metric-card-value">${escapeHtml(String(pulse.decisionsPendingRationale?.count || 0))}</div>
        <div class="ceo-mini-list">
          ${renderList(
            pulse.decisionsPendingRationale && pulse.decisionsPendingRationale.items,
            (item) => `<div class="ceo-mini-line"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.date || 'No date')}</span>${renderJumpLink(item, 'Open')}</div>`,
            'No rationale gaps right now.',
          )}
        </div>
      </article>
      <article class="metric-card ceo-pulse-card">
        <div class="metric-card-label">Team Load</div>
        <div class="ceo-mini-list">${teamLoad}</div>
      </article>
      <article class="metric-card ceo-pulse-card">
        <div class="metric-card-label">System Health</div>
        <div class="ceo-system-health">
          <span class="pill ${toneClass(systemHealth.status)}">${escapeHtml(toneLabel(systemHealth.status))}</span>
          <p>${escapeHtml(systemHealth.message || 'System health summary unavailable.')}</p>
          <div class="ceo-muted">Last session: ${escapeHtml(systemHealth.lastSessionAgeHours != null ? `${systemHealth.lastSessionAgeHours}h ago` : 'Unknown')}</div>
        </div>
      </article>
      <article class="metric-card ceo-pulse-card">
        <div class="metric-card-label">Cadence Clock</div>
        <div class="metric-card-value">${escapeHtml(cadence.label || 'Open')}</div>
        <div class="ceo-muted">${escapeHtml(cadence.window || '')}</div>
        <p class="ceo-card-copy">${escapeHtml(cadence.description || '')}</p>
      </article>
    `;
  }

  function renderToday(payload) {
    const today = payload.today || {};
    const morningBrief = today.morningBrief || {};

    els.todayMeta.textContent = today.reviewQueue && today.reviewQueue.length
      ? `${today.reviewQueue.length} pending`
      : 'Live';

    const briefSections = renderList(
      morningBrief.sections,
      (section) => `
        <div class="ceo-subcard">
          <div class="ceo-subhead">${escapeHtml(section.title)}</div>
          <ul class="ceo-list">
            ${(section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `,
      'Morning brief sections will appear here.',
    );

    els.todayContent.innerHTML = `
      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Morning Brief</h3>
          <span class="pill pill-blue">${escapeHtml(morningBrief.source || 'Live')}</span>
        </div>
        <p class="ceo-card-copy">${escapeHtml(morningBrief.headline || 'Morning brief unavailable.')}</p>
        ${briefSections}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Review Queue</h3>
          <span class="pill">${escapeHtml(String(today.reviewQueue?.length || 0))}</span>
        </div>
        ${renderList(
          today.reviewQueue,
          (item) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <div class="ceo-muted">${escapeHtml(item.type)} · ${escapeHtml(formatDate(item.createdAt))}</div>
              </div>
              <div class="ceo-chip-row">
                <a class="btn-ghost btn-sm" href="/?view=docs">Open</a>
                <span class="pill pill-blue">Approve</span>
                <span class="pill">Edit</span>
              </div>
            </article>
          `,
          'No pending outputs in `outputs/` yet.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Brain Dump Inbox</h3>
          <span class="pill pill-purple">${escapeHtml(String(today.brainDumpInbox?.length || 0))}</span>
        </div>
        ${renderList(
          today.brainDumpInbox,
          (item) => `
            <article class="ceo-item-card">
              <div>${escapeHtml(item.text)}</div>
              ${renderJumpLink(item, 'Triage')}
            </article>
          `,
          'No parked inputs in the inbox right now.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Decisions To Validate</h3>
          <span class="pill pill-amber">${escapeHtml(String(today.decisionsToValidate?.length || 0))}</span>
        </div>
        ${renderList(
          today.decisionsToValidate,
          (item) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <div class="ceo-muted">${escapeHtml(item.date || 'No date')} · rationale ${escapeHtml(item.rationale || 'TBD')}</div>
              </div>
              <div class="ceo-chip-row">
                ${renderJumpLink(item, 'Open')}
                <span class="pill pill-amber">Confirm</span>
              </div>
            </article>
          `,
          'No decisions are waiting for rationale right now.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Calendar</h3>
          <span class="pill ${today.calendar?.available ? 'pill-green' : 'pill-amber'}">${today.calendar?.available ? 'Connected' : 'Pending'}</span>
        </div>
        <p class="ceo-card-copy">${escapeHtml(today.calendar?.message || 'No calendar data available.')}</p>
        ${renderList(
          today.calendar && today.calendar.items,
          (item) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <div class="ceo-muted">${escapeHtml(formatCalendarTimeRange(item))}</div>
              </div>
              <div class="ceo-chip-row">
                <span class="pill">${escapeHtml(item.source || 'calendar')}</span>
                ${renderJumpLink(item, 'Open')}
              </div>
            </article>
          `,
          'No calendar blocks for today.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Delegation Alerts</h3>
          <span class="pill pill-purple">${escapeHtml(String(today.delegationAlerts?.length || 0))}</span>
        </div>
        ${renderList(
          today.delegationAlerts,
          (item) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <div class="ceo-muted">${escapeHtml(item.reason)}</div>
              </div>
              <div class="ceo-chip-row">
                <span class="pill">${escapeHtml(item.suggestedOwner || 'Route')}</span>
                ${renderJumpLink(item, 'Open')}
              </div>
            </article>
          `,
          'No delegation alerts right now.',
        )}
      </section>
    `;
  }

  function renderSystemMap(payload) {
    const systemMap = payload.systemMap || {};
    const nodes = renderList(
      systemMap.nodes,
      (node) => `
            <article class="ceo-node-card">
              <div class="ceo-node-top">
                <div>
                  <strong>${escapeHtml(node.label)}</strong>
                  <div class="ceo-muted">${escapeHtml(node.domain)}</div>
                </div>
                <span class="pill ${toneClass(node.tone)}">${escapeHtml(toneLabel(node.tone))}</span>
              </div>
              <div class="ceo-node-metric">${escapeHtml(node.metric || '')}</div>
              <div class="ceo-muted">${escapeHtml(node.note || '')}</div>
              <div class="ceo-node-actions">
                ${renderJumpLink(node, 'Open')}
              </div>
            </article>
          `,
      'No system map nodes available yet.',
    );

    const edges = renderList(
      systemMap.edges,
      (edge) => `<div class="ceo-mini-line"><strong>${escapeHtml(edge.from)}</strong> → <strong>${escapeHtml(edge.to)}</strong><span>${escapeHtml(edge.label)}</span></div>`,
      'No active routing edges available.',
    );

    const focusAreas = renderList(
      systemMap.focusAreas,
      (item) => `<a class="pill ${toneClass(item.tone)} ceo-chip-link" href="${escapeHtml(buildMainAppUrl(item))}">${escapeHtml(item.name)}</a>`,
      'No focus areas available.',
    );

    els.systemMap.innerHTML = `
      <div class="ceo-node-grid">${nodes}</div>
      <div class="ceo-map-meta">
        <section class="ceo-subcard">
          <div class="ceo-subhead">Active Delegation Edges</div>
          <div class="ceo-mini-list">${edges}</div>
        </section>
        <section class="ceo-subcard">
          <div class="ceo-subhead">Tracked Focus Areas</div>
          <div class="ceo-chip-row">${focusAreas}</div>
        </section>
        <section class="ceo-subcard">
          <div class="ceo-subhead">Routing Notes</div>
          <ul class="ceo-list">
            ${(systemMap.routingNotes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </section>
      </div>
    `;
  }

  function renderWorkspace(payload) {
    const workspace = payload.workspace || {};

    els.workspaceContent.innerHTML = `
      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Active Agents</h3>
          <span class="pill">${escapeHtml(String(workspace.activeAgents?.length || 0))}</span>
        </div>
        ${renderList(
          workspace.activeAgents,
          (agent) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(agent.name)}</strong>
                <div class="ceo-muted">${escapeHtml(agent.summary)}</div>
              </div>
              <span class="pill pill-blue">${escapeHtml(agent.status || 'Defined')}</span>
            </article>
          `,
          'No agent definitions found.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Recent Actions</h3>
          <span class="pill pill-green">${escapeHtml(String(workspace.recentActions?.length || 0))}</span>
        </div>
        ${renderList(
          workspace.recentActions,
          (item) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(item.action)}</strong>
                <div class="ceo-muted">${escapeHtml(item.agent)} · ${escapeHtml(item.timestamp)}</div>
              </div>
              <div class="ceo-muted">${escapeHtml(item.details || item.pending || '')}</div>
              ${renderJumpLink(item, 'Open')}
            </article>
          `,
          'No recent actions logged.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Session Handoff</h3>
          <span class="pill pill-purple">${escapeHtml(workspace.sessionHandoff?.lastSession || 'Current')}</span>
        </div>
        <div class="ceo-subcard">
          <div class="ceo-subhead">Current State</div>
          <ul class="ceo-list">
            ${(workspace.sessionHandoff?.currentState || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="ceo-subcard">
          <div class="ceo-subhead">Key Decisions</div>
          <ul class="ceo-list">
            ${(workspace.sessionHandoff?.keyDecisions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="ceo-subcard">
          <div class="ceo-subhead">Next Steps</div>
          <ul class="ceo-list">
            ${(workspace.sessionHandoff?.nextSteps || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Pending Outputs</h3>
          <span class="pill">${escapeHtml(String(workspace.pendingOutputs?.length || 0))}</span>
        </div>
        ${renderList(
          workspace.pendingOutputs,
          (item) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <div class="ceo-muted">${escapeHtml(item.type)} · ${escapeHtml(item.path)}</div>
              </div>
              <a class="btn-ghost btn-sm" href="/?view=docs">Open</a>
            </article>
          `,
          'No pending outputs found.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Knowledge Staleness</h3>
          <span class="pill pill-amber">${escapeHtml(String(workspace.knowledgeStaleness?.length || 0))}</span>
        </div>
        ${renderList(
          workspace.knowledgeStaleness,
          (item) => `
            <article class="ceo-item-card">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <div class="ceo-muted">${escapeHtml(item.path)}</div>
              </div>
              <span class="pill ${toneClass(item.status)}">${escapeHtml(`${item.ageDays}d`)}</span>
            </article>
          `,
          'No knowledge files found.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>Memory Updates</h3>
          <span class="pill">${escapeHtml(String(workspace.memoryUpdates?.length || 0))}</span>
        </div>
        ${renderList(
          workspace.memoryUpdates,
          (item) => `<div class="ceo-subcard">${escapeHtml(item.text)}</div>`,
          'No MEMORY.md changes captured yet.',
        )}
      </section>

      <section class="ceo-subsection">
        <div class="ceo-subhead-row">
          <h3>About Colin</h3>
          <span class="pill pill-blue">Operating Rules</span>
        </div>
        <div class="ceo-subcard">
          <ul class="ceo-list">
            ${(workspace.aboutColin?.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      </section>
    `;
  }

  function renderStrategicTabs(payload) {
    const sections = payload.strategic && payload.strategic.sections ? payload.strategic.sections : [];
    if (!sections.length) {
      els.strategicTabs.innerHTML = '';
      els.strategicPanel.innerHTML = '<div class="ceo-empty">No strategic documents available yet.</div>';
      return;
    }

    if (state.strategicIndex >= sections.length) state.strategicIndex = 0;

    els.strategicTabs.innerHTML = sections
      .map((section, index) => `
        <button class="btn-ghost btn-sm ${index === state.strategicIndex ? 'ceo-tab-active' : ''}" type="button" data-strategic-index="${index}">
          ${escapeHtml(section.title)}
        </button>
      `)
      .join('');

    const active = sections[state.strategicIndex];
    const decisionRegister = renderList(
      payload.strategic && payload.strategic.decisionRegister,
      (item) => `
        <article class="ceo-item-card">
          <div>
            <strong>${escapeHtml(item.decision)}</strong>
            <div class="ceo-muted">${escapeHtml(item.date)} · ${escapeHtml(item.status || 'Active')}</div>
          </div>
          <div class="ceo-muted">${escapeHtml(item.rationale)}</div>
        </article>
      `,
      'No strategic decision register available.',
    );

    els.strategicPanel.innerHTML = `
      <div class="ceo-strategic-grid">
        <section class="ceo-subcard">
          <div class="ceo-subhead-row">
            <h3>${escapeHtml(active.title)}</h3>
            <span class="pill pill-blue">${escapeHtml(active.path)}</span>
          </div>
          <ul class="ceo-list">
            ${(active.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </section>
        <section class="ceo-subcard">
          <div class="ceo-subhead">Decision Register</div>
          ${decisionRegister}
        </section>
      </div>
    `;
  }

  function renderVelocity(payload) {
    const velocity = payload.velocity || {};
    const freshness = renderList(
      velocity.knowledgeFreshness,
      (item) => `<div class="ceo-mini-row"><span>${escapeHtml(item.title)}</span><span class="pill ${toneClass(item.status)}">${escapeHtml(`${item.ageDays}d`)}</span></div>`,
      'No freshness data available.',
    );

    els.velocityGrid.innerHTML = `
      <article class="metric-card">
        <div class="metric-card-label">Decisions / 7d</div>
        <div class="metric-card-value">${escapeHtml(String(velocity.decisionsPerWeek?.value || 0))}</div>
        <div class="ceo-sparkline">${(velocity.decisionsPerWeek?.spark || []).map((value) => `<span style="height:${Math.max(6, Number(value) * 6)}px"></span>`).join('')}</div>
      </article>
      <article class="metric-card">
        <div class="metric-card-label">Commitments Flow</div>
        <div class="metric-card-value">${escapeHtml(String(velocity.commitmentsFlow?.created || 0))} / ${escapeHtml(String(velocity.commitmentsFlow?.closed || 0))}</div>
        <div class="ceo-muted">Created vs closed</div>
      </article>
      <article class="metric-card">
        <div class="metric-card-label">Avg Days Overdue</div>
        <div class="metric-card-value">${escapeHtml(String(velocity.avgDaysOverdue || 0))}</div>
        <div class="ceo-muted">Rolling executive drag</div>
      </article>
      <article class="metric-card">
        <div class="metric-card-label">Delegation Ratio</div>
        <div class="metric-card-value">${escapeHtml(String(velocity.delegationRatio?.toTeam || 0))}:${escapeHtml(String(velocity.delegationRatio?.toDan || 0))}</div>
        <div class="ceo-muted">Team vs Dan active load</div>
      </article>
      <article class="metric-card">
        <div class="metric-card-label">Session Frequency</div>
        <div class="metric-card-value">${escapeHtml(String(velocity.sessionFrequency?.count || 0))}</div>
        <div class="ceo-chip-row">
          ${(velocity.sessionFrequency?.timeline || []).map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}
        </div>
      </article>
      <article class="metric-card">
        <div class="metric-card-label">Knowledge Freshness</div>
        <div class="ceo-mini-list">${freshness}</div>
      </article>
      <article class="metric-card">
        <div class="metric-card-label">Handoff Completeness</div>
        <div class="metric-card-value">${escapeHtml(String(velocity.handoffCompleteness?.delivered || 0))}</div>
        <div class="ceo-muted">${escapeHtml(String(velocity.handoffCompleteness?.pending || 0))} pending review loops</div>
      </article>
    `;
  }

  function renderForge(payload) {
    const forge = payload.forge || {};
    els.forgeTools.innerHTML = renderList(
      forge.tools,
      (tool) => `
        <article class="ceo-forge-card">
          <div class="ceo-subhead-row">
            <h3>${escapeHtml(tool.title)}</h3>
            <span class="pill ${toneClass(tool.status)}">${escapeHtml(tool.status)}</span>
          </div>
          <p class="ceo-card-copy">${escapeHtml(tool.description)}</p>
        </article>
      `,
      'No forge tools configured yet.',
    );
  }

  function render(payload) {
    state.payload = payload;

    const healthStatus = payload.pulseBar && payload.pulseBar.systemHealth
      ? payload.pulseBar.systemHealth.status
      : 'healthy';

    els.hero.classList.remove('mktops-hero--healthy', 'mktops-hero--warning', 'mktops-hero--critical');
    els.hero.classList.add(`mktops-hero--${healthStatus === 'warning' ? 'warning' : healthStatus === 'critical' ? 'critical' : 'healthy'}`);
    els.heroStatus.textContent = toneLabel(healthStatus);
    els.lastUpdated.textContent = `Updated ${formatRelativeTime(payload.timestamp)}`;

    renderPulse(payload);
    renderSummary(payload);
    renderToday(payload);
    renderSystemMap(payload);
    renderWorkspace(payload);
    renderStrategicTabs(payload);
    renderVelocity(payload);
    renderForge(payload);
  }

  function setLoadingState(message) {
    els.lastUpdated.textContent = message;
  }

  function setErrorState(message) {
    els.heroStatus.textContent = 'Error';
    els.hero.classList.remove('mktops-hero--healthy');
    els.hero.classList.add('mktops-hero--critical');
    els.lastUpdated.textContent = message;
  }

  async function loadDashboard() {
    setLoadingState('Loading CEO dashboard…');
    try {
      const response = await fetch('/api/ceo-dashboard', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      render(payload);
    } catch (err) {
      setErrorState('Failed to load CEO dashboard');
      console.error('CEO dashboard load failed:', err);
    }
  }

  async function submitForgeDraft(event) {
    event.preventDefault();
    const toolId = els.forgeTool.value;
    const title = els.forgeTitle.value.trim();
    const notes = els.forgeNotes.value.trim();

    els.forgeSubmit.disabled = true;
    els.forgeStatus.textContent = 'Creating draft…';

    try {
      const response = await fetch('/api/ceo-dashboard/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          toolId,
          title,
          topic: title,
          notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);

      els.forgeStatus.textContent = `Saved to ${payload.path}`;
      els.forgeNotes.value = '';
      els.forgeTitle.value = '';
      await loadDashboard();
    } catch (err) {
      console.error('CEO forge create failed:', err);
      els.forgeStatus.textContent = `Failed: ${err.message}`;
    } finally {
      els.forgeSubmit.disabled = false;
    }
  }

  function openForge() {
    els.forgeDrawer.classList.add('is-open');
    els.forgeDrawer.setAttribute('aria-hidden', 'false');
    els.forgeOverlay.hidden = false;
  }

  function closeForge() {
    els.forgeDrawer.classList.remove('is-open');
    els.forgeDrawer.setAttribute('aria-hidden', 'true');
    els.forgeOverlay.hidden = true;
  }

  document.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-strategic-index]');
    if (tabButton && state.payload) {
      state.strategicIndex = Number(tabButton.getAttribute('data-strategic-index')) || 0;
      renderStrategicTabs(state.payload);
    }
  });

  els.refreshBtn.addEventListener('click', loadDashboard);
  els.forgeBtn.addEventListener('click', openForge);
  els.forgeClose.addEventListener('click', closeForge);
  els.forgeOverlay.addEventListener('click', closeForge);
  els.forgeForm.addEventListener('submit', submitForgeDraft);

  loadDashboard();
}());
