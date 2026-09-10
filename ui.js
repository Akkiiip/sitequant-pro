/* Shared, dependency-free UI primitives. Calculation logic belongs to bbs-engine.js. */
window.SiteQuant = window.SiteQuant || {};

window.SiteQuant.ui = (() => {
  const paths = {
    overview: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    projects: '<path d="M3 7V4h7l2 3h9v13H3Z"/>',
    bbs: '<path d="M4 4v16h16M9 4v11h11M14 4v6h6"/>',
    boq: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16M4 15h16M10 9v12"/>',
    exports: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
    pricing: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    review: '<path d="M12 3 2 21h20Z"/><path d="M12 9v5m0 3v1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    file: '<path d="M5 3h9l5 5v13H5Z M14 3v6h5M8 13h8M8 17h6"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>',
  };
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }
  function icon(name, className = '') {
    return `<svg class="sq-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
  }
  let toastTimer;
  function notify(message) {
    const status = document.getElementById('sq-status');
    clearTimeout(toastTimer);
    status.textContent = message;
    status.classList.add('sq-toast--visible');
    toastTimer = setTimeout(() => status.classList.remove('sq-toast--visible'), 6000);
  }
  function downloadCsv(rows, filename) {
    const cell = value => {
      let text = String(value ?? '');
      // Keep text cells from being interpreted as spreadsheet formulas.
      if (typeof value === 'string' && /^[=+@-]/.test(text)) text = "'" + text;
      return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
    };
    const blob = new Blob([rows.map(row => row.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[\\/:*?"<>|]/g, '-');
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { escape, icon, notify, downloadCsv };
})();
