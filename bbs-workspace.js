/* BBS controller. Updates result/table regions without replacing active inputs. */
window.SiteQuant.bbs = (() => {
  const model = window.SiteQuant.bbsModel;
  const view = window.SiteQuant.bbsView;
  const { icon, notify, downloadCsv } = window.SiteQuant.ui;
  let root, binding, saveTimer, workspace, project;
  let projectId = 'riverside', dashboardSelection = 'all';
  let selected = new Set(), assessment, search = '', filter = 'all', sort = 'mark-asc', group = 'none';
  let pendingEditorAction = null;
  const find = selector => root?.querySelector(selector);

  function render() {
    const projects = window.SiteQuant.dashboard.getProjects();
    const preferred = window.SiteQuant.dashboard.getSelectedProjectId();
    if (preferred !== 'all' && preferred !== dashboardSelection) projectId = preferred;
    dashboardSelection = preferred;
    project = projects.find(p => p.id === projectId) || projects[0];
    projectId = project.id;
    workspace = model.workspace(projectId);
    return view.render(projects, project, workspace);
  }

  function save(announce = false) {
    clearTimeout(saveTimer);
    saveTimer = null;
    const status = model.persist();
    if (root?.isConnected) {
      find('#bbs-save-status').textContent = status.saved ? 'Saved in this browser · no cloud sync' : 'Not saved locally';
      find('#bbs-storage-notice').hidden = status.saved;
      find('#bbs-storage-notice').textContent = status.saved ? '' : status.message;
    }
    if (announce) notify(status.message);
    return status;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    find('#bbs-save-status').textContent = 'Unsaved changes · saving locally…';
    saveTimer = setTimeout(() => save(), 500);
  }

  function refreshResult() {
    assessment = model.calculate(workspace.draft);
    for (const control of root.querySelectorAll('[data-bbs-field]')) {
      if (control.validity.badInput) {
        assessment.errors[control.dataset.bbsField] = 'Enter a valid number.';
        assessment.result = null;
      }
    }
    const traceOpen = find('.bbs-trace')?.open ?? true;
    find('#bbs-result').innerHTML = view.result(assessment, workspace.draft, traceOpen);
    const valid = !!assessment.result;
    find('#bbs-calculation-state').innerHTML = view.badge(valid ? 'CALCULATED' : 'INPUT REQUIRED', valid ? 'calculated' : 'error') + view.badge('REVIEW REQUIRED', 'review');
    find('#bbs-export-current').disabled = !valid;
    find('#bbs-add-item').disabled = !valid;
    find('#bbs-add-item').innerHTML = `${icon('plus')} ${workspace.editingId ? 'Update BBS item' : 'Add BBS item'}`;
    find('#bbs-editor-mode').textContent = workspace.editingId ? 'Editing browser-local item' : 'New calculated result';
    for (const control of root.querySelectorAll('[data-bbs-field]')) {
      const message = assessment.errors[control.dataset.bbsField] || '';
      control.setAttribute('aria-invalid', String(!!message));
      find(`#bbs-${control.dataset.bbsField}-error`).textContent = message;
    }
    const count = Object.keys(assessment.errors).length;
    find('#bbs-form-feedback').textContent = count ? (assessment.errors.calculation || `${count} field${count === 1 ? '' : 's'} need attention. Export and schedule updates are paused.`) : workspace.editingId ? 'Update this item to replace its scheduled values.' : 'Add this calculation to the schedule to keep it as a row.';
    find('#bbs-direction-hint').textContent = workspace.draft.direction === 'Transverse' ? 'Bars run along breadth; distributed across length. These in-plane axes are swapped at the engine input.' : 'Bars run along length; distributed across breadth.';
    const o = assessment.result?.output;
    find('#bbs-mobile-summary').innerHTML = `<div><span>${valid ? 'CALCULATED · REVIEW REQUIRED' : 'INPUT REQUIRED'}</span><strong>${o ? `${o.totalBars} bars · ${view.format(o.totalWeightKg, 2)} kg` : 'Correct the marked inputs'}</strong></div><button type="button" class="bbs-text-action" data-bbs-action="result">View result ${icon('arrow')}</button>`;
    find('#bbs-live-status').textContent = o ? `Calculated ${o.totalBars} bars, ${o.totalWeightKg} kilograms. Engineering review required.` : 'Calculation paused. Correct the marked fields.';
  }

  function visibleRows() {
    const query = search.toLowerCase().trim();
    const rows = workspace.rows.filter(row => (filter === 'all' || row.kind === filter) && `${row.input.mark} ${row.input.memberType} ${row.input.family} ${row.input.description} ${row.input.shape} ${row.input.material}`.toLowerCase().includes(query));
    rows.sort((a, b) => {
      if (sort.startsWith('weight')) {
        const difference = model.calculate(a.input).result.output.totalWeightKg - model.calculate(b.input).result.output.totalWeightKg;
        return sort === 'weight-desc' ? -difference : difference;
      }
      if (sort === 'saved-desc') return b.savedAt.localeCompare(a.savedAt);
      const difference = a.input.mark.localeCompare(b.input.mark, undefined, { numeric: true });
      return sort === 'mark-desc' ? -difference : difference;
    });
    if (group !== 'none') rows.sort((a, b) => `${group === 'member' ? a.input.memberType : group === 'dia' ? a.input.dia : a.input.shape}|${a.input.mark}`.localeCompare(`${group === 'member' ? b.input.memberType : group === 'dia' ? b.input.dia : b.input.shape}|${b.input.mark}`, undefined, { numeric: true }));
    return rows;
  }

  function summary(rows) {
    const totals = rows.reduce((all, row) => { const o = model.calculate(row.input).result?.output; if (!o) return all; all.kg += o.totalWeightKg; all.tonnes += o.totalWeightTonnes; all.bars += o.totalBars; all.length += o.totalLengthM; return all; }, { kg: 0, tonnes: 0, bars: 0, length: 0 });
    const grouped = key => Object.entries(rows.reduce((all, row) => { const o = model.calculate(row.input).result?.output; const name = key === 'member' ? row.input.memberType : key === 'dia' ? `Ø${row.input.dia} mm` : row.input.shape; if (o) { (all[name] ||= { kg: 0, bars: 0, length: 0 }).kg += o.totalWeightKg; all[name].bars += o.totalBars; all[name].length += o.totalLengthM; } return all; }, {})).map(([name, value]) => `<li><b>${name}</b><span>${view.format(value.kg, 2)} kg · ${value.bars} bars · ${view.format(value.length)} m</span></li>`).join('') || '<li>No calculated items.</li>';
    const family = Object.entries(rows.reduce((all,row)=>{const o=model.calculate(row.input).result?.output,k=row.input.family||'Unspecified';if(o)(all[k]||={kg:0,bars:0,length:0}).kg+=o.totalWeightKg,(all[k].bars+=o.totalBars),(all[k].length+=o.totalLengthM);return all},{})).map(([k,v])=>`<li><b>${k}</b><span>${view.format(v.kg,2)} kg · ${v.bars} bars · ${view.format(v.length)} m</span></li>`).join('');
    find('#bbs-summaries').innerHTML = `<section><h3>Total reinforcement</h3><strong>${view.format(totals.kg, 2)} kg</strong><small>${view.format(totals.tonnes)} t · ${totals.bars} bars · ${view.format(totals.length)} m</small></section><details><summary>Member-wise</summary><ul>${grouped('member')}</ul></details><details><summary>Diameter-wise</summary><ul>${grouped('dia')}</ul></details><details><summary>Shape-wise</summary><ul>${grouped('shape')}</ul></details><details><summary>Family-wise</summary><ul>${family || '<li>No calculated items.</li>'}</ul></details><section class="bbs-procurement"><h3>Procurement · planned</h3><p>Calculated kg is available above. Stock lengths, wastage allowance, nesting and net requirement need deterministic optimization rules and are not estimated here.</p></section>`;
  }

  function refreshSchedule() {
    const rows = visibleRows();
    const visible = new Set(rows.map(row => row.id));
    selected = new Set([...selected].filter(id => visible.has(id)));
    find('#bbs-schedule-body').innerHTML = view.scheduleRows(rows, selected, workspace.editingId);
    summary(rows);
    find('#bbs-row-count').textContent = workspace.rows.length;
    find('#bbs-visible-count').textContent = `${rows.length} of ${workspace.rows.length} items · ${rows.filter(r => r.kind === 'local').length} local drafts in view`;
    find('#bbs-selection-label').textContent = selected.size ? `${selected.size} item${selected.size === 1 ? '' : 's'} selected in this view` : 'No items selected';
    find('#bbs-duplicate').disabled = !selected.size;
    find('#bbs-delete').disabled = !selected.size;
    find('#bbs-export-schedule').disabled = !rows.length;
    find('#bbs-export-schedule').innerHTML = `${icon('exports')} Export ${selected.size ? `selected (${selected.size})` : `view (${rows.length})`}`;
    const all = find('#bbs-select-all');
    all.disabled = !rows.length;
    all.checked = rows.length > 0 && selected.size === rows.length;
    all.indeterminate = selected.size > 0 && selected.size < rows.length;
  }

  function setEditor(input, editingId = null, changed = false) {
    workspace.draft = { ...input };
    workspace.editingId = editingId;
    workspace.editorChanged = changed;
    for (const control of root.querySelectorAll('[data-bbs-field]')) control.value = workspace.draft[control.dataset.bbsField];
    find('#bbs-shape-parameters').innerHTML = view.parameters(workspace.draft);
    for (const button of root.querySelectorAll('[data-bbs-shape]')) button.setAttribute('aria-pressed', String(button.dataset.bbsShape === input.shape));
    refreshResult();
    refreshSchedule();
    scheduleSave();
  }

  function replaceEditor(action) {
    if (!workspace.editorChanged) { action(); return; }
    pendingEditorAction = action;
    find('#bbs-replace-dialog').showModal();
  }

  function addItem() {
    refreshResult();
    if (!assessment.result) return;
    let row = workspace.rows.find(r => r.id === workspace.editingId && r.kind === 'local');
    if (row) {
      row.input = { ...workspace.draft, mark: model.uniqueMark(workspace.draft.mark.trim(), workspace.rows.filter(r => r.id !== row.id)) };
      row.savedAt = new Date().toISOString();
    } else {
      row = model.newRow(workspace.draft, workspace.rows);
      workspace.rows.push(row);
    }
    selected = new Set([row.id]);
    search = '';
    filter = 'all';
    find('#bbs-search').value = '';
    find('#bbs-filter').value = 'all';
    setEditor(row.input, row.id);
    const status = save();
    notify(status.saved ? `${row.input.mark} saved to the local schedule. Engineering review required.` : status.message);
  }

  function duplicate() {
    const copies = workspace.rows.filter(row => selected.has(row.id)).map(row => {
      const copy = model.newRow(row.input, workspace.rows);
      workspace.rows.push(copy);
      return copy;
    });
    selected = new Set(copies.map(row => row.id));
    filter = 'all'; search = '';
    find('#bbs-filter').value = 'all'; find('#bbs-search').value = '';
    refreshSchedule();
    const status = save();
    notify(status.saved ? `${copies.length} browser-local draft${copies.length === 1 ? '' : 's'} created. Original rows are unchanged.` : status.message);
  }

  function exportRows(rows, filename) {
    const header = ['Bar Mark', 'Member', 'Shape', 'Diameter', 'No. of Bars', 'Cutting Length m', 'Unit Weight kg/m', 'Total Weight kg', 'Total Weight tonnes', 'Formula Version'];
    const results = rows.map(row => model.calculate(row.input));
    if (results.some(item => !item.result)) { notify('Export paused: correct invalid inputs first.'); return; }
    const csvRows = results.map(({ result: r }) => [r.input.mark, r.input.memberType, r.input.shapeName, r.input.diaMm, r.output.totalBars, r.output.cuttingLengthM, r.output.unitWeightKgPerM, r.output.totalWeightKg, r.output.totalWeightTonnes, r.engineVersion]);
    downloadCsv([header, ...csvRows], filename);
    notify('CSV downloaded. Formula version included; engineering review required.');
  }

  function mount(element) {
    binding?.abort();
    root = element;
    binding = new AbortController();
    selected = new Set(); search = ''; filter = 'all'; sort = 'mark-asc'; group = 'none';
    const signal = binding.signal;
    window.addEventListener('pagehide', () => { if (saveTimer) save(); }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) save(); }, { signal });
    root.addEventListener('input', event => {
      const key = event.target.dataset.bbsField;
      if (key) {
        workspace.draft[key] = event.target.value;
        workspace.editorChanged = true;
        refreshResult(); scheduleSave();
      }
      if (event.target.id === 'bbs-search') { search = event.target.value; refreshSchedule(); }
    }, { signal });
    root.addEventListener('change', event => {
      if (event.target.id === 'bbs-project') {
        save();
        projectId = event.target.value;
        const container = root.parentElement;
        container.innerHTML = render();
        mount(container.querySelector('.bbs-workspace'));
        find('#bbs-project').focus();
      }
      if (event.target.id === 'bbs-filter') { filter = event.target.value; refreshSchedule(); }
      if (event.target.id === 'bbs-sort') { sort = event.target.value; refreshSchedule(); }
      if (event.target.id === 'bbs-group') { group = event.target.value; refreshSchedule(); }
      if (event.target.dataset.bbsSelect) {
        const id = event.target.dataset.bbsSelect;
        event.target.checked ? selected.add(id) : selected.delete(id);
        refreshSchedule();
        [...root.querySelectorAll('[data-bbs-select]')].find(control => control.dataset.bbsSelect === id)?.focus({ preventScroll: true });
      }
      if (event.target.id === 'bbs-select-all') {
        selected = new Set(event.target.checked ? visibleRows().map(row => row.id) : []);
        refreshSchedule();
      }
    }, { signal });
    root.addEventListener('submit', event => { if (event.target.id === 'bbs-editor') { event.preventDefault(); addItem(); } }, { signal });
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.bbsShape) {
        workspace.draft.shape = button.dataset.bbsShape;
        workspace.editorChanged = true;
        root.querySelectorAll('[data-bbs-shape]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
        find('#bbs-shape-parameters').innerHTML = view.parameters(workspace.draft);
        refreshResult(); scheduleSave();
      }
      if (button.dataset.bbsEdit) {
        const row = workspace.rows.find(r => r.id === button.dataset.bbsEdit);
        if (!row) return;
        replaceEditor(() => {
          const input = { ...row.input };
          if (row.kind === 'sample') input.mark = model.uniqueMark(input.mark, workspace.rows);
          setEditor(input, row.kind === 'local' ? row.id : null, row.kind === 'sample');
          find('#bbs-mark').scrollIntoView({ block: 'center' }); find('#bbs-mark').focus();
        });
      }
      switch (button.dataset.bbsAction) {
        case 'save': save(true); break;
        case 'new': replaceEditor(() => { setEditor({ ...model.defaults, mark: model.uniqueMark('B12-01', workspace.rows) }); find('#bbs-mark').scrollIntoView({ block: 'center' }); find('#bbs-mark').focus(); }); break;
        case 'duplicate': duplicate(); break;
        case 'delete': find('#bbs-delete-description').textContent = `${selected.size} selected item${selected.size === 1 ? '' : 's'} will be removed from this browser-local schedule.`; find('#bbs-delete-dialog').showModal(); break;
        case 'cancel-delete': find('#bbs-delete-dialog').close(); break;
        case 'confirm-delete':
          workspace.rows = workspace.rows.filter(row => !selected.has(row.id));
          if (selected.has(workspace.editingId)) { workspace.editingId = null; refreshResult(); }
          selected.clear(); find('#bbs-delete-dialog').close(); refreshSchedule(); save(); notify('Selected schedule items deleted locally.'); break;
        case 'cancel-replace': pendingEditorAction = null; find('#bbs-replace-dialog').close(); break;
        case 'confirm-replace': find('#bbs-replace-dialog').close(); pendingEditorAction?.(); pendingEditorAction = null; break;
        case 'export-current': refreshResult(); if (assessment.result) exportRows([{ input: workspace.draft }], `SiteQuant_${workspace.draft.mark}_BBS.csv`); break;
        case 'export-schedule': {
          const rows = visibleRows().filter(row => !selected.size || selected.has(row.id));
          if (rows.length) exportRows(rows, `${rows.some(r => r.kind === 'sample') ? 'SAMPLE_' : ''}SiteQuant_${projectId}_BBS_schedule.csv`);
          break;
        }
        case 'result': find('#bbs-result-title').scrollIntoView({ block: 'center' }); find('#bbs-result-title').focus({ preventScroll: true }); break;
      }
    }, { signal });
    root.addEventListener('input', event => {
      if (event.target.id === 'bbs-shape-search') {
        const query = event.target.value.toLowerCase();
        root.querySelectorAll('[data-bbs-library-item]').forEach(item => { item.hidden = !item.dataset.bbsLibraryItem.includes(query); });
      }
    }, { signal });
    refreshResult(); refreshSchedule();
    const issue = model.getStorageIssue();
    if (issue) { find('#bbs-storage-notice').textContent = issue; find('#bbs-storage-notice').hidden = false; }
  }

  function unmount() {
    if (saveTimer) { save(); saveTimer = null; }
    binding?.abort();
    root = null;
  }
  return { render, mount, unmount };
})();
