/* Final BBS UX corrections: simpler field language, automatic marks, accurate schematic icons, and no forced review workflow. */
(() => {
  const prefixByMember = {
    Beam: 'B', Column: 'C', Slab: 'S', Footing: 'F', Staircase: 'ST', Wall: 'W', Pile: 'P', 'Pile Cap': 'PC', Raft: 'R', 'Retaining Wall': 'RW', 'Custom Member': 'M'
  };
  const root = () => document.querySelector('.bbs-workspace');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[x]));

  function nextMark(memberType) {
    const r = root();
    const project = r?.querySelector('#bbs-project')?.value;
    const model = window.SiteQuant?.bbsModel;
    const prefix = prefixByMember[memberType] || 'M';
    const rows = project && model ? model.workspace(project).rows || [] : [];
    let max = 0;
    const re = new RegExp(`^${prefix}(\\d+)$`, 'i');
    rows.forEach(row => {
      const match = re.exec(String(row.input?.mark || '').trim());
      if (match) max = Math.max(max, Number(match[1]));
    });
    return `${prefix}${max + 1}`;
  }

  function normalizeDirections() {
    const r = root(), model = window.SiteQuant?.bbsModel;
    if (!r || !model) return;
    model.directions = ['Main', 'Distribution'];
    model.defaults.direction = 'Main';
    const original = model.__sitequantOriginalCalculate || model.calculate;
    if (!model.__sitequantOriginalCalculate) {
      model.__sitequantOriginalCalculate = original;
      model.calculate = input => {
        const direction = input.direction === 'Distribution' || input.direction === 'Transverse' ? 'Transverse' : 'Longitudinal';
        return original({ ...input, direction });
      };
    }
    const projectId = r.querySelector('#bbs-project')?.value;
    const draft = projectId ? model.workspace(projectId).draft : model.defaults;
    if (draft.direction === 'Transverse') draft.direction = 'Distribution';
    else if (draft.direction === 'Longitudinal' || !draft.direction) draft.direction = 'Main';
    const select = r.querySelector('#bbs-direction');
    if (select) {
      select.innerHTML = '<option value="Main">Main</option><option value="Distribution">Distribution</option>';
      select.value = draft.direction;
      const label = select.parentElement?.childNodes?.[0];
      if (label?.nodeType === Node.TEXT_NODE) label.nodeValue = 'Bar arrangement ';
    }
    const hint = r.querySelector('#bbs-direction-hint');
    if (hint) hint.textContent = draft.direction === 'Distribution' ? 'Distribution bars run across the member and are spaced along the main span.' : 'Main bars run along the member span and are distributed across the perpendicular dimension.';
  }

  function removeReviewWorkflow() {
    const r = root();
    if (!r) return;
    const field = r.querySelector('[data-bbs-field="reviewStatus"]');
    const fieldset = field?.closest('fieldset');
    if (fieldset) fieldset.remove();
    const state = r.querySelector('#bbs-calculation-state');
    if (state) state.querySelectorAll('.bbs-badge--review').forEach(node => node.remove());
    r.querySelectorAll('.bbs-table th, .bbs-table td').forEach(cell => {
      if (cell.tagName === 'TH' && cell.textContent.trim() === 'Status') cell.remove();
    });
    r.querySelectorAll('.bbs-table tbody tr').forEach(row => {
      const cells = row.children;
      const statusCell = [...cells].find(cell => cell.textContent.trim() === 'Review Required' || cell.textContent.trim() === 'Reviewed' || cell.textContent.trim() === 'Approved' || cell.textContent.trim() === 'Draft' || cell.textContent.trim() === 'Calculated');
      if (statusCell && row.children.length > 10) statusCell.remove();
    });
  }

  function uSvg(inverted = false, compact = true) {
    const path = inverted ? 'M58 90V28H202V90' : 'M58 30V92H202V30';
    return `<svg class="bbs-diagram ${compact ? 'bbs-diagram--compact' : ''}" data-final-shape-diagram="u" viewBox="0 0 260 120" role="img" aria-label="${inverted ? 'Inverted U-bar' : 'U-bar'} schematic not to scale"><path class="bbs-diagram-guides" d="M58 ${inverted ? 90 : 30}V${inverted ? 108 : 12}M202 ${inverted ? 90 : 30}V${inverted ? 108 : 12}M58 ${inverted ? 108 : 12}H202"/><path class="bbs-diagram-bar" d="${path}"/><text x="130" y="${inverted ? 116 : 114}" text-anchor="middle">BASE</text><text x="17" y="63" text-anchor="middle">LEG 1</text><text x="243" y="63" text-anchor="middle">LEG 2</text></svg>`;
  }

  function linkSvg(kind, compact = true) {
    const angle = kind === 'E' || kind === 'F' ? '135°' : '';
    const path = 'M82 51L61 30L50 42V94H210V42L199 30L178 51';
    return `<svg class="bbs-diagram ${compact ? 'bbs-diagram--compact' : ''}" data-final-shape-diagram="link" viewBox="0 0 260 120" role="img" aria-label="${kind === 'F' ? 'Closed column tie' : 'Rectangular stirrup'} with bent hooks, schematic not to scale"><path class="bbs-diagram-guides" d="M50 102V113M210 102V113M50 108H210M30 42H12M30 94H12M21 42V94"/><path class="bbs-diagram-bar" d="${path}"/><path class="bbs-diagram-guide-accent" d="M61 30L82 51M199 30L178 51"/><text x="130" y="116" text-anchor="middle">${escapeHtml(angle)} HOOKS</text><text x="20" y="68" text-anchor="middle">D</text><text x="130" y="105" text-anchor="middle">W</text></svg>`;
  }

  function applyShapeDiagrams() {
    const r = root();
    if (!r) return;
    ['C','I'].forEach(code => {
      const el = r.querySelector(`.bbs-shape[data-bbs-shape="${code}"] .bbs-diagram`);
      if (el && !el.dataset.finalShapeDiagram) el.outerHTML = uSvg(code === 'I', true);
    });
    ['E','F'].forEach(code => {
      const el = r.querySelector(`.bbs-shape[data-bbs-shape="${code}"] .bbs-diagram`);
      if (el && !el.dataset.finalShapeDiagram) el.outerHTML = linkSvg(code, true);
    });
    const shape = r.querySelector('.bbs-shape[aria-pressed="true"]')?.dataset.bbsShape;
    const resultSvg = r.querySelector('#bbs-result .bbs-drawing .bbs-diagram');
    if (resultSvg && !resultSvg.dataset.finalShapeDiagram) {
      if (shape === 'C' || shape === 'I') resultSvg.outerHTML = uSvg(shape === 'I', false);
      else if (shape === 'E' || shape === 'F') resultSvg.outerHTML = linkSvg(shape, false);
    }
    const note = r.querySelector('.bbs-drawing > p');
    if (note) note.textContent = 'Schematic only · not to scale';
  }

  function simplifyLinks() {
    const r = root(), model = window.SiteQuant?.bbsModel;
    if (!r || !model) return;
    const shape = model.workspace(r.querySelector('#bbs-project')?.value || '').draft?.shape;
    if (!['E','F'].includes(shape)) return;
    const input = model.workspace(r.querySelector('#bbs-project')?.value || '').draft;
    const host = r.querySelector('#bbs-shape-parameters');
    if (!host || host.dataset.simpleLinks) return;
    host.dataset.simpleLinks = 'true';
    const linkMode = String(input.linkDetailingMode || 'SEISMIC_IS13920_2016');
    host.innerHTML = `<div class="bbs-link-simple"><div class="bbs-fields bbs-fields--three"><div class="bbs-field"><label for="bbs-stirrupWidth">${shape === 'E' ? 'Stirrup width' : 'Tie width'}<span>mm</span></label><div class="bbs-input-wrap"><input class="bbs-input" id="bbs-stirrupWidth" data-bbs-field="stirrupWidth" type="number" min="0.1" step="any" value="${escapeHtml(input.stirrupWidth)}" required><span>mm</span></div></div><div class="bbs-field"><label for="bbs-stirrupDepth">${shape === 'E' ? 'Stirrup depth' : 'Tie depth'}<span>mm</span></label><div class="bbs-input-wrap"><input class="bbs-input" id="bbs-stirrupDepth" data-bbs-field="stirrupDepth" type="number" min="0.1" step="any" value="${escapeHtml(input.stirrupDepth)}" required><span>mm</span></div></div><div class="bbs-field"><label for="bbs-hookDetail">Hook detailing</label><select class="bbs-input" id="bbs-hookDetail" data-bbs-link-detailing><option value="SEISMIC_IS13920_2016" ${linkMode === 'SEISMIC_IS13920_2016' ? 'selected' : ''}>135° · seismic</option><option value="DRAWING_SPECIFIED" ${linkMode === 'DRAWING_SPECIFIED' ? 'selected' : ''}>Drawing specified</option><option value="CUSTOM" ${linkMode === 'CUSTOM' ? 'selected' : ''}>Custom</option></select></div></div><div class="bbs-fields bbs-fields--three"><div class="bbs-field"><label for="bbs-hookAngle">Hook angle<span>°</span></label><select class="bbs-input" id="bbs-hookAngle" data-bbs-field="hookAngle"><option value="135" ${Number(input.hookAngle) === 135 ? 'selected' : ''}>135°</option><option value="90" ${Number(input.hookAngle) === 90 ? 'selected' : ''}>90°</option></select></div><div class="bbs-field"><label for="bbs-dimensionBasis">Dimension basis</label><select class="bbs-input" id="bbs-dimensionBasis" data-bbs-field="dimensionBasis"><option value="CENTRELINE" ${input.dimensionBasis === 'CENTRELINE' ? 'selected' : ''}>Centreline</option><option value="INNER" ${input.dimensionBasis === 'INNER' ? 'selected' : ''}>Inner</option><option value="OUTER" ${input.dimensionBasis === 'OUTER' ? 'selected' : ''}>Outer</option><option value="DRAWING_SPECIFIED" ${input.dimensionBasis === 'DRAWING_SPECIFIED' ? 'selected' : ''}>Drawing specified</option></select></div>${linkMode === 'DRAWING_SPECIFIED' || linkMode === 'CUSTOM' ? '<div class="bbs-field"><label for="bbs-hookExtension">Hook extension<span>mm</span></label><div class="bbs-input-wrap"><input class="bbs-input" id="bbs-hookExtension" data-bbs-field="hookExtension" type="number" min="0.1" step="any" value="'+escapeHtml(input.hookExtension)+'" required><span>mm</span></div></div><div class="bbs-field"><label for="bbs-hookExtension2">Hook extension 2<span>mm</span></label><div class="bbs-input-wrap"><input class="bbs-input" id="bbs-hookExtension2" data-bbs-field="hookExtension2" type="number" min="0.1" step="any" value="'+escapeHtml(input.hookExtension2)+'" required><span>mm</span></div></div>' : '<div class="bbs-link-auto"><strong>135° hooks auto-calculated</strong><span>10d extension, minimum 75 mm. Three 90° body bends and two hook bends are included in the bend deduction.</span></div>'}</div><p class="bbs-field-hint">Use centreline width/depth for the normal BBS workflow. Main longitudinal bars are not part of the stirrup perimeter; clear cover defines the stirrup position. The final cutting length applies the declared hook and bend convention.</p></div>`;
  }

  function newMarkForDraft() {
    const r = root(), model = window.SiteQuant?.bbsModel;
    if (!r || !model) return;
    const projectId = r.querySelector('#bbs-project')?.value;
    const draft = projectId ? model.workspace(projectId).draft : null;
    if (!draft || model.workspace(projectId).editingId) return;
    const mark = r.querySelector('#bbs-mark');
    if (mark && (!mark.value || /^B12-01$/i.test(mark.value) || /^[A-Z]{1,3}\d+$/.test(mark.value))) mark.value = draft.mark = nextMark(draft.memberType);
  }

  function observe() {
    const r = root();
    if (!r) return;
    normalizeDirections();
    removeReviewWorkflow();
    applyShapeDiagrams();
    simplifyLinks();
    const collapsed = r.querySelector('.bbs-result--collapsed');
    r.classList.toggle('bbs-workspace--result-collapsed', !!collapsed);
    newMarkForDraft();
    const state = r.querySelector('#bbs-calculation-state');
    if (state) state.querySelectorAll('.bbs-badge--review').forEach(node => node.remove());
  }

  document.addEventListener('change', event => {
    const r = root();
    if (!r) return;
    if (event.target.matches('#bbs-memberType')) {
      const projectId = r.querySelector('#bbs-project')?.value, model = window.SiteQuant?.bbsModel;
      if (projectId && model && !model.workspace(projectId).editingId) {
        const mark = r.querySelector('#bbs-mark');
        const next = nextMark(event.target.value);
        if (mark) { mark.value = next; model.workspace(projectId).draft.mark = next; }
      }
      setTimeout(observe, 0);
    }
    if (event.target.matches('#bbs-hookDetail')) {
      const model = window.SiteQuant?.bbsModel, projectId = r.querySelector('#bbs-project')?.value;
      if (model && projectId) model.workspace(projectId).draft.linkDetailingMode = event.target.value;
      const host = r.querySelector('#bbs-shape-parameters'); if (host) { delete host.dataset.simpleLinks; simplifyLinks(); }
    }
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-bbs-action="new"]');
    if (button) setTimeout(() => { const r = root(), model = window.SiteQuant?.bbsModel, projectId = r?.querySelector('#bbs-project')?.value; if (r && model && projectId) { const d=model.workspace(projectId).draft; d.mark=nextMark(d.memberType); const mark=r.querySelector('#bbs-mark'); if(mark) mark.value=d.mark; } observe(); }, 0);
  }, true);

  const mo = new MutationObserver(() => setTimeout(observe, 0));
  const boot = () => { const view=document.querySelector('#view'); if(view) mo.observe(view,{childList:true,subtree:true}); observe(); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
