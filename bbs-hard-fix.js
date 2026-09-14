/* SiteQuant Pro — single BBS presentation contract.
 * No MutationObserver. No competing DOM patch layers.
 * Keeps the calculation engine untouched and only changes presentation labels/layout.
 */
(() => {
  const view = window.SiteQuant?.bbsView;
  if (!view || view.__stableBbsUx) return;

  const originalRender = view.render;
  const originalResult = view.result;
  const originalScheduleRows = view.scheduleRows;
  const originalBadge = view.badge;

  // Review is an engineering release step, not a calculation input.
  view.badge = (text, modifier = '') => {
    if (String(modifier).toLowerCase() === 'review') return '';
    if (String(text).trim().toLowerCase() === 'review required') return '';
    return originalBadge(text, modifier);
  };

  view.render = (...args) => {
    let html = originalRender(...args);

    // Remove the old mandatory review form completely.
    html = html.replace(/<fieldset class="bbs-fieldset"><legend><span>02<\/span> Review workflow<\/legend>[\s\S]*?<\/fieldset>\s*/i, '');

    // The shape library is useful as a catalogue, but it should not dominate the
    // working screen. Shape selection remains in the editor's Selected shape area.
    html = html.replace(/<section class="bbs-shape-library"[\s\S]*?<\/section>\s*(?=<section|<div|$)/i, '');

    // User-facing BBS terminology; engine values remain backward-compatible.
    html = html.replace(/(<label[^>]*for="bbs-direction"[^>]*>)([^<]*)/i, '$1Bar arrangement');
    html = html.replace(/>Longitudinal</g, '>Main<');
    html = html.replace(/>Transverse</g, '>Distribution<');
    html = html.replace(/Longitudinal<\/small>/g, 'Main</small>');
    html = html.replace(/Transverse<\/small>/g, 'Distribution</small>');
    html = html.replace(/max\(6d, 65 mm\)/g, 'max(10d, 75 mm)');
    html = html.replace(/6d,65/g, '10d,75');
    html = html.replace('Calculated records. Every item still requires engineering review.', 'Calculated records. Verify before construction issue.');

    return html;
  };

  view.result = (assessment, input, traceOpen = true) => {
    let html = originalResult(assessment, input, traceOpen);

    // Strip legacy always-on status/readiness blocks.
    html = html.replace(/<div class="bbs-result-review">[\s\S]*?<\/div>/g, '');
    html = html.replace(/<div class="bbs-export-readiness">[\s\S]*?<\/div>/g, '');
    html = html.replace(/<p class="bbs-standard-status">[\s\S]*?<\/p>/g, '');
    html = html.replace(/max\(6d, 65 mm\)/g, 'max(10d, 75 mm)');

    // Convert the calculation result into a compact verification drawer.
    const headingStart = html.indexOf('<div class="bbs-result-heading">');
    if (headingStart >= 0) {
      const headingEnd = html.indexOf('</div>', headingStart);
      if (headingEnd >= 0) {
        const heading = html.slice(headingStart, headingEnd + 6);
        const body = html.slice(headingEnd + 6).trim();
        if (body) {
          const state = assessment?.result ? 'Calculated' : 'Input required';
          html = `<details class="bbs-calculation-drawer"><summary><span>Calculation verification</span><span class="bbs-drawer-state">${state}</span><span class="bbs-drawer-chevron" aria-hidden="true">›</span></summary><div class="bbs-calculation-drawer-body">${heading}${body}</div></details>`;
        }
      }
    }
    return html;
  };

  view.scheduleRows = (...args) => {
    let html = originalScheduleRows(...args);
    return html.replace(/>Longitudinal</g, '>Main<').replace(/>Transverse</g, '>Distribution<').replace(/Longitudinal<\/small>/g, 'Main</small>').replace(/Transverse<\/small>/g, 'Distribution</small>');
  };

  const style = document.createElement('style');
  style.id = 'bbs-stable-ux-style';
  style.textContent = `
    /* Clean working screen: catalogue content does not compete with the editor. */
    .bbs-shape-library{display:none!important}

    /* Calculation verification is available on demand, never a blocking panel. */
    .bbs-calculation-drawer{margin:0 0 1rem;border:1px solid var(--sq-border,#d9e0e7);border-radius:8px;background:var(--sq-surface,#fff)}
    .bbs-calculation-drawer>summary{list-style:none;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:.75rem;padding:.8rem .9rem;cursor:pointer;font-weight:650}
    .bbs-calculation-drawer>summary::-webkit-details-marker{display:none}
    .bbs-drawer-state{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;font-weight:700;opacity:.75}
    .bbs-drawer-chevron{font-size:1.25rem;line-height:1;transition:transform .15s ease}
    .bbs-calculation-drawer[open] .bbs-drawer-chevron{transform:rotate(90deg)}
    .bbs-calculation-drawer-body{padding:0 .9rem 1rem;border-top:1px solid var(--sq-border,#d9e0e7)}

    /* Shape selection belongs to the calculation editor, not a second catalogue. */
    .bbs-editor .bbs-shape-library{display:none!important}

    /* Keep the schedule focused on engineering quantities rather than workflow state. */
    .bbs-schedule thead th:last-child,.bbs-schedule tbody td:last-child{display:none}
  `;
  document.head.appendChild(style);
  view.__stableBbsUx = true;
})();
