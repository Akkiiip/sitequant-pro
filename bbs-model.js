/* UI validation, unit/axis adapter and local storage. Engineering maths stays in the engine. */
window.SiteQuant.bbsModel = (() => {
  const catalog = window.SiteQuant.bbsCatalog;
  const shapeOptions = catalog.shapes;
  const members = catalog.members;
  const families = catalog.families;
  const grades = ['Fe 415', 'Fe 500', 'Fe 500D', 'Fe 550'];
  const directions = ['Longitudinal', 'Transverse'];
  const defaults = { memberType: 'Beam', family: 'Bottom main', mark: 'B12-01', description: 'Bottom main reinforcement', material: 'Fe 500D', revision: 'Draft', reviewStatus: 'Review Required', reviewedBy: '', reviewDate: '', reviewNote: '', length: '4.2', breadth: '0.3', depth: '0.45', cover: '25', quantity: '1', dia: '16', spacing: '150', direction: 'Longitudinal', shape: 'A', ret: '300', rise: '150', run: '150', tail: '150', uBaseLength: '4150', uLeg1: '400', uLeg2: '400', stirrupWidth: '250', stirrupDepth: '400', ringDiameter: '300', linkDetailingMode: 'SEISMIC_IS13920_2016', dimensionBasis: 'CENTRELINE', hookAngle: '135', hookExtension: '160', hookExtension2: '160', hookCount: '2', bendCount: '4', bendAllowance: '0', ringCount: '1' };
  const storageKey = 'sitequant.bbs-workspaces.v1';
  const workspaces = new Map();
  const settingsKey = 'sitequant.bbs-settings.v1';
  const defaultSettings = { units: 'Metric (mm, m, kg)', grade: 'Fe 500D', cover: '25', spacing: '150', wastage: '3', reviewStatus: 'Review Required' };
  let settings = { ...defaultSettings };
  const exportKey = 'sitequant.bbs-exports.v1'; let exportHistory = [];
  let storageIssue = '';

  function cleanInput(value = {}) {
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof value[key] === 'string' || typeof value[key] === 'number' ? String(value[key]).slice(0, key === 'description' ? 240 : 80) : fallback]));
  }

  function validate(input) {
    const errors = {};
    for (const [key, label] of [['mark', 'Bar mark'], ['description', 'Description']]) {
      if (!String(input[key]).trim()) errors[key] = `${label} is required.`;
    }
    for (const [key, options] of [['memberType', members], ['family', families], ['material', grades], ['direction', directions], ['shape', shapeOptions.map(s => s.code)]]) {
      if (!options.includes(input[key])) errors[key] = 'Choose an available option.';
    }
    const fields = { length: 'Length', breadth: 'Breadth', depth: 'Depth', cover: 'Clear cover', quantity: 'Identical member quantity', dia: 'Diameter', spacing: 'Spacing' };
    if (input.shape === 'B') fields.ret = 'Return length';
    if (['C','I'].includes(input.shape)) Object.assign(fields, { uBaseLength: 'Base length', uLeg1: 'Leg 1 length', uLeg2: 'Leg 2 length' });
    if (input.shape === 'D') Object.assign(fields, { rise: 'Crank rise', run: 'Crank run', tail: 'Tail' });
    if (['E','F'].includes(input.shape)) {
      Object.assign(fields, { stirrupWidth: 'Link width', stirrupDepth: 'Link depth', hookAngle: 'Hook angle', hookCount: 'Hook count', bendCount: 'Bend count', bendAllowance: 'Bend contribution / allowance' });
      if (['DRAWING_SPECIFIED','CUSTOM','GENERAL_IS2502_REFERENCE'].includes(input.linkDetailingMode)) Object.assign(fields, { hookExtension: 'Hook extension 1', hookExtension2: 'Hook extension 2' });
      if (!['GENERAL_IS2502_REFERENCE','SEISMIC_IS13920_2016','DRAWING_SPECIFIED','CUSTOM'].includes(input.linkDetailingMode)) errors.linkDetailingMode = 'Choose a supported detailing basis.';
      if (!['CENTRELINE','INNER','OUTER','DRAWING_SPECIFIED'].includes(input.dimensionBasis)) errors.dimensionBasis = 'Choose a supported dimension basis.';
      if (input.linkDetailingMode === 'SEISMIC_IS13920_2016' && Number(input.hookAngle) !== 135) errors.hookAngle = 'Seismic link detailing requires a 135° hook.';
    }
    if (input.shape === 'G') Object.assign(fields, { ringDiameter: 'Centreline ring diameter', hookExtension: 'Closure extension 1', hookExtension2: 'Closure extension 2', ringCount: 'Rings per member' });
    for (const [key, label] of Object.entries(fields)) {
      const raw = String(input[key]).trim();
      const number = Number(raw);
      if (!raw) errors[key] = `${label} is required.`;
      else if (!Number.isFinite(number)) errors[key] = `Enter a numeric ${label.toLowerCase()}.`;
      else if (number < 0 || (number === 0 && !['cover','bendAllowance','bendCount'].includes(key))) errors[key] = key === 'cover' ? 'Cover cannot be negative.' : `${label} must be greater than zero.`;
      else if ((key === 'quantity' || key === 'hookCount' || key === 'bendCount') && (!Number.isSafeInteger(number) || number < (key === 'bendCount' ? 0 : 1))) errors[key] = `Enter a whole number of ${key === 'quantity' ? 'members' : key === 'hookCount' ? 'hooks' : 'bends'} (at least ${key === 'bendCount' ? 0 : 1}).`;
    }
    if (!errors.cover && ['length', 'breadth', 'depth'].every(k => !errors[k])) {
      if (['length', 'breadth', 'depth'].some(k => Number(input.cover) * 2 >= Number(input[k]) * 1000)) errors.cover = 'Cover must leave a positive clear dimension in every member direction.';
    }
    return errors;
  }

  function calculate(input) {
    const errors = validate(input);
    if (Object.keys(errors).length) return { errors, result: null };
    const shape = catalog.byCode(input.shape);
    if (!shape || shape.calculation !== 'engine') return { errors: { calculation: `${shape?.name || 'Selected shape'} is available in the shape library, but its calculation engine is planned. No engineering result is produced.` }, result: null, planned: true };
    const transverse = input.direction === 'Transverse';
    const lengthMm = Number(transverse ? input.breadth : input.length) * 1000;
    const breadthMm = Number(transverse ? input.length : input.breadth) * 1000;
    try {
      const result = window.calculateBbs({
        memberType: input.memberType, mark: input.mark.trim(), description: input.description.trim(), material: input.material,
        lengthMm, breadthMm, depthMm: Number(input.depth) * 1000, coverMm: Number(input.cover),
        diaMm: Number(input.dia), spacingMm: Number(input.spacing), memberQuantity: Number(input.quantity),
        distributionDimensionMm: breadthMm, shape: shape.engineShape,
        barCountPerMember: input.shape === 'G' ? Number(input.ringCount) : undefined,
        stirrupWidthMm: Number(input.stirrupWidth), stirrupDepthMm: Number(input.stirrupDepth), ringDiameterMm: Number(input.ringDiameter), linkDetailingMode: input.linkDetailingMode, dimensionBasis: input.dimensionBasis,
        hooks: { returnLengthMm: Number(input.ret), crankRiseMm: Number(input.rise), crankRunMm: Number(input.run), tailMm: Number(input.tail), uBaseLengthMm: Number(input.uBaseLength), uLeg1Mm: Number(input.uLeg1), uLeg2Mm: Number(input.uLeg2), hookExtensionMm: Number(input.hookExtension), hookExtension2Mm: Number(input.hookExtension2), hookAngleDeg: Number(input.hookAngle), hookCount: Number(input.hookCount), bendCount: Number(input.bendCount), bendAllowanceMm: Number(input.bendAllowance) },
      });
      if (!Object.values(result.output).every(Number.isFinite) || !Number.isSafeInteger(result.output.totalBars)) throw Error('Inputs exceed the supported numeric range.');
      return { errors: {}, result };
    } catch (error) { return { errors: { calculation: error.message }, result: null }; }
  }

  function sampleRows(projectId) {
    if (!['riverside', 'westend', 'greenfield'].includes(projectId)) return [];
    return [
      { ...defaults, mark: 'B12-01', quantity: '8', description: 'Level 02 · beam bottom main' },
      { ...defaults, family: 'Extra top', mark: 'B12-02', quantity: '8', shape: 'B', dia: '12', description: 'Level 02 · end-support returns' },
      { ...defaults, family: 'Distribution', mark: 'F01-03', memberType: 'Footing', shape: 'C', length: '2.4', breadth: '2.4', depth: '0.6', cover: '50', quantity: '4', uBaseLength: '2300', uLeg1: '500', uLeg2: '500', description: 'Footing F01 · U reinforcement' },
      { ...defaults, family: 'Curtailment', memberType: 'Slab', mark: 'S02-08', quantity: '1', shape: 'D', breadth: '3.6', depth: '0.2', dia: '10', spacing: '200', description: 'Level 02 · cranked reinforcement' },
    ].map((input, index) => ({ id: `sample-${projectId}-${index}`, kind: 'sample', input, savedAt: '2026-09-10T10:00:00.000Z' }));
  }

  try {
    exportHistory = JSON.parse(localStorage.getItem(exportKey) || '[]'); if (!Array.isArray(exportHistory)) exportHistory=[];
    const storedSettings = JSON.parse(localStorage.getItem(settingsKey) || 'null');
    if (storedSettings && typeof storedSettings === 'object') settings = { ...settings, ...Object.fromEntries(Object.keys(defaultSettings).map(key => [key, String(storedSettings[key] ?? settings[key])])) };
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
    if (!workspaces.has(id)) workspaces.set(id, { rows: sampleRows(id), draft: { ...defaults, material: settings.grade, cover: settings.cover, spacing: settings.spacing, reviewStatus: settings.reviewStatus }, editingId: null });
    return workspaces.get(id);
  }

  function persist() {
    if (storageIssue) return { saved: false, message: storageIssue };
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, projects: [...workspaces].map(([id, data]) => ({ id, ...data })) }));
      return { saved: true, message: 'Draft saved in this browser only.' };
    } catch { return { saved: false, message: 'Browser storage is unavailable or full. Changes are in memory only and will be lost on reload. Export valid items to keep a copy.' }; }
  }

  function uniqueMark(mark, rows) { const used = new Set(rows.map(row => row.input.mark.toLowerCase())); let candidate = mark, index = 2; while (used.has(candidate.toLowerCase())) candidate = `${mark}-${index++}`; return candidate; }
  function newRow(input, rows) { return { id: crypto.randomUUID(), kind: 'local', input: { ...input, mark: uniqueMark(input.mark.trim(), rows) }, savedAt: new Date().toISOString() }; }
  function calculatedRows(projectId) { return workspace(projectId).rows.map(row => ({ ...row, calculation: calculate(row.input).result })).filter(row => row.calculation); }
  function analysis(projectId) {
    const rows = calculatedRows(projectId);
    const total = rows.reduce((a,row) => { const o=row.calculation.output; a.bars+=o.totalBars;a.length+=o.totalLengthM;a.weight+=o.totalWeightKg;return a; }, { bars:0,length:0,weight:0 });
    const group = key => Object.values(rows.reduce((a,row) => { const o=row.calculation.output, name=key==='diameter'?`${row.input.dia} mm`:key==='member'?row.input.memberType:key==='family'?row.input.family:row.input.shape; const item=a[name] ||= { name, bars:0,length:0,weight:0,rows:0 };item.bars+=o.totalBars;item.length+=o.totalLengthM;item.weight+=o.totalWeightKg;item.rows++;return a; }, {}));
    const cutting = Object.values(rows.reduce((a,row) => { const o=row.calculation.output, key=[row.input.dia,row.input.material,row.input.shape,o.cuttingLengthM,row.input.family].join('|'); const item=a[key] ||= { diameter:row.input.dia,grade:row.input.material,shape:row.input.shape,cutLength:o.cuttingLengthM,family:row.input.family,quantity:0,totalLength:0,totalWeight:0 };item.quantity+=o.totalBars;item.totalLength+=o.totalLengthM;item.totalWeight+=o.totalWeightKg;return a; }, {}));
    const wastage = Math.max(0, Number(settings.wastage)||0); return { rows,total,diameter:group('diameter'),member:group('member'),family:group('family'),shape:group('shape'),cutting,wastage:{ percent:wastage, allowanceKg:total.weight*wastage/100, procurementKg:total.weight*(1+wastage/100) } };
  }
  function getSettings(){return {...settings};}
  function saveSettings(next){settings={...settings,...Object.fromEntries(Object.keys(defaultSettings).map(key=>[key,String(next[key]??settings[key])]))};try{localStorage.setItem(settingsKey,JSON.stringify(settings));return true}catch{return false}}
  function saveRevision(projectId, note='') { const w=workspace(projectId), list=w.revisions ||= []; const revision=`Rev ${String(list.length).padStart(2,'0')}`; list.push({ id:crypto.randomUUID(), revision, date:new Date().toISOString(), note:String(note).slice(0,240), rows:w.rows.map(row=>({id:row.id,input:{...row.input}}) ) }); persist(); return list.at(-1); }
  function revisions(projectId){return [...(workspace(projectId).revisions||[])];}
  function compareRevisions(projectId, leftId, rightId){const list=revisions(projectId),left=list.find(x=>x.id===leftId),right=list.find(x=>x.id===rightId);if(!left||!right)return null;const L=new Map(left.rows.map(r=>[r.id,r])),R=new Map(right.rows.map(r=>[r.id,r]));const added=[],removed=[],changed=[],unchanged=[];for(const [id,row] of R){if(!L.has(id))added.push(row);else{const old=L.get(id);const fields=['dia','spacing','quantity','shape','family'];const oldC=calculate(old.input).result?.output,newC=calculate(row.input).result?.output;const changedFields=fields.filter(k=>old.input[k]!==row.input[k]);if(oldC?.cuttingLengthM!==newC?.cuttingLengthM)changedFields.push('cut length');if(oldC?.totalWeightKg!==newC?.totalWeightKg)changedFields.push('total weight');(changedFields.length?changed:unchanged).push({old,row,changedFields});}}for(const [id,row] of L)if(!R.has(id))removed.push(row);return{added,removed,changed,unchanged};}
  function exportData(projectId,type){const a=analysis(projectId), revision=revisions(projectId).at(-1)?.revision||'Draft', info=[['Project',projectId],['Revision',revision],['Generated',new Date().toISOString()],['Engine version',window.ENGINE_VERSION||'bbs-v0.3-framework'],[]]; const map={Detailed:[['Mark','Member','Family','Shape','Dia','Spacing','Bars','Cut length m','Total length m','Weight kg'],...a.rows.map(r=>{const o=r.calculation.output,i=r.input;return[i.mark,i.memberType,i.family,i.shape,i.dia,i.spacing,o.totalBars,o.cuttingLengthM,o.totalLengthM,o.totalWeightKg]})],Summary:[['Total bars','Total length m','Total weight kg'],[a.total.bars,a.total.length,a.total.weight]],Diameter:[['Diameter','Bars','Total length m','Total weight kg'],...a.diameter.map(x=>[x.name,x.bars,x.length,x.weight])],Member:[['Member','Bars','Total length m','Total weight kg'],...a.member.map(x=>[x.name,x.bars,x.length,x.weight])],Shape:[['Shape','Bars','Total length m','Total weight kg'],...a.shape.map(x=>[x.name,x.bars,x.length,x.weight])],Family:[['Family','Bars','Total length m','Total weight kg'],...a.family.map(x=>[x.name,x.bars,x.length,x.weight])],Cutting:[['Diameter','Grade','Shape','Cut length m','Family','Required quantity','Total length m','Total weight kg'],...a.cutting.map(x=>[x.diameter,x.grade,x.shape,x.cutLength,x.family,x.quantity,x.totalLength,x.totalWeight])]};return[...info,...map[type]]}
  function recordExport(projectId,type,records){const item={id:crypto.randomUUID(),projectId,type,revision:revisions(projectId).at(-1)?.revision||'Draft',records,generated:new Date().toISOString(),format:'CSV',status:'Generated'};exportHistory.unshift(item);try{localStorage.setItem(exportKey,JSON.stringify(exportHistory.slice(0,100)))}catch{}return item}
  function exportsFor(projectId){return exportHistory.filter(x=>x.projectId===projectId)}

  return { shapeOptions, members, families, grades, directions, defaults, storageKey, cleanInput, validate, calculate, workspace, persist, uniqueMark, newRow, calculatedRows, analysis, getSettings, saveSettings, saveRevision, revisions, compareRevisions, exportData, recordExport, exportsFor, getStorageIssue: () => storageIssue };
})();
