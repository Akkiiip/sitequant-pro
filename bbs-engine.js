/* Versioned calculation engine. UI catalog and rendering must not contain engineering maths. */
const ENGINE_VERSION='bbs-v0.6-link-centreline';
const REVIEW_STATUS='framework — engineering review required';
const meta={bendingFixing:'IS 2502:1963 / project detailing reference basis',concreteReference:'IS 456:2000 + amendments',status:REVIEW_STATUS};
const SHAPES={
 STRAIGHT:{code:'A',name:'Straight',dimensions:['L'],build:({L})=>L,trace:({L})=>[`L = ${L} mm (clear bar-axis length)`]},
 L_BAR:{code:'B',name:'L bar',dimensions:['A','B'],build:({A,B})=>A+B,trace:({A,B})=>[`A = ${A} mm (clear bar-axis length)`,`B = ${B} mm (specified return)`,`Cut length = A + B`]},
 U_BAR:{code:'C',name:'U bar / inverted U',dimensions:['A','B','C'],build:({A,B,C})=>A+B+C,trace:({A,B,C})=>[`Base = ${A} mm (specified bar-axis length)`,`Leg 1 = ${B} mm (specified)`,`Leg 2 = ${C} mm (specified)`,`Cut length = Base + Leg 1 + Leg 2`]},
 CRANKED:{code:'D',name:'Cranked / bent-up',dimensions:['A','B','C','D','E'],build:({A,B,C,D,E})=>A+B+C+D+E,trace:({A,B,C,D,E})=>[`A = ${A} mm (clear length)`,`B = ${B} mm (specified rise)`,`C = ${C} mm (specified run)`,`D = ${D} mm (clear breadth)`,`E = ${E} mm (specified tail)`,`Cut length = A + B + C + D + E (framework additive dimensions)`]},
 RECTANGULAR_STIRRUP:{code:'E',name:'Rectangular stirrup / link',dimensions:['W','D','H1','H2'],build:({W,D,H1,H2,bendDeduction})=>2*W+2*D+H1+H2-bendDeduction,trace:linkTrace},
 COLUMN_TIE:{code:'F',name:'Closed column link / tie',dimensions:['W','D','H1','H2'],build:({W,D,H1,H2,bendDeduction})=>2*W+2*D+H1+H2-bendDeduction,trace:linkTrace},
 CIRCULAR_RING:{code:'G',name:'Circular ring',dimensions:['D','H1','H2'],build:({D,H1,H2})=>Math.PI*D+H1+H2,trace:({D,H1,H2})=>[`D = ${D} mm (centreline diameter)`,`Circumference = π × D = ${round(Math.PI*D,1)} mm`,`Hook/closure extensions = ${H1} + ${H2} mm (specified)`,`Cut length = πD + H1 + H2`]}
};
function positive(v,l){const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error(`${l} must be non-negative.`);return n}
function nonzero(v,l){const n=positive(v,l);if(n<=0)throw Error(`${l} must be greater than zero.`);return n}
function integer(v,l,min=1){const n=Number(v);if(!Number.isSafeInteger(n)||n<min)throw Error(`${l} must be a whole number of at least ${min}.`);return n}
function round(v,d=3){const p=10**d;return Math.round(v*p)/p}
function unitWeightKgPerM(d){return d*d/162}
function numberOfBars(clear,spacing){if(spacing<=0)throw Error('Spacing must be greater than zero.');return clear<=0?1:Math.floor(clear/spacing)+1}
function hooks(i){const h=i.hooks||{};return {H1:positive(h.hookExtensionMm??0,'Hook extension 1'),H2:positive(h.hookExtension2Mm??h.hookExtensionMm??0,'Hook extension 2')}}
function linkDetailing(i,d){
 const h=i.hooks||{}, mode=String(i.linkDetailingMode||'SEISMIC_IS13920_2016');
 const allowed=['GENERAL_IS2502_REFERENCE','SEISMIC_IS13920_2016','DRAWING_SPECIFIED','CUSTOM'];
 if(!allowed.includes(mode))throw Error('Choose a supported link detailing basis.');
 const angle=nonzero(h.hookAngleDeg??135,'Hook angle');
 let H1,H2,hookBendDeduction,rule,reference;
 if(mode==='SEISMIC_IS13920_2016'){
   if(angle!==135)throw Error('Seismic link detailing requires a 135° hook.');
   H1=H2=Math.max(10*d,75);
   hookBendDeduction=3*d;
   rule='10d extension with 75 mm minimum';
   reference='IS 13920:2016 seismic link detailing';
 } else {
   H1=positive(h.hookExtensionMm, 'Hook extension 1');
   H2=positive(h.hookExtension2Mm??h.hookExtensionMm, 'Hook extension 2');
   hookBendDeduction=angle===135?3*d:angle===90?2*d:0;
   rule=mode==='GENERAL_IS2502_REFERENCE'?'Project/detail drawing hook extension; 8d straight tail minimum reference':'Explicit project hook extension';
   reference=mode==='GENERAL_IS2502_REFERENCE'?'IS 2502:1963 reference basis':'Project drawing / engineer specification';
 }
 if(![90,135].includes(angle))throw Error('Closed link hook angle must be 90° or 135°.');
 const bodyBends=3;
 const bodyBendDeduction=bodyBends*2*d;
 const totalBendDeduction=bodyBendDeduction+2*hookBendDeduction;
 return{mode,angle,H1,H2,hookBendDeduction,bodyBends,bodyBendDeduction,totalBendDeduction,rule,reference};
}
function linkTrace({W,D,H1,H2,detail}){return [
 `Centreline perimeter = 2 × ${W} + 2 × ${D} = ${round(2*W+2*D,1)} mm`,
 `Hook extensions = ${H1} + ${H2} = ${round(H1+H2,1)} mm`,
 `Body bends = ${detail.bodyBends} × 90° × 2d = ${round(detail.bodyBendDeduction,1)} mm deduction`,
 `Hook bends = 2 × ${detail.angle}° × ${round(detail.hookBendDeduction,1)} mm = ${round(detail.hookBendDeduction*2,1)} mm deduction`,
 `Total bend deduction = ${round(detail.totalBendDeduction,1)} mm`,
 `Cut length = centreline perimeter + hook extensions − bend deductions = ${round(2*W+2*D+H1+H2-detail.totalBendDeduction,1)} mm`
]}
function centrelineDimension(value,basis,dia,label){
 const raw=nonzero(value,label);
 if(basis==='INNER')return raw+dia;
 if(basis==='OUTER'){const converted=raw-dia;if(converted<=0)throw Error(`${label} must exceed bar diameter when using outer dimensions.`);return converted;}
 return raw;
}
function dimensions(i,c){const L=nonzero(i.lengthMm,'Member length'),B=nonzero(i.breadthMm,'Member breadth'),D=nonzero(i.depthMm,'Member depth'),dia=nonzero(i.diaMm,'Bar diameter'),h=i.hooks||{};
 switch(i.shape){
 case'STRAIGHT':return{L:Math.max(0,L-2*c)};
 case'L_BAR':return{A:Math.max(0,L-2*c),B:nonzero(h.returnLengthMm??Math.max(dia*12,300),'Return length')};
 case'U_BAR':{const base=nonzero(h.uBaseLengthMm??Math.max(0,L-2*c),'U bar base length'),leg1=nonzero(h.uLeg1Mm??Math.max(0,D-2*c),'U bar leg 1'),leg2=nonzero(h.uLeg2Mm??Math.max(0,D-2*c),'U bar leg 2');return{A:base,B:leg1,C:leg2};}
 case'CRANKED':return{A:Math.max(0,L-2*c),B:nonzero(h.crankRiseMm??Math.max(dia*10,150),'Crank rise'),C:nonzero(h.crankRunMm??Math.max(dia*10,150),'Crank run'),D:Math.max(0,B-2*c),E:nonzero(h.tailMm??Math.max(dia*10,150),'Tail length')};
 case'RECTANGULAR_STIRRUP':case'COLUMN_TIE':{
   if(c*2>=B||c*2>=D)throw Error('Cover must leave a positive member dimension.');
   const basis=String(i.dimensionBasis||'CENTRELINE'),allowed=['CENTRELINE','INNER','OUTER','DRAWING_SPECIFIED'];
   if(!allowed.includes(basis))throw Error('Choose a supported dimension basis.');
   const W=centrelineDimension(i.stirrupWidthMm??B-2*c,basis,dia,'Stirrup width');
   const H=centrelineDimension(i.stirrupDepthMm??D-2*c,basis,dia,'Stirrup depth');
   const detail=linkDetailing(i,dia);
   return{W,D:H,H1:detail.H1,H2:detail.H2,detail,basis,bendDeduction:detail.totalBendDeduction};
 }
 case'CIRCULAR_RING':{const ring=nonzero(i.ringDiameterMm??B-2*c,'Ring centreline diameter');if(c*2>=B)throw Error('Cover must leave a positive ring centreline diameter.');return{D:ring,...hooks(i)}}
 default:throw Error(`Unsupported shape: ${i.shape}`)
}}
function calculateBbs(i){const c=positive(i.coverMm??0,'Clear cover'),d=nonzero(i.diaMm,'Bar diameter'),s=nonzero(i.spacingMm,'Spacing'),q=integer(i.memberQuantity??1,'Number of identical members'),shape=SHAPES[i.shape];if(!shape)throw Error(`Unsupported shape: ${i.shape}`);const L=nonzero(i.lengthMm,'Member length'),B=nonzero(i.breadthMm,'Member breadth'),D=nonzero(i.depthMm,'Member depth'),dist=nonzero(i.distributionDimensionMm??B,'Distribution dimension'),clear=Math.max(0,dist-2*c),bars=i.barCountPerMember===undefined?numberOfBars(clear,s):integer(i.barCountPerMember,'Bars per member'),dims=dimensions(i,c),cut=shape.build({...dims,bendDeduction:dims.bendDeduction||0}),uw=unitWeightKgPerM(d),totalBars=bars*q,totalLength=(cut/1000)*totalBars,totalWeight=totalLength*uw,detail=dims.detail;
 const {detail:detailMeta,basis,...dimensionValues}=dims;
 return{engineVersion:ENGINE_VERSION,standards:meta,assumptions:['Link width and depth are treated as centreline dimensions by default.','Closed rectangular links use three 90° body bends plus two hook bends; bend deductions are applied separately from hook extensions.','Seismic 135° hooks use a 10d extension with a 75 mm minimum.','Engineering review required before construction issue.'],input:{memberType:i.memberType,mark:i.mark,description:i.description,material:i.material,lengthMm:L,breadthMm:B,depthMm:D,coverMm:c,diaMm:d,spacingMm:s,memberQuantity:q,shape:shape.code,shapeName:shape.name,dimensionsMm:dimensionValues,linkDetailing:detailMeta&&{dimensionBasis:basis,hookAngleDeg:detailMeta.angle,hookExtensionRule:detailMeta.rule,hookExtensionMm:detailMeta.H1,hookExtension2Mm:detailMeta.H2,bodyBends:detailMeta.bodyBends,bodyBendDeductionMm:detailMeta.bodyBendDeduction,hookBendDeductionMm:detailMeta.hookBendDeduction,totalBendDeductionMm:detailMeta.totalBendDeduction,detailingBasis:detailMeta.reference}},output:{barsPerMember:bars,totalBars,cuttingLengthMm:round(cut,1),cuttingLengthM:round(cut/1000,3),unitWeightKgPerM:round(uw,3),totalLengthM:round(totalLength,3),totalWeightKg:round(totalWeight,2),totalWeightTonnes:round(totalWeight/1000,3)},trace:[`Clear distribution = ${round(clear,1)} mm`,`Bars / member = ${i.barCountPerMember===undefined?`floor(${round(clear,1)} / ${s}) + 1 = ${bars}`:`specified ${bars}`}`,...(detailMeta?[`Detailing basis = ${detailMeta.reference}`,`Dimension basis = ${basis}`,`Hook angle = ${detailMeta.angle}°`,`Hook extension rule = ${detailMeta.rule}`,`Hook extensions = ${detailMeta.H1} + ${detailMeta.H2} mm`,`Body bend deductions = ${detailMeta.bodyBendDeduction} mm`,`Hook bend deductions = ${detailMeta.hookBendDeduction*2} mm`,`Total bend deduction = ${detailMeta.totalBendDeduction} mm`]:[]),...shape.trace({...dims,bendDeduction:dims.bendDeduction||0}),`Unit weight = ${d}² / 162 = ${round(uw,3)} kg/m`,`Total bars = ${bars} × ${q} = ${totalBars}`,`Total length = ${totalBars} × ${round(cut,1)} / 1000 = ${round(totalLength,3)} m`,`Total weight = ${round(totalLength,3)} × ${round(uw,3)} = ${round(totalWeight,2)} kg`]}}
if(typeof module!=='undefined')module.exports={calculateBbs,SHAPES,ENGINE_VERSION,unitWeightKgPerM};
