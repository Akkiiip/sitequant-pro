/* SiteQuant Pro product-grade BBS workflow layer.
   Keeps engineering maths in bbs-engine.js and adds workflow conveniences around it. */
(() => {
  const STORAGE='sitequant.bbs-product.v1';
  const prefixByMember={Beam:'B',Column:'C',Slab:'S',Footing:'F',Staircase:'ST',Wall:'W',Pile:'P','Pile Cap':'PC',Raft:'R','Retaining Wall':'RW','Custom Member':'M'};
  let store={projects:{}};
  let root=null, model=null, originalCalculate=null, patching=false;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projectId=()=>root?.querySelector('#bbs-project')?.value||'riverside';
  const workspace=()=>model?.workspace(projectId());
  const projectState=()=>{const id=projectId();store.projects[id] ||= {metadata:{drawingNo:'',revision:'R0',preparedBy:''},zones:{},fabrication:{},draftMarks:{}};return store.projects[id]};
  const saveStore=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(store));}catch{}};
  const loadStore=()=>{try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null');if(v&&typeof v==='object')store=v;}catch{store={projects:{}}}};

  function nextMark(memberType){
    const rows=workspace()?.rows||[], prefix=prefixByMember[memberType]||'M'; let max=0;
    const re=new RegExp(`^${prefix}(\\d+)$`,'i');
    rows.forEach(row=>{const m=re.exec(String(row.input?.mark||'').trim());if(m)max=Math.max(max,Number(m[1]));});
    return `${prefix}${max+1}`;
  }

  function normalizeDirection(){
    if(!model||!root)return;
    const select=root.querySelector('#bbs-direction'); if(!select)return;
    if(!model.__sqOriginalCalculateDirection){model.__sqOriginalCalculateDirection=model.calculate;model.calculate=input=>model.__sqOriginalCalculateDirection({...input,direction:(input.direction==='Distribution'||input.direction==='Transverse')?'Transverse':'Longitudinal'});}
    model.directions=['Main','Distribution'];
    const draft=workspace()?.draft;
    if(draft&&(draft.direction==='Transverse'||draft.direction==='Longitudinal'||!draft.direction))draft.direction=draft.direction==='Transverse'?'Distribution':'Main';
    if(select.dataset.productDirections!=='1'){
      select.innerHTML='<option value="Main">Main</option><option value="Distribution">Distribution</option>';
      select.dataset.productDirections='1';
    }
    select.value=draft?.direction||'Main';
    const label=select.parentElement?.firstChild;if(label?.nodeType===Node.TEXT_NODE)label.nodeValue='Bar arrangement ';
    const hint=root.querySelector('#bbs-direction-hint');if(hint)hint.textContent=select.value==='Distribution'?'Distribution bars run across the member and are spaced along the main span.':'Main bars follow the member span and are distributed across the perpendicular dimension.';
  }

  function removeReviewWorkflow(){
    if(!root)return;
    const field=root.querySelector('[data-bbs-field="reviewStatus"]');const fs=field?.closest('fieldset');if(fs)fs.remove();
    root.querySelector('#bbs-calculation-state')?.querySelectorAll('.bbs-badge--review').forEach(x=>x.remove());
    const th=[...root.querySelectorAll('.bbs-table thead th')].find(x=>x.textContent.trim()==='Status');
    if(th){const idx=[...th.parentElement.children].indexOf(th);th.remove();root.querySelectorAll('.bbs-table tbody tr').forEach(tr=>tr.children[idx]?.remove());}
    root.classList.add('sq-bbs-hide-review','sq-bbs-status-clean');
  }

  function setupWorkflowHeader(){
    if(!root)return;
    let host=root.querySelector('.sq-bbs-workflow');
    if(!host){
      host=document.createElement('section');host.className='sq-bbs-workflow';
      const context=root.querySelector('.bbs-context');
      (context||root.firstElementChild)?.after(host);
    }
    const state=projectState(),draft=workspace()?.draft||{};
    const meta=state.metadata;
    host.innerHTML=`<div class="sq-bbs-workflow-main"><span class="sq-bbs-family-pill">${esc(draft.family||'Reinforcement')}</span><div><strong>${esc(draft.memberType||'Member')} · ${esc(draft.description||'BBS item')}</strong><span>${esc(draft.mark||'') } · Ø${esc(draft.dia||'')} · ${esc(draft.spacing||'')} mm c/c</span></div></div><div class="sq-bbs-workflow-meta"><div class="sq-bbs-meta-field"><label>Drawing no.</label><input data-sq-meta="drawingNo" value="${esc(meta.drawingNo)}" placeholder="S-104"></div><div class="sq-bbs-meta-field"><label>Revision</label><input data-sq-meta="revision" value="${esc(meta.revision)}" placeholder="R0"></div><div class="sq-bbs-meta-field"><label>Prepared by</label><input data-sq-meta="preparedBy" value="${esc(meta.preparedBy)}" placeholder="Engineer"></div><div class="sq-bbs-meta-field"><label>Member purpose</label><input data-sq-meta="purpose" value="${esc(draft.family||'') }" placeholder="Bottom main"></div></div>`;
    host.querySelector('[data-sq-meta="purpose"]').value=draft.family||'';host.querySelector('[data-sq-meta="purpose"]').readOnly=true;
  }

  function makeResultToggle(){
    const result=root?.querySelector('.bbs-result');if(!result||result.dataset.productToggle)return;
    const heading=result.querySelector('.bbs-result-heading');if(!heading)return;
    result.dataset.productToggle='1';const title=heading.querySelector('.sq-eyebrow');if(title)title.textContent='CALCULATION RESULT';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='bbs-result-toggle';toggle.innerHTML='<span>Details</span><span aria-hidden="true">›</span>';toggle.setAttribute('aria-expanded','false');
    heading.appendChild(toggle);
    const details=document.createElement('div');details.id='bbs-result-details';details.className='bbs-result-details';
    [...result.children].filter(n=>n!==heading).forEach(n=>details.appendChild(n));result.appendChild(details);result.classList.add('bbs-result--collapsed');
    toggle.addEventListener('click',()=>{const open=result.classList.toggle('bbs-result--expanded');result.classList.toggle('bbs-result--collapsed',!open);toggle.setAttribute('aria-expanded',String(open));toggle.innerHTML=`<span>${open?'Hide':'Details'}</span><span aria-hidden="true">${open?'‹':'›'}</span>`;});
  }

  function hookGeometry(shape){
    const draft=workspace()?.draft;if(!draft)return;
    const cover=Number(draft.cover)||0,b=Number(draft.breadth||0)*1000,d=Number(draft.depth||0)*1000;
    if(!['E','F'].includes(shape))return;
    const autoW=Math.max(1,b-2*cover),autoD=Math.max(1,d-2*cover);
    const state=projectState(), key=draft.mark||'__draft__';const flags=state.fabrication[key] ||= {};
    if(!flags.widthEdited) draft.stirrupWidth=String(autoW);
    if(!flags.depthEdited) draft.stirrupDepth=String(autoD);
  }

  function zoneKey(input){return `${projectId()}::${String(input?.mark||'__draft__')}`}
  function getZones(input){return projectState().zones[zoneKey(input)]||[{length:'',spacing:''},{length:'',spacing:''},{length:'',spacing:''}]}
  function zoneCounts(zones){
    const active=zones.filter(z=>Number(z.length)>0&&Number(z.spacing)>0);let total=0;
    active.forEach(z=>{total+=Math.floor(Number(z.length)/Number(z.spacing))+1;});
    return Math.max(0,total-Math.max(0,active.length-1));
  }

  function renderLinkExtras(){
    const shape=workspace()?.draft?.shape;if(!['E','F'].includes(shape))return;
    const host=root?.querySelector('#bbs-shape-parameters');if(!host)return;
    if(host.dataset.productLink==='1')return;
    host.dataset.productLink='1';hookGeometry(shape);const draft=workspace().draft,state=projectState(),zones=getZones(draft),fab=state.fabrication[zoneKey(draft)]||{};
    host.insertAdjacentHTML('beforeend',`<div class="sq-bbs-shape-tools"><span class="sq-bbs-auto-note">Centreline dimensions are derived from member size and cover by default.</span><button type="button" class="sq-bbs-mini-action" data-sq-edit-link>Adjust link dimensions</button></div><details class="sq-bbs-zones"><summary>Stirrup zones · optional</summary><div class="sq-bbs-zone-head"><span>Zone length</span><span>Spacing</span><span>Count</span></div>${zones.map((z,i)=>`<div class="sq-bbs-zone-row"><input data-sq-zone="${i}" data-sq-zone-field="length" value="${esc(z.length)}" placeholder="e.g. 1000"><input data-sq-zone="${i}" data-sq-zone-field="spacing" value="${esc(z.spacing)}" placeholder="e.g. 100"><span class="sq-bbs-zone-count" data-sq-zone-count="${i}">—</span></div>`).join('')}<p class="sq-bbs-zone-note">Adjacent zone boundaries are counted once. Leaving all zones blank keeps the standard spacing calculation.</p></details><details class="sq-bbs-fabrication"><summary>Fabrication & laps · optional</summary><div class="sq-bbs-fab-grid"><label class="bbs-field"><span>Stock length</span><input class="bbs-input" data-sq-fab="stock" type="number" min="1000" step="1" value="${esc(fab.stock||12000)}"><small class="bbs-field-hint">mm</small></label><label class="bbs-field"><span>Lap length</span><input class="bbs-input" data-sq-fab="lap" type="number" min="0" step="1" value="${esc(fab.lap||600)}"><small class="bbs-field-hint">mm</small></label></div><label class="sq-bbs-fab-check"><input type="checkbox" data-sq-fab="includeLap" ${fab.includeLap?'checked':''}> Include lap allowance in theoretical steel quantity</label><p class="sq-bbs-zone-note">Without this option, SiteQuant only reports the fabrication segmentation advisory and does not alter theoretical BBS weight.</p></details>`);
    updateZoneCounts();
  }

  function updateZoneCounts(){
    if(!root)return;const zones=[0,1,2].map(i=>({length:root.querySelector(`[data-sq-zone="${i}"][data-sq-zone-field="length"]`)?.value||'',spacing:root.querySelector(`[data-sq-zone="${i}"][data-sq-zone-field="spacing"]`)?.value||''}));
    zones.forEach((z,i)=>{const n=Number(z.length)>0&&Number(z.spacing)>0?Math.floor(Number(z.length)/Number(z.spacing))+1:0;const el=root.querySelector(`[data-sq-zone-count="${i}"]`);if(el)el.textContent=n?`${n} bars`:'—';});
    const total=zoneCounts(zones);let note=root.querySelector('.sq-bbs-zones .sq-bbs-zone-note');if(note&&total)note.textContent=`Estimated ${total} bars/member from these zones. Adjacent boundaries are counted once.`;
  }

  function patchZoneCalculation(){
    if(!model||model.__sqProductCalcPatched)return;
    originalCalculate=model.calculate;model.__sqProductCalcPatched=true;
    model.calculate=input=>{
      const base=originalCalculate(input);if(!base.result||!['E','F'].includes(input.shape))return base;
      const state=store.projects[projectId()];const zones=state?.zones?.[zoneKey(input)]||[];const active=zones.filter(z=>Number(z.length)>0&&Number(z.spacing)>0);
      const fab=state?.fabrication?.[zoneKey(input)]||{};
      let result=base.result;
      if(active.length){
        const per=zoneCounts(active);const totalBars=per*Number(input.quantity||1);const cut=result.output.cuttingLengthM;let totalLengthM=cut*totalBars;let lapInfo={segments:1,laps:0,extraMm:0};
        const stock=Number(fab.stock||12000),lap=Number(fab.lap||600);const cutMm=result.output.cuttingLengthMm;
        if(stock>0&&cutMm>stock){const segments=Math.ceil(cutMm/stock);lapInfo={segments,laps:segments-1,extraMm:(segments-1)*lap};if(fab.includeLap)totalLengthM=((cutMm+lapInfo.extraMm)/1000)*totalBars;}
        const weight=totalLengthM*result.output.unitWeightKgPerM;
        result={...result,output:{...result.output,barsPerMember:per,totalBars,totalLengthM:Number(totalLengthM.toFixed(3)),totalWeightKg:Number(weight.toFixed(2)),totalWeightTonnes:Number((weight/1000).toFixed(3))},trace:[...result.trace,`Stirrup zones = ${active.map(z=>`${z.length} mm @ ${z.spacing} mm c/c`).join(' + ')}`,`Bars / member from zones = ${per}`,`Fabrication stock = ${stock} mm; ${lapInfo.laps?`${lapInfo.segments} pieces with ${lapInfo.laps} lap${lapInfo.laps===1?'':'s'}`:'single-piece length'}`,...(fab.includeLap&&lapInfo.laps?[`Lap allowance included = ${lapInfo.extraMm} mm/bar`]:[])]};
      } else if(fab.stock){
        const stock=Number(fab.stock||12000),cutMm=result.output.cuttingLengthMm;if(cutMm>stock){const pieces=Math.ceil(cutMm/stock);result={...result,trace:[...result.trace,`Fabrication advisory = ${pieces} stock pieces needed for one theoretical bar; lap setting may be applied separately.`]};}
      }
      return {...base,result};
    };
  }

  function professionalTools(){
    if(!root)return;
    const actions=root.querySelector('.bbs-top-actions');if(!actions||actions.querySelector('[data-sq-export-package]'))return;
    actions.insertAdjacentHTML('beforeend','<button type="button" class="sq-button sq-button--secondary" data-sq-export-package>Export package</button><button type="button" class="sq-button sq-button--secondary" data-sq-print>Print / PDF</button>');
    const heading=root.querySelector('.bbs-schedule-heading');
    if(heading&&!heading.querySelector('.sq-bbs-boq-card'))heading.insertAdjacentHTML('afterend',`<div class="sq-bbs-boq-card"><div><strong id="sq-bbs-boq-weight">0.00 kg</strong><span>BBS theoretical steel available for BOQ</span></div><button type="button" class="sq-button sq-button--secondary" data-sq-send-boq>Send to BOQ</button></div>`);
    const result=root.querySelector('#bbs-result');if(result&&!result.querySelector('.sq-bbs-basis')){
      const basis=document.createElement('div');basis.className='sq-bbs-basis';basis.innerHTML='<b>Calculation basis</b><dl><dt>Dimensions</dt><dd id="sq-basis-dim">Centreline / specified</dd><dt>Hooks</dt><dd id="sq-basis-hook">Drawing / selected detailing</dd><dt>Engine</dt><dd id="sq-basis-engine">Versioned SiteQuant engine</dd></dl>';result.querySelector('.bbs-result-details')?.appendChild(basis);
    }
  }

  function refreshBOQ(){
    const el=root?.querySelector('#sq-bbs-boq-weight');if(!el)return;let kg=0;workspace()?.rows?.forEach(r=>{const c=model.calculate(r.input).result?.output;if(c)kg+=c.totalWeightKg;});const d=model.calculate(workspace()?.draft||{}).result?.output;if(d&&!workspace()?.editingId)kg+=0;el.textContent=`${kg.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})} kg`;
  }

  function exportPackage(){
    const rows=workspace()?.rows||[];const resultRows=rows.map(r=>model.calculate(r.input).result).filter(Boolean);if(!resultRows.length)return;
    const meta=projectState().metadata;const header=['Drawing No','Revision','Prepared By','Bar Mark','Member','Family','Shape','Diameter','Qty','Cutting Length m','Total Length m','Weight kg','Engine'];
    const data=resultRows.map(r=>[meta.drawingNo,meta.revision,meta.preparedBy,r.input.mark,r.input.memberType,r.input.family,r.input.shapeName,r.input.diaMm,r.output.totalBars,r.output.cuttingLengthM,r.output.totalLengthM,r.output.totalWeightKg,r.engineVersion]);
    const basis=[['SiteQuant Pro BBS Basis'],['Drawing No',meta.drawingNo],['Revision',meta.revision],['Prepared By',meta.preparedBy],['Dimension convention','Centreline / specified per item'],['Hook / bend convention','Versioned detailing engine'],['Status','Engineering review required before construction issue']];
    const csv=(arr)=>arr.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const download=(name,text)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
    download(`SiteQuant_${projectId()}_BBS.csv`,csv([header,...data]));setTimeout(()=>download(`SiteQuant_${projectId()}_BBS_basis.csv`,csv(basis)),250);
  }

  function bind(){
    root=document.querySelector('.bbs-workspace');model=window.SiteQuant?.bbsModel;if(!root||!model)return;loadStore();patchZoneCalculation();
    normalizeDirection();removeReviewWorkflow();setupWorkflowHeader();makeResultToggle();renderLinkExtras();professionalTools();refreshBOQ();
    const draft=workspace()?.draft;
    if(draft&&!workspace().editingId&&(draft.mark===''||draft.mark==='B12-01')){draft.mark=nextMark(draft.memberType);const m=root.querySelector('#bbs-mark');if(m)m.value=draft.mark;}
    root.addEventListener('input',e=>{
      if(e.target.matches('[data-sq-meta]')){projectState().metadata[e.target.dataset.sqMeta]=e.target.value;saveStore();}
      if(e.target.matches('[data-sq-zone]')){const i=Number(e.target.dataset.sqZone),field=e.target.dataset.sqZoneField;const d=workspace()?.draft;if(!d)return;const arr=getZones(d);arr[i][field]=e.target.value;projectState().zones[zoneKey(d)]=arr;saveStore();updateZoneCounts();}
      if(e.target.matches('[data-sq-fab]')){const d=workspace()?.draft;if(!d)return;const f=projectState().fabrication[zoneKey(d)] ||= {};if(e.target.type==='checkbox')f[e.target.dataset.sqFab]=e.target.checked;else f[e.target.dataset.sqFab]=e.target.value;saveStore();}
      if(e.target.matches('#bbs-stirrupWidth'))projectState().fabrication[zoneKey(workspace().draft)] ||= {},projectState().fabrication[zoneKey(workspace().draft)].widthEdited=true;
      if(e.target.matches('#bbs-stirrupDepth'))projectState().fabrication[zoneKey(workspace().draft)] ||= {},projectState().fabrication[zoneKey(workspace().draft)].depthEdited=true;
    },true);
    root.addEventListener('click',e=>{
      const edit=e.target.closest('[data-sq-edit-link]');if(edit){root.querySelectorAll('#bbs-stirrupWidth,#bbs-stirrupDepth').forEach(x=>{x.readOnly=false;x.focus();});return;}
      if(e.target.closest('[data-sq-export-package]'))exportPackage();
      if(e.target.closest('[data-sq-print]'))window.print();
      if(e.target.closest('[data-sq-send-boq]')){const kg=Number((root.querySelector('#sq-bbs-boq-weight')?.textContent||'0').replace(/[^0-9.]/g,''))||0;localStorage.setItem('sitequant.boq.steelDraft',JSON.stringify({projectId:projectId(),weightKg:kg,source:'BBS',savedAt:new Date().toISOString()}));const status=document.querySelector('#sq-status');if(status){status.textContent='BBS steel quantity sent to BOQ draft.';status.classList.add('sq-toast--show');setTimeout(()=>status.classList.remove('sq-toast--show'),2200);}}
    },true);
  }

  const observer=new MutationObserver(()=>{const next=document.querySelector('.bbs-workspace');if(next!==root){root=null;setTimeout(bind,0);}else if(root){normalizeDirection();removeReviewWorkflow();setupWorkflowHeader();makeResultToggle();renderLinkExtras();professionalTools();refreshBOQ();}});
  const boot=()=>{const view=document.querySelector('#view');if(view)observer.observe(view,{childList:true,subtree:true});bind();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
