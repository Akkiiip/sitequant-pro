/* Phase 1 sample workspace. No sample quantity is a calculation or an approval. */
window.SiteQuant.dashboard = (() => {
  const { escape: html, icon, notify } = window.SiteQuant.ui;
  const storageKey = 'sitequant.local-projects.v1';
  const samples = [
    { id: 'riverside', code: 'SQ-024', name: 'Riverside Residence', location: 'Pune, Maharashtra', block: 'Block A', structure: 'RCC frame', bbs: 64, boq: 28, weight: 12.48, reviewed: 48, pending: 2, updated: '4 min ago', status: 'In progress' },
    { id: 'westend', code: 'SQ-023', name: 'Westend Commercial', location: 'Mumbai, Maharashtra', block: 'Tower 01', structure: 'RCC frame', bbs: 38, boq: 19, weight: 8.16, reviewed: 28, pending: 1, updated: '38 min ago', status: 'In review' },
    { id: 'greenfield', code: 'SQ-021', name: 'Greenfield School', location: 'Nashik, Maharashtra', block: 'Academic block', structure: 'RCC frame', bbs: 22, boq: 14, weight: 4.22, reviewed: 16, pending: 0, updated: '2 hours ago', status: 'In progress' },
  ];
  const reviews = [
    { id: 'review-1', project: 'riverside', mark: 'B12-01', member: 'Beam · Level 02', description: 'Bottom main reinforcement', reason: 'Confirm anchorage at the end support.', owner: 'AP', age: '12 min ago' },
    { id: 'review-2', project: 'riverside', mark: 'C04-02', member: 'Column · Level 01', description: 'Column starter bars', reason: 'Verify lap length against the structural drawing.', owner: 'RK', age: '46 min ago' },
    { id: 'review-3', project: 'westend', mark: 'S02-08', member: 'Slab · Level 03', description: 'Distribution reinforcement', reason: 'Check the cover and spacing in the revised bay.', owner: 'AP', age: '1 hour ago' },
  ];
  const exports = [
    { id: 'export-1', project: 'riverside', type: 'BBS CSV', code: 'RVR-A-BBS-003', date: 'Today, 10:42', label: 'Example export' },
    { id: 'export-2', project: 'westend', type: 'BOQ CSV', code: 'WEC-01-BOQ-002', date: 'Yesterday, 16:15', label: 'Example export' },
  ];

  let localProjects = [];
  let selectedId = 'all';
  let rerender = () => {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) {
      localProjects = saved.filter(p => p && /^local-[a-z0-9-]+$/i.test(p.id) && typeof p.name === 'string').slice(0, 100).map(p => ({
        id: p.id, name: p.name.slice(0, 80), code: 'LOCAL', location: String(p.location || '').slice(0, 80),
        block: String(p.block || '').slice(0, 50), structure: String(p.structure || 'RCC frame').slice(0, 50),
        bbs: 0, boq: 0, weight: 0, reviewed: 0, pending: 0, updated: 'Local draft', status: 'Draft', local: true,
      }));
    }
  } catch { /* Browser storage can be disabled. The workspace still works in memory. */ }

  const projects = () => [...localProjects, ...samples];
  const visibleProjects = () => projects().filter(p => selectedId === 'all' || selectedId === p.id);
  const projectById = id => projects().find(p => p.id === id);
  const filtered = records => records.filter(r => selectedId === 'all' || r.project === selectedId);
  const number = value => Number(value).toLocaleString('en-IN');

  function projectRow(p) {
    const statusClass = p.pending ? 'sq-badge--review' : 'sq-badge--neutral';
    return `<tr>
      <td><button class="sq-project-link" data-project-detail="${html(p.id)}"><span class="sq-project-symbol">${icon('projects')}</span><span><strong>${html(p.name)}</strong><small>${html(p.code)} <span aria-hidden="true">/</span> ${html(p.location || 'Location not set')}</small></span></button></td>
      <td><span>${html(p.block || 'Not assigned')}</span><small>${html(p.structure)}</small></td>
      <td class="sq-numeric"><strong>${p.bbs}</strong><small>${p.boq} BOQ items</small></td>
      <td><span class="sq-badge ${statusClass}">${html(p.status)}</span><small>${html(p.updated)}${p.local ? '' : ' · sample'}</small></td>
      <td><button class="sq-icon-button" data-project-detail="${html(p.id)}" aria-label="Open ${html(p.name)}">${icon('chevron')}</button></td>
    </tr>`;
  }

  function reviewRow(record) {
    const p = projectById(record.project);
    return `<li class="sq-review-item"><span class="sq-review-mark">${icon('review')}</span><div class="sq-review-copy"><div><strong class="sq-mono">${record.mark}</strong><span class="sq-review-member">${record.member}</span></div><p>${record.reason}</p><small>${html(p.name)} <span aria-hidden="true">·</span> ${record.age} · sample</small></div><button class="sq-button sq-button--small sq-button--secondary" data-review="${record.id}">Inspect ${icon('arrow')}</button></li>`;
  }

  function render() {
    const visible = visibleProjects();
    const total = key => visible.reduce((sum, p) => sum + p[key], 0);
    const counts = { bbs: total('bbs'), reviewed: total('reviewed'), pending: total('pending') };
    const drafts = counts.bbs - counts.reviewed - counts.pending;
    const percent = amount => counts.bbs ? Math.round(amount / counts.bbs * 100) : 0;
    const reviewItems = filtered(reviews);
    const exportItems = filtered(exports);
    return `<section class="sq-dashboard" aria-labelledby="sq-overview-title">
      <div class="sq-page-heading"><div><p class="sq-eyebrow">YOUR WORKSPACE, AT A GLANCE</p><h1 id="sq-overview-title">Workspace overview</h1><p>Keep quantities moving. Know what needs your attention.</p></div><button class="sq-button sq-button--primary" data-new-project>${icon('plus')} New project</button></div>

      <div class="sq-context-bar"><label class="sq-project-filter">${icon('projects')}<span class="sq-sr-only">Filter workspace by project</span><select id="sq-project-filter"><option value="all" ${selectedId === 'all' ? 'selected' : ''}>All projects</option>${projects().map(p => `<option value="${html(p.id)}" ${selectedId === p.id ? 'selected' : ''}>${html(p.name)}</option>`).join('')}</select></label><span class="sq-context-caption">${visible.length} project${visible.length === 1 ? '' : 's'} in view</span><span class="sq-snapshot-label">Sample activity · 10 Sep 2026</span></div>

      <div class="sq-workflow" aria-label="Engineering workflow"><span>Project</span><span aria-hidden="true">/</span><span>Members</span><span aria-hidden="true">/</span><span>BBS</span><span aria-hidden="true">/</span><strong>Engineering review</strong><span aria-hidden="true">/</span><span>BOQ</span><span aria-hidden="true">/</span><span>Export</span></div>

      <div class="sq-summary-strip" aria-label="Project quantity summary">
        <div><span>BBS records</span><strong>${number(counts.bbs)}<small>items</small></strong><p>Across ${visible.length} project${visible.length === 1 ? '' : 's'}</p></div>
        <div><span>Scheduled reinforcement</span><strong>${total('weight').toFixed(2)}<small>tonnes</small></strong><p>Illustrative BBS quantities</p></div>
        <div><span>Awaiting review</span><strong>${counts.pending}<small>records</small></strong><p>${counts.pending ? 'Engineering checks outstanding' : 'No pending sample items'}</p></div>
        <div><span>Export activity</span><strong>${exportItems.length}<small>files</small></strong><p>Sample workspace history</p></div>
      </div>

      <div class="sq-dashboard-grid">
        <section class="sq-surface sq-projects-surface" aria-labelledby="sq-recent-title">
          <div class="sq-section-heading"><div><h2 id="sq-recent-title">Recent projects <span class="sq-count">${visible.length}</span></h2><p>Pick up where your team left off.</p></div><a class="sq-text-link" href="#/projects">Project workspace ${icon('arrow')}</a></div>
          <div class="sq-table-scroll" tabindex="0" role="region" aria-label="Recent projects table"><table class="sq-project-table"><thead><tr><th scope="col">PROJECT</th><th scope="col">STRUCTURE</th><th scope="col" class="sq-numeric">BBS ITEMS</th><th scope="col">STATUS / UPDATED</th><th scope="col"><span class="sq-sr-only">Open</span></th></tr></thead><tbody>${visible.slice(0, 6).map(projectRow).join('')}</tbody></table></div>
          <div class="sq-table-foot"><span>${visible.length > 6 ? `Showing 6 of ${visible.length} projects. Use the selector to open any project.` : 'Sample records and your browser-local drafts.'}</span><button class="sq-text-link" data-new-project>${icon('plus')} Add project</button></div>
        </section>

        <section class="sq-surface sq-quantity-surface" aria-labelledby="sq-quantity-title"><div class="sq-section-heading"><h2 id="sq-quantity-title">BBS progress</h2>${icon('bbs')}</div><div class="sq-progress-total"><strong>${counts.reviewed}<span>/ ${counts.bbs}</span></strong><span>records reviewed <small>sample status</small></span></div><div class="sq-progress-track" role="img" aria-label="${counts.reviewed} reviewed, ${counts.pending} awaiting review, ${drafts} in preparation"><span class="sq-progress-reviewed" style="flex:${counts.reviewed}"></span><span class="sq-progress-pending" style="flex:${counts.pending}"></span><span class="sq-progress-draft" style="flex:${drafts || (counts.bbs ? 0 : 1)}"></span></div><dl class="sq-progress-legend"><div><dt><span class="sq-legend-dot sq-legend-dot--reviewed"></span>Reviewed</dt><dd>${counts.reviewed}<small>${percent(counts.reviewed)}%</small></dd></div><div><dt><span class="sq-legend-dot sq-legend-dot--pending"></span>Awaiting review</dt><dd>${counts.pending}<small>${percent(counts.pending)}%</small></dd></div><div><dt><span class="sq-legend-dot sq-legend-dot--draft"></span>In preparation</dt><dd>${drafts}<small>${percent(drafts)}%</small></dd></div></dl><p class="sq-panel-note">Sample statuses are not engineering approvals.</p></section>

        <section class="sq-surface sq-review-surface" id="sq-review-queue" tabindex="-1" aria-labelledby="sq-review-title"><div class="sq-section-heading"><div><h2 id="sq-review-title">Needs your review <span class="sq-count sq-count--review">${reviewItems.length}</span></h2><p>Resolve these checks before issuing a schedule.</p></div><span class="sq-section-kicker">NEXT UP</span></div>${reviewItems.length ? `<ul class="sq-review-list">${reviewItems.map(reviewRow).join('')}</ul>` : `<div class="sq-empty-state">${icon('check')}<h3>No review items in this view</h3><p>${counts.bbs ? 'This sample project has no outstanding checks.' : 'Start with a project member and a BBS calculation.'}</p><a class="sq-text-link" href="#/bbs">Open BBS workspace ${icon('arrow')}</a></div>`}</section>

        <section class="sq-surface sq-export-surface" aria-labelledby="sq-export-title"><div class="sq-section-heading"><h2 id="sq-export-title">Recent exports</h2>${icon('exports')}</div>${exportItems.length ? `<ul class="sq-export-list">${exportItems.map(e => `<li><span class="sq-file-symbol">${icon('file')}</span><div><button class="sq-record-link" data-export-detail="${e.id}">${e.type} ${icon('arrow')}</button><p>${html(projectById(e.project).name)}</p><small>${e.date} · sample</small></div></li>`).join('')}</ul>` : '<p class="sq-panel-note">No export activity for this project yet.</p>'}<a class="sq-surface-link" href="#/exports">Open export workspace ${icon('arrow')}</a></section>
      </div>

      <section class="sq-quick-actions" aria-label="Quick actions"><div><p class="sq-eyebrow">KEEP WORK MOVING</p><h2>Start the next step.</h2></div><a href="#/bbs">${icon('bbs')}<span>New BBS calculation<small>Open the engineering workspace</small></span>${icon('arrow')}</a><a href="#/boq">${icon('boq')}<span>Open quantity register<small>Continue the BOQ workflow</small></span>${icon('arrow')}</a><button data-action="review-queue">${icon('review')}<span>Inspect review queue<small>Check the outstanding items</small></span>${icon('arrow')}</button></section>
    </section>`;
  }

  function details(title, content) {
    document.getElementById('sq-detail-title').textContent = title;
    document.getElementById('sq-detail-content').innerHTML = content;
    document.getElementById('sq-detail-dialog').showModal();
  }

  function openProject(id) {
    const p = projectById(id);
    if (!p) return;
    details(p.name, `<p class="sq-dialog-description">${html(p.code)} · ${p.local ? 'Browser-local draft' : 'Sample project'}</p><dl class="sq-record-facts"><div><dt>Location</dt><dd>${html(p.location || 'Not set')}</dd></div><div><dt>Structure</dt><dd>${html(p.block || 'Not assigned')} · ${html(p.structure)}</dd></div><div><dt>Quantities</dt><dd>${p.bbs} BBS records · ${p.boq} BOQ items</dd></div><div><dt>Review</dt><dd>${p.pending} outstanding checks</dd></div></dl><p class="sq-notice">${p.local ? 'This project is saved only in this browser. Member and schedule management will be added in a later phase.' : 'This is sample project activity, not a construction-issue record.'}</p><div class="sq-dialog-actions"><button class="sq-button sq-button--primary" data-project-select="${html(p.id)}">View project overview ${icon('arrow')}</button></div>`);
  }

  function init(onChange) {
    rerender = onChange;
    document.addEventListener('click', event => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.hasAttribute('data-new-project')) {
        document.getElementById('sq-project-form').reset();
        document.getElementById('sq-project-dialog').showModal();
        document.getElementById('sq-project-form').elements.name.focus();
      }
      if (target.dataset.projectDetail) openProject(target.dataset.projectDetail);
      if (target.dataset.projectSelect) {
        selectedId = target.dataset.projectSelect;
        document.getElementById('sq-detail-dialog').close();
        rerender();
        document.getElementById('view').focus({ preventScroll: true });
      }
      if (target.dataset.action === 'review-queue') {
        const queue = document.getElementById('sq-review-queue');
        queue?.scrollIntoView({ block: 'center' });
        queue?.focus({ preventScroll: true });
      }
      if (target.dataset.review) {
        const r = reviews.find(record => record.id === target.dataset.review);
        if (!r) return;
        details(`${r.mark} · Review required`, `<p class="sq-dialog-description">${html(projectById(r.project).name)} / ${r.member}</p><h3>${r.description}</h3><p>${r.reason}</p><p class="sq-notice">Illustrative review item. Validate against the structural drawings, selected standard, and project requirements. This interface cannot approve a calculation for construction.</p><div class="sq-dialog-actions"><button class="sq-button sq-button--secondary" data-close-dialog>Back to overview</button></div>`);
      }
      if (target.dataset.exportDetail) {
        const e = exports.find(record => record.id === target.dataset.exportDetail);
        if (!e) return;
        details(e.type, `<p class="sq-dialog-description">${html(projectById(e.project).name)}</p><dl class="sq-record-facts"><div><dt>Reference</dt><dd class="sq-mono">${e.code}</dd></div><div><dt>Created</dt><dd>${e.date} · sample snapshot</dd></div><div><dt>Status</dt><dd>${e.label}</dd></div></dl><p class="sq-notice">This activity is an example, not a stored file. To export real calculated values, use Export CSV in the current BBS workspace.</p><div class="sq-dialog-actions"><a href="#/bbs" class="sq-button sq-button--primary">Open BBS workspace ${icon('arrow')}</a></div>`);
      }
    });
    document.addEventListener('change', event => {
      if (event.target.id !== 'sq-project-filter') return;
      selectedId = event.target.value;
      rerender();
      document.getElementById('sq-project-filter')?.focus();
    });
    const form = document.getElementById('sq-project-form');
    form.addEventListener('input', () => form.elements.name.setCustomValidity(''));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const fields = new FormData(form);
      const name = fields.get('name').trim();
      if (!name) {
        form.elements.name.setCustomValidity('Enter a project name.');
        form.elements.name.reportValidity();
        return;
      }
      const p = { id: `local-${crypto.randomUUID()}`, code: 'LOCAL', name, location: fields.get('location').trim(), block: fields.get('block').trim(), structure: fields.get('structure'), bbs: 0, boq: 0, weight: 0, reviewed: 0, pending: 0, updated: 'Just created', status: 'Draft', local: true };
      localProjects.unshift(p);
      selectedId = p.id;
      let saved = true;
      try { localStorage.setItem(storageKey, JSON.stringify(localProjects)); } catch { saved = false; }
      document.getElementById('sq-project-dialog').close();
      rerender();
      document.getElementById('view').focus({ preventScroll: true });
      window.scrollTo(0, 0);
      notify(saved ? `${name} created. Saved in this browser only.` : `${name} created for this session. Browser storage is unavailable; this draft will be lost on reload.`);
    });
  }

  // Context accessors for workspaces; dashboard presentation remains unchanged.
  return { render, init, getProjects: () => projects().map(project => ({ ...project })), getSelectedProjectId: () => selectedId };
})();
