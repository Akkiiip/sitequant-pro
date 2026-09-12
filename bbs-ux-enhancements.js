/* Lightweight BBS UX layer. Keeps engineering maths in bbs-engine.js. */
(() => {
  const decorate = () => {
    const root = document.querySelector('.bbs-workspace');
    if (!root) return;
    const select = root.querySelector('#bbs-project');
    const projectId = select?.value;
    const model = window.SiteQuant?.bbsModel;
    const draft = projectId && model ? model.workspace(projectId).draft : model?.defaults || {};

    const uField = (key, label, value) => `<div class="bbs-field"><label for="bbs-${key}">${label}<span>mm</span></label><div class="bbs-input-wrap"><input class="bbs-input" id="bbs-${key}" name="${key}" data-bbs-field="${key}" type="number" min="0.1" step="any" inputmode="decimal" value="${String(value ?? '')}" required aria-describedby="bbs-${key}-error"><span aria-hidden="true">mm</span></div><p class="bbs-field-error" id="bbs-${key}-error"></p></div>`;
    const shape = draft?.shape;
    const parameterHost = root.querySelector('#bbs-shape-parameters');
    if (parameterHost && ['C', 'I'].includes(shape) && !parameterHost.dataset.uShapeEnhanced) {
      parameterHost.dataset.uShapeEnhanced = 'true';
      parameterHost.innerHTML = `<div class="bbs-u-shape-fields"><div class="bbs-fields bbs-fields--three">${uField('uBaseLength', 'Base length', draft.uBaseLength)}${uField('uLeg1', 'Leg 1 length', draft.uLeg1)}${uField('uLeg2', 'Leg 2 length', draft.uLeg2)}</div><div class="bbs-u-shape-note"><strong>${shape === 'I' ? 'INVERTED U-BAR' : 'U-BAR'}</strong><span>Base and both legs are explicit bar-axis dimensions. Leg 1 and Leg 2 may be equal or intentionally different only when the detail requires it.</span></div></div>`;
    }
    const makeSvg = (inverted, compact) => {
      const path = inverted ? 'M55 96V25H205V96' : 'M55 25V95H205V25';
      const baseY = inverted ? 14 : 108;
      return `<svg class="bbs-diagram ${compact ? 'bbs-diagram--compact' : ''}" data-u-shape-diagram="1" viewBox="0 0 260 120" role="img" aria-label="${inverted ? 'Inverted U-bar' : 'U-bar'} schematic not to scale"><path class="bbs-diagram-guides" d="M55 ${inverted ? 96 : 25}V${inverted ? 108 : 12}M205 ${inverted ? 96 : 25}V${inverted ? 108 : 12}M55 ${baseY}H205M28 ${inverted ? 25 : 95}H12M232 ${inverted ? 25 : 95}H248M21 ${inverted ? 25 : 95}V${inverted ? 96 : 25}"/><path class="bbs-diagram-bar" d="${path}"/><text x="130" y="${inverted ? 116 : 112}" text-anchor="middle">BASE</text><text x="18" y="61" text-anchor="middle">LEG 1</text><text x="242" y="61" text-anchor="middle">LEG 2</text></svg>`;
    };
    for (const code of ['C', 'I']) {
      const button = root.querySelector(`.bbs-shape[data-bbs-shape="${code}"]`);
      const compactDiagram = button?.querySelector('.bbs-diagram');
      if (compactDiagram && !compactDiagram.dataset.uShapeDiagram) compactDiagram.outerHTML = makeSvg(code === 'I', true);
    }
    if (['C', 'I'].includes(shape)) {
      const resultSvg = root.querySelector('#bbs-result .bbs-drawing .bbs-diagram');
      if (resultSvg && !resultSvg.dataset.uShapeDiagram) resultSvg.outerHTML = makeSvg(shape === 'I', false);
      const readout = root.querySelector('#bbs-result .bbs-dimension-readout');
      const labels = ['Base', 'Leg 1', 'Leg 2'];
      if (readout) [...readout.querySelectorAll('dt')].forEach((dt, index) => { const next = labels[index]; if (next && dt.textContent !== next) dt.textContent = next; });
    }

    // Live calculation is useful, but it should never compete with the shape drawing.
    // Keep it available behind a lightweight arrow toggle and collapse the right rail by default.
    const result = root.querySelector('.bbs-result');
    if (result && !result.dataset.compactToggle) {
      result.dataset.compactToggle = 'true';
      const heading = result.querySelector('.bbs-result-heading');
      if (heading) {
        const eyebrow = heading.querySelector('.sq-eyebrow');
        if (eyebrow) eyebrow.textContent = 'CALCULATION RESULT';
        let toggle = heading.querySelector('[data-bbs-result-toggle]');
        if (!toggle) {
          toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'bbs-result-toggle';
          toggle.dataset.bbsResultToggle = 'true';
          toggle.setAttribute('aria-expanded', 'false');
          toggle.setAttribute('aria-controls', 'bbs-result-details');
          toggle.innerHTML = '<span>Details</span><span aria-hidden="true">›</span>';
          heading.appendChild(toggle);
        }
        const details = [...result.children].filter(node => node !== heading);
        let detailHost = result.querySelector('#bbs-result-details');
        if (!detailHost) {
          detailHost = document.createElement('div');
          detailHost.id = 'bbs-result-details';
          detailHost.className = 'bbs-result-details';
          details.forEach(node => detailHost.appendChild(node));
          result.appendChild(detailHost);
        }
        result.classList.add('bbs-result--collapsed');
        toggle.onclick = () => {
          const open = result.classList.toggle('bbs-result--expanded');
          result.classList.toggle('bbs-result--collapsed', !open);
          toggle.setAttribute('aria-expanded', String(open));
          toggle.innerHTML = `<span>${open ? 'Hide' : 'Details'}</span><span aria-hidden="true">${open ? '‹' : '›'}</span>`;
        };
      }
    }
  };
  const syncFamily = button => {
    const map = { E: 'Stirrups', F: 'Column ties', G: 'Column ties' };
    const family = map[button?.dataset.bbsShape];
    if (!family) return;
    const control = document.querySelector('#bbs-family');
    if (control && [...control.options].some(option => option.value === family) && control.value !== family) { control.value = family; control.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  const observer = new MutationObserver(() => decorate());
  const boot = () => { const view = document.querySelector('#view'); if (view) observer.observe(view, { childList: true, subtree: true }); decorate(); };
  document.addEventListener('click', event => { const button = event.target.closest('.bbs-shape[data-bbs-shape]'); if (button) setTimeout(() => { syncFamily(button); decorate(); }, 0); }, true);
  document.addEventListener('change', event => { if (event.target.matches('[data-bbs-field="uBaseLength"], [data-bbs-field="uLeg1"], [data-bbs-field="uLeg2"]')) setTimeout(decorate, 0); }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
