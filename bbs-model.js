/* SiteQuant Pro — BBS data model. Engineering maths stays in bbs-engine.js. */
window.SiteQuant.bbsModel = (() => {
  const catalog = window.SiteQuant.bbsCatalog;
  const shapeOptions = catalog.shapes;
  const members = catalog.members;
  const families = catalog.families;
  const grades = ['Fe 415','Fe 500','Fe 500D','Fe 550'];
  const directions = ['Longitudinal','Transverse'];
  const defaults = {
    memberType:'Beam', family:'Bottom main', mark:'B1-BTM-01', description:'Beam bottom main reinforcement', material:'Fe 500D', revision:'Draft',
    reviewStatus:'Calculated', reviewedBy:'', reviewDate:'', reviewNote:'', drawingNo:'', preparedBy:'', checkedBy:'', date:'',
    length:'4.2', breadth:'0.3', depth:'0.45', cover:'25', quantity:'4', dia:'16', spacing:'150', direction:'Longitudinal', shape:'A',
    ret:'300', rise:'150', run:'150', tail:'150', uBaseLength:'4150', uLeg1:'400', uLeg2:'400', stirrupWidth:'250', stirrupDepth:'400', ringDiameter:'300',
    linkDetailingMode:'SEISMIC_IS13920_2016', dimensionBasis:'CENTRELINE', hookAngle:'135', hookExtension:'160', hookExtension2:'160', hookCount:'2', bendCount:'4', bendAllowance:'0', ringCount:'1',
    stockLength:'12000', lapMode:'AUTOMATIC', lapLength:'0', staggerLap:'true',
    zone1Length:'1000', zone1Spacing:'100', zone2Length:'2500', zone2Spacing:'150', zone3Length:'1000', zone3Spacing:'100'
  };
  const storageKey='sitequant.bbs-workspaces.v1';
  const settingsKey='sitequant.bbs-settings.v1';
  const exportKey='sitequant.bbs-exports.v1';
  const workspaces=new Map();
  let settings={units:'Metric (mm, m, kg)',grade:'Fe 500D',cover:'25',spacing:'150',wastage:'3',reviewStatus:'Calculated'};
  let exportHistory=[];
  let storageIssue='';
  const cleanInput=(value={})=>Object.fromEntries(Object.entries(defaults).map(([k,f])=>[k,(typeof value[k]==='string'||typeof value[k]==='number')?String(value[k]).slice(0,k==='description'?240:80):f]));
  function validate(input){
    const e={};
    for(const [k,label] of [['mark','Bar mark'],['description','Description'],['memberType','Member type'],['family','Reinforcement family'],['material','Steel grade'],['shape','Shape']]) if(!String(input[k]||'').trim()) e[k]=`${label} is required.`;
    for(const [k,label] of [['length','Length'],['breadth','Breadth'],['depth','Depth'],['cover','Clear cover'],['quantity','Quantity'],['dia','Diameter'],['spacing','Spacing']]){const n=Number(input[k]);if(!Number.isFinite(n)||n<=0)e[k]=`${label} must be greater than zero.`;}
    if(Number(input.cover)*2>=Number(input.depth)*1000)e.cover='Cover must leave a positive member depth.';
    if(['E','F'].includes(input.shape)){for(const [k,label] of [['stirrupWidth','Link width'],['stirrupDepth','Link depth']])if(!(Number(input[k])>0))e[k]=`${label} must be greater than zero.`;if(input.linkDetailingMode==='SEISMIC_IS13920_2016'&&Number(input.hookAngle)!==135)e.hookAngle='Seismic links use 135° hooks.';}
    return e;
  }
  function calculate(input){
    const i=cleanInput(input), errors=validate(i); if(Object.keys(errors).length)return {errors,result:null};
    const shape=catalog.byCode(i.shape); if(!shape||shape.calculation!=='engine')return {errors:{calculation:`${shape?.name||'Shape'} calculation is not implemented yet.`},result:null,planned:true};
    const transverse=i.direction==='Transverse';
    try{
      const result=window.calculateBbs({memberType:i.memberType,mark:i.mark.trim(),description:i.description.trim(),material:i.material,lengthMm:Number(transverse?i.breadth:i.length)*1000,breadthMm:Number(transverse?i.length:i.breadth)*1000,depthMm:Number(i.depth)*1000,coverMm:Number(i.cover),diaMm:Number(i.dia),spacingMm:Number(i.spacing),memberQuantity:Number(i.quantity),distributionDimensionMm:Number(transverse?i.length:i.breadth)*1000,shape:shape.engineShape,barCountPerMember:i.shape==='G'?Number(i.ringCount):undefined,stirrupWidthMm:Number(i.stirrupWidth),stirrupDepthMm:Number(i.stirrupDepth),ringDiameterMm:Number(i.ringDiameter),linkDetailingMode:i.linkDetailingMode,dimensionBasis:i.dimensionBasis,hooks:{returnLengthMm:Number(i.ret),crankRiseMm:Number(i.rise),crankRunMm:Number(i.run),tailMm:Number(i.tail),uBaseLengthMm:Number(i.uBaseLength),uLeg1Mm:Number(i.uLeg1),uLeg2Mm:Number(i.uLeg2),hookExtensionMm:Number(i.hookExtension),hookExtension2Mm:Number(i.hookExtension2),hookAngleDeg:Number(i.hookAngle),hookCount:Number(i.hookCount),bendCount:Number(i.bendCount),bendAllowanceMm:Number(i.bendAllowance)}});
      return {errors:{},result};
    }catch(error){return {errors:{calculation:error.message||'Calculation failed.'},result:null};}
  }
  function sampleRows(projectId){if(!['riverside','westend','greenfield'].includes(projectId))return[];return[
    {...defaults,mark:'B12-01',quantity:'8',description:'Level 02 · beam bottom main'},
    {...defaults,family:'Extra top / support',mark:'B12-02',quantity:'8',shape:'B',dia:'12',description:'Level 02 · end-support returns'},
    {...defaults,family:'Distribution',memberType:'Footing',mark:'F01-03',shape:'C',length:'2.4',breadth:'2.4',depth:'0.6',cover:'50',quantity:'4',uBaseLength:'2300',uLeg1:'500',uLeg2:'500',description:'Footing F01 · U reinforcement'},
    {...defaults,family:'Curtailment',memberType:'Slab',mark:'S02-08',quantity:'1',shape:'D',breadth:'3.6',depth:'0.2',dia:'10',spacing:'200',description:'Level 02 · cranked reinforcement'}
  ].map((input,index)=>({id:`sample-${projectId}-${index}`,kind:'sample',input:cleanInput(input),savedAt:'2026-09-10T10:00:00.000Z'}));}
  function workspace(id='riverside'){if(!workspaces.has(id))workspaces.set(id,{rows:sampleRows(id),draft:cleanInput({...defaults,material:settings.grade,cover:settings.cover,spacing:settings.spacing}),editingId:null,editorChanged:false});const w=workspaces.get(id);w.draft=cleanInput(w.draft);w.rows=(w.rows||[]).map(r=>({...r,input:cleanInput(r.input)}));return w;}
  function persist(){if(storageIssue)return{saved:false,message:storageIssue};try{localStorage.setItem(storageKey,JSON.stringify({version:1,projects:[...workspaces].map(([id,w])=>({id,...w}))}));return{saved:true,message:'Draft saved in this browser only.'};}catch(e){return{saved:false,message:'Browser storage is unavailable. Changes remain in memory until reload.'};}}
  function uniqueMark(mark,rows=[]){const base=String(mark||'BBS-01').trim()||'BBS-01';const used=new Set(rows.map(r=>r.input.mark.toLowerCase()));if(!used.has(base.toLowerCase()))return base;let n=2;while(used.has(`${base}-${String(n).padStart(2,'0')}`.toLowerCase()))n++;return `${base}-${String(n).padStart(2,'0')}`;}
  function newRow(input,rows=[]){return{id:`bbs-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,kind:'local',input:{...cleanInput(input),mark:uniqueMark(input.mark,rows)},savedAt:new Date().toISOString()};}
  function calculated(projectId){return workspace(projectId).rows.map(row=>({...row,calc:calculate(row.input).result})).filter(r=>r.calc);}
  function analysis(projectId){const rows=calculated(projectId),total=rows.reduce((a,r)=>{const o=r.calc.output;a.bars+=o.totalBars;a.length+=o.totalLengthM;a.weight+=o.totalWeightKg;return a},{bars:0,length:0,weight:0});const group=key=>Object.values(rows.reduce((a,r)=>{const o=r.calc.output,k=key==='diameter'?`Ø${r.input.dia} mm`:key==='member'?r.input.memberType:key==='family'?r.input.family:r.input.shape;const x=a[k]||={name:k,bars:0,length:0,weight:0};x.bars+=o.totalBars;x.length+=o.totalLengthM;x.weight+=o.totalWeightKg;return a},{}));const wastage=Number(settings.wastage)||0;return{rows,total,diameter:group('diameter'),member:group('member'),family:group('family'),shape:group('shape'),wastage:{percent:wastage,allowanceKg:total.weight*wastage/100,procurementKg:total.weight*(1+wastage/100)}};}
  function exportData(projectId='riverside',type='Detailed'){const rows=calculated(projectId),base=['Bar Mark','Member','Family','Shape','Diameter mm','Qty','Cut Length m','Total Length m','Weight kg','Drawing','Revision','Formula Version'];if(type==='Diameter'){const m={};rows.forEach(r=>m[`Ø${r.input.dia}`]=(m[`Ø${r.input.dia}`]||0)+r.calc.output.totalWeightKg);return[['Diameter','Weight kg'],...Object.entries(m)];}if(type==='Member'){const m={};rows.forEach(r=>m[r.input.memberType]=(m[r.input.memberType]||0)+r.calc.output.totalWeightKg;);return[['Member','Weight kg'],...Object.entries(m)];}return[base,...rows.map(r=>[r.input.mark,r.input.memberType,r.input.family,r.calc.input.shapeName,r.calc.input.diaMm,r.calc.output.totalBars,r.calc.output.cuttingLengthM,r.calc.output.totalLengthM,r.calc.output.totalWeightKg,r.input.drawingNo,r.input.revision,r.calc.engineVersion])];}
  function recordExport(projectId,type,records){exportHistory.push({projectId,type,records,generated:new Date().toISOString()});try{localStorage.setItem(exportKey,JSON.stringify(exportHistory.slice(-30)));}catch{}}
  function exportsFor(projectId){return exportHistory.filter(x=>x.projectId===projectId);}
  try{const s=JSON.parse(localStorage.getItem(settingsKey)||'null');if(s)settings={...settings,...s};const h=JSON.parse(localStorage.getItem(exportKey)||'[]');if(Array.isArray(h))exportHistory=h;const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.projects)for(const p of saved.projects)workspaces.set(p.id,{...p,draft:cleanInput(p.draft),rows:(p.rows||[]).map(r=>({...r,input:cleanInput(r.input)}))});}catch{storageIssue='Saved BBS data could not be read.';}
  return{shapeOptions,members,families,grades,directions,defaults,cleanInput,validate,calculate,workspace,persist,newRow,uniqueMark,analysis,exportData,recordExport,exportsFor,get settings(){return settings;},set settings(v){settings={...settings,...v};}};
})();
