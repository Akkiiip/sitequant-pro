/* UI validation, unit/axis adapter and local storage. Engineering maths stays in the engine. */
window.SiteQuant.bbsModel = (() => {
  const catalog = window.SiteQuant.bbsCatalog;
  const shapeOptions = catalog.shapes;
  const members = catalog.members;
  const families = catalog.families;
  const grades = ['Fe 415', 'Fe 500', 'Fe 500D', 'Fe 550'];
  const directions = ['Longitudinal', 'Transverse'];
  const defaults = {
    memberType: 'Beam', family: 'Bottom main', mark: 'B1-BTM-01', description: 'Beam bottom main reinforcement',
    material: 'Fe 500D', revision: 'Draft', reviewStatus: 'Calculated', reviewedBy: '', reviewDate: '', reviewNote: '',
    drawingNo: '', preparedBy: '', checkedBy: '', date: '', length: '4.2', breadth: '0.3', depth: '0.45', cover: '25',
    quantity: '4', dia: '16', spacing: '150', direction: 'Longitudinal', shape: 'A', ret: '300', rise: '150', run: '150', tail: '150',
    uBaseLength: '4150', uLeg1: '400', uLeg2: '400', stirrupWidth: '250', stirrupDepth: '400', ringDiameter: '300',
    linkDetailingMode: 'SEISMIC_IS13920_2016', dimensionBasis: 'CENTRELINE', hookAngle: '135', hookExtension: '160', hookExtension2: '160',
    hookCount: '2', bendCount: '4', bendAllowance: '0', ringCount: '1',
    stockLength: '12000', lapMode: 'AUTOMATIC', lapLength: '0', staggerLap: 'true',
    zone1Length: '1000', zone1Spacing: '100', zone2Length: '2500', zone2Spacing: '150', zone3Length: '1000', zone3Spacing: '100'
  };
  const storageKey = 'sitequant.bbs-workspaces.v1';
  const workspaces = new Map();
  const settingsKey = 'sitequant.bbs-settings.v1';
  const defaultSettings = { units: 'Metric (mm, m, kg)', grade: 'Fe 500D', cover: '25', spacing: '150', wastage: '3', reviewStatus: 'Calculated' };
  let settings = { ...defaultSettings };
  const exportKey = 'sitequant.bbs-exports.v1'; let exportHistory = [];
  let storageIssue = '';

  function cleanInput(value = {}) {
    const input = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof value[key] === 'string' || typeof value[key] === 'number' ? String(value[key]).slice(0, key === 'description' ? 240 : 80) : fallback]));
    if (['C','I'].includes(input.shape)) {
      const coverMm = Number(input.cover) || 0;
      const lengthMm = (Number(input.length) || 0) * 1000;
      const depthMm = (Number(input.depth) || 0) * 1000;
      if (value.uBaseLength === undefined) input.uBaseLength = String(Math.max(1, lengthMm - 2 * coverMm));
      if (value.uLeg1 === undefined) input.uLeg1 = String(Math.max(1, depthMm - 2 * coverMm));
      if (value.uLeg2 === undefined) input.uLeg2 = String(Math.max(1, depthMm - 2 * coverMm));
    }
    return input;
  }

  function load() {
    try { const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}'); Object.entries(parsed).forEach(([id, value]) => workspaces.set(id, value)); const savedSettings = JSON.parse(localStorage.getItem(settingsKey) || 'null'); if (savedSettings) settings = { ...defaultSettings, ...savedSettings }; exportHistory = JSON.parse(localStorage.getItem(exportKey) || '[]'); }
    catch (error) { storageIssue = error.message || 'Browser storage unavailable'; }
  }
  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(workspaces))); localStorage.setItem(settingsKey, JSON.stringify(settings)); localStorage.setItem(exportKey, JSON.stringify(exportHistory.slice(-30))); return { saved: true, message: 'BBS workspace saved in this browser.' }; } catch (error) { storageIssue = error.message || 'Browser storage unavailable'; return { saved: false, message: storageIssue }; } }
  function workspace(projectId = 'riverside') { if (!workspaces.has(projectId)) workspaces.set(projectId, { draft: cleanInput(), editingId: null, editorChanged: false, rows: [] }); const current = workspaces.get(projectId); current.draft = cleanInput(current.draft); current.rows = (current.rows || []).map(row => ({ ...row, input: cleanInput(row.input) })); return current; }
  function validate(input) { const errors = {}; const numeric = ['length','breadth','depth','cover','quantity','dia']; numeric.forEach(key => { if (!(Number(input[key]) > 0)) errors[key] = 'Enter a value greater than zero.'; }); if (!shapeOptions.some(shape => shape.code === input.shape)) errors.shape = 'Select a supported shape.'; if (['E','F'].includes(input.shape) && (!(Number(input.stirrupWidth) > 0) || !(Number(input.stirrupDepth) > 0))) errors.calculation = 'Enter valid link dimensions.'; return errors; }
  function calculate(input) { const cleaned = cleanInput(input); const errors = validate(cleaned); if (Object.keys(errors).length) return { errors, result: null }; const engine = window.SiteQuant.bbsEngine; const result = engine.calculate(cleaned); return { errors: result.errors || {}, result: result.result || result }; }
  function newRow(input, rows = []) { const cleaned = cleanInput(input); return { id: `bbs-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, kind: 'local', savedAt: new Date().toISOString(), input: { ...cleaned, mark: uniqueMark(cleaned.mark, rows) } }; }
  function uniqueMark(mark, rows = []) { const base = (mark || 'BBS-01').trim() || 'BBS-01'; if (!rows.some(row => row.input.mark === base)) return base; let n = 2; while (rows.some(row => row.input.mark === `${base}-${String(n).padStart(2,'0')}`)) n++; return `${base}-${String(n).padStart(2,'0')}`; }
  function analysis(projectId = 'riverside') { const rows = workspace(projectId).rows; const calculated = rows.map(row => calculate(row.input).result?.output).filter(Boolean); const weight = calculated.reduce((a,o)=>a+(o.totalWeightKg||0),0); const length = calculated.reduce((a,o)=>a+(o.totalLengthM||0),0); const bars = calculated.reduce((a,o)=>a+(o.totalBars||0),0); const percent = Number(settings.wastage)||0; const allowanceKg = weight*percent/100; const cutting = rows.map(row => { const r=calculate(row.input).result; return r ? { diameter: r.input.diaMm, grade:r.input.material, shape:r.input.shape, family:r.input.family, quantity:r.output.totalBars, cutLength:r.output.cuttingLengthM, totalLength:r.output.totalLengthM, totalWeight:r.output.totalWeightKg } : null; }).filter(Boolean); return { total:{weight,length,bars}, wastage:{percent,allowanceKg,procurementKg:weight+allowanceKg}, cutting }; }
  function exportData(projectId='riverside', type='Detailed') { const rows=workspace(projectId).rows.map(row=>calculate(row.input).result).filter(Boolean); const base=['Bar Mark','Member','Family','Shape','Diameter mm','Qty','Cut Length m','Total Length m','Weight kg','Drawing','Revision','Formula Version']; const data=rows.map(r=>[r.input.mark,r.input.memberType,r.input.family,r.input.shapeName,r.input.diaMm,r.output.totalBars,r.output.cuttingLengthM,r.output.totalLengthM,r.output.totalWeightKg,r.input.drawingNo,r.input.revision,r.engineVersion]); if(type==='Diameter') { const map={}; rows.forEach(r=>{const k=`Ø${r.input.diaMm}`;map[k]=(map[k]||0)+(r.output.totalWeightKg||0)}); return [['Diameter','Weight kg'],...Object.entries(map)]; } if(type==='Member') { const map={}; rows.forEach(r=>{const k=r.input.memberType;map[k]=(map[k]||0)+(r.output.totalWeightKg||0)}); return [['Member','Weight kg'],...Object.entries(map)]; } if(type==='Shape') { const map={}; rows.forEach(r=>{const k=r.input.shapeName;map[k]=(map[k]||0)+(r.output.totalWeightKg||0)}); return [['Shape','Weight kg'],...Object.entries(map)]; } return [base,...data]; }
  function recordExport(projectId,type,records) { exportHistory.push({projectId,type,records,generated:new Date().toISOString()}); persist(); }
  function exportsFor(projectId='riverside') { return exportHistory.filter(x=>x.projectId===projectId); }
  function shapeOptionsForMember(member) { return shapeOptions.filter(shape => shape.applicableMembers.includes(member)); }
  load();
  return { shapeOptions,members,families,grades,directions,defaults,cleanInput,validate,calculate,workspace,persist,newRow,uniqueMark,analysis,exportData,recordExport,exportsFor,shapeOptionsForMember,get settings(){return settings;},set settings(value){settings={...settings,...value};} };
})();
