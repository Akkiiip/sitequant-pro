/* UI validation, unit/axis adapter and local storage. Engineering maths stays in the engine. */
window.SiteQuant.bbsModel = (() => {
  const shapeOptions = Object.entries(SHAPES).map(([key, shape]) => ({ key, code: shape.code, name: shape.name, dimensions: shape.dimensions }));
  const members = ['Beam', 'Column', 'Slab', 'Footing', 'Wall'];
  const grades = ['Fe 415', 'Fe 500', 'Fe 500D', 'Fe 550'];
  const directions = ['Longitudinal', 'Transverse'];
  const defaults = { memberType: 'Beam', mark: 'B12-01', description: 'Bottom main reinforcement', material: 'Fe 500D', length: '4.2', breadth: '0.3', depth: '0.45', cover: '25', quantity: '1', dia: '16', spacing: '150', direction: 'Longitudinal', shape: 'A', ret: '300', rise: '150', run: '150', tail: '150' };
  const storageKey = 'sitequant.bbs-workspaces.v1';
  const workspaces = new Map();
  let storageIssue = '';

  function cleanInput(value = {}) {
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof value[key] === 'string' || typeof value[key] === 'number' ? String(value[key]).slice(0, key === 'description' ? 240 : 80) : fallback]));
  }

  function validate(input) {
    const errors = {};
    for (const [key, label] of [['mark', 'Bar mark'], ['description', 'Description']]) {
      if (!String(input[key]).trim()) errors[key] = `${label} is required.`;
    }
    for (const [key, options] of [['memberType', members], ['material', grades], ['direction', directions], ['shape', shapeOptions.map(s => s.code)]]) {
      if (!options.includes(input[key])) errors[key] = 'Choose an available option.';
    }
    const fields = { length: 'Length', breadth: 'Breadth', depth: 'Depth', cover: 'Clear cover', quantity: 'Identical member quantity', dia: 'Diameter', spacing: 'Spacing' };
    if (input.shape === 'B') fields.ret = 'Return length';
    if (input.shape === 'D') Object.assign(fields, { rise: 'Crank rise', run: 'Crank run', tail: 'Tail' });
    for (const [key, label] of Object.entries(fields)) {
      const raw = String(input[key]).trim();
      const number = Number(raw);
      if (!raw) errors[key] = `${label} is required.`;
      else if (!Number.isFinite(number)) errors[key] = `Enter a numeric ${label.toLowerCase()}.`;
      else if (number < 0 || (number === 0 && key !== 'cover')) errors[key] = key === 'cover' ? 'Cover cannot be negative.' : `${label} must be greater than zero.`;
      else if (key === 'quantity' && (!Number.isSafeInteger(number) || number < 1)) errors[key] = 'Enter a whole number of members (at least 1).';
    }
    if (!errors.cover && ['length', 'breadth', 'depth'].every(k => !errors[k])) {
      if (['length', 'breadth', 'depth'].some(k => Number(input.cover) * 2 >= Number(input[k]) * 1000)) errors.cover = 'Cover must leave a positive clear dimension in every member direction.';
    }
    return errors;
  }

  function calculate(input) {
    const errors = validate(input);
    if (Object.keys(errors).length) return { errors, result: null };
    // Direction rotates the in-plane input axes; it never changes an engine formula.
    const transverse = input.direction === 'Transverse';
    const lengthMm = Number(transverse ? input.breadth : input.length) * 1000;
    const breadthMm = Number(transverse ? input.length : input.breadth) * 1000;
    try {
      const result = window.calculateBbs({
        memberType: input.memberType, mark: input.mark.trim(), description: input.description.trim(), material: input.material,
        lengthMm, breadthMm, depthMm: Number(input.depth) * 1000, coverMm: Number(input.cover),
        diaMm: Number(input.dia), spacingMm: Number(input.spacing), memberQuantity: Number(input.quantity),
        distributionDimensionMm: breadthMm, shape: shapeOptions.find(s => s.code === input.shape).key,
        hooks: { returnLengthMm: Number(input.ret), crankRiseMm: Number(input.rise), crankRunMm: Number(input.run), tailMm: Number(input.tail) },
      });
      if (!Object.values(result.output).every(Number.isFinite) || !Number.isSafeInteger(result.output.totalBars)) throw Error('Inputs exceed the supported numeric range.');
      return { errors: {}, result };
    } catch (error) { return { errors: { calculation: error.message }, result: null }; }
  }

  function sampleRows(projectId) {
    if (!['riverside', 'westend', 'greenfield'].includes(projectId)) return [];
    return [
      { ...defaults, mark: 'B12-01', quantity: '8', description: 'Level 02 · beam bottom main' },
      { ...defaults, mark: 'B12-02', quantity: '8', shape: 'B', dia: '12', description: 'Level 02 · end-support returns' },
      { ...defaults, memberType: 'Footing', mark: 'F01-03', shape: 'C', length: '2.4', breadth: '2.4', depth: '0.6', cover: '50', quantity: '4', description: 'Footing F01 · U reinforcement' },
      { ...defaults, memberType: 'Slab', mark: 'S02-08', shape: 'D', breadth: '3.6', depth: '0.2', dia: '10', spacing: '200', description: 'Level 02 · cranked reinforcement' },
    ].map((input, index) => ({ id: `sample-${projectId}-${index}`, kind: 'sample', input, savedAt: '2026-09-10T10:00:00.000Z' }));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && saved.version !== 1) throw Error('Unsupported draft version');
    if (saved && !Array.isArray(saved.projects)) throw Error('Invalid draft data');
    for (const entry of saved?.projects || []) {
      if (!entry || typeof entry.id !== 'string' || !Array.isArray(entry.rows)) throw Error('Invalid project data');
      const rows = entry.rows.map(row => {
        if (!row || typeof row.id !== 'string' || !['sample', 'local'].includes(row.kind)) throw Error('Invalid schedule row');
        const input = cleanInput(row.input);
        if (!calculate(input).result) throw Error('Invalid saved schedule input');
        return { id: row.id, kind: row.kind, input, savedAt: String(row.savedAt || '') };
      });
      workspaces.set(entry.id, { rows, draft: cleanInput(entry.draft), editingId: rows.some(r => r.id === entry.editingId && r.kind === 'local') ? entry.editingId : null, editorChanged: !!entry.editorChanged });
    }
  } catch {
    workspaces.clear();
    storageIssue = 'Saved BBS data could not be read. It has not been overwritten. Export or recover your stored data before saving a new workspace.';
  }

  function workspace(id) {
    if (!workspaces.has(id)) workspaces.set(id, { rows: sampleRows(id), draft: { ...defaults }, editingId: null });
    return workspaces.get(id);
  }

  function persist() {
    // Never overwrite unreadable saved records silently.
    if (storageIssue) return { saved: false, message: storageIssue };
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, projects: [...workspaces].map(([id, data]) => ({ id, ...data })) }));
      return { saved: true, message: 'Draft saved in this browser only.' };
    } catch { return { saved: false, message: 'Browser storage is unavailable or full. Changes are in memory only and will be lost on reload. Export valid items to keep a copy.' }; }
  }

  function uniqueMark(mark, rows) {
    const used = new Set(rows.map(row => row.input.mark.toLowerCase()));
    let candidate = mark, index = 2;
    while (used.has(candidate.toLowerCase())) candidate = `${mark}-${index++}`;
    return candidate;
  }

  function newRow(input, rows) {
    return { id: crypto.randomUUID(), kind: 'local', input: { ...input, mark: uniqueMark(input.mark.trim(), rows) }, savedAt: new Date().toISOString() };
  }

  return { shapeOptions, members, grades, directions, defaults, storageKey, cleanInput, validate, calculate, workspace, persist, uniqueMark, newRow, getStorageIssue: () => storageIssue };
})();
