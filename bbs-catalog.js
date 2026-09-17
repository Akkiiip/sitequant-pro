/* SiteQuant Pro — member-aware reinforcement taxonomy for Indian RCC BBS workflow. */
window.SiteQuant.bbsCatalog = (() => {
  const members = ['Beam','Column','Slab','Footing','Staircase','Wall','Pile','Pile Cap','Raft','Retaining Wall','Custom Member'];
  const families = ['Bottom main','Top main','Extra top / support','Extra bottom','Side-face','Distribution','Curtailment','Stirrups','Column ties','Confinement','Starter / dowel','Chairs','Hairpins','Corner torsion','Opening / edge','Main vertical','Main bottom X','Main bottom Y','Main top X','Main top Y','Stem vertical','Stem horizontal','Toe / heel','Shear key','Landing reinforcement','Waist main','Boundary / edge','Longitudinal bars','Helical / spiral','Column strip extra','Panel top X','Panel top Y','Panel bottom X','Panel bottom Y'];
  const shapes = [
    {code:'A',name:'Straight bar',category:'COMMON',plan:'Free',calculation:'engine',engineShape:'STRAIGHT',dimensions:['L'],description:'Straight reinforcement bar.'},
    {code:'B',name:'L-bar / 90° return',category:'BENDS',plan:'Free',calculation:'engine',engineShape:'L_BAR',dimensions:['A','B'],description:'Straight leg with one 90° return.'},
    {code:'C',name:'U-bar',category:'BENDS',plan:'Free',calculation:'engine',engineShape:'U_BAR',dimensions:['Base','Leg 1','Leg 2'],description:'U-shaped bar used only in relevant detailing families.'},
    {code:'I',name:'Inverted U / chair',category:'SPECIAL',plan:'Professional',calculation:'engine',engineShape:'U_BAR',dimensions:['Base','Leg 1','Leg 2'],description:'Reserved for chair/hairpin-type detailing; hidden from ordinary slab reinforcement.'},
    {code:'D',name:'Cranked / bent-up bar',category:'BENDS',plan:'Free',calculation:'engine',engineShape:'CRANKED',dimensions:['A','Rise','Run','D','Tail'],description:'Bent-up reinforcement for drawing-defined crank detailing.'},
    {code:'E',name:'Rectangular stirrup / link',category:'STIRRUPS & LINKS',plan:'Professional',calculation:'engine',engineShape:'RECTANGULAR_STIRRUP',dimensions:['W','D','H1','H2'],description:'Closed rectangular beam/link stirrup with hook detailing.'},
    {code:'F',name:'Closed column tie',category:'STIRRUPS & LINKS',plan:'Professional',calculation:'engine',engineShape:'COLUMN_TIE',dimensions:['W','D','H1','H2'],description:'Closed rectangular column/pile/wall tie.'},
    {code:'G',name:'Circular ring',category:'STIRRUPS & LINKS',plan:'Professional',calculation:'engine',engineShape:'CIRCULAR_RING',dimensions:['D','H1','H2'],description:'Circular tie/ring around a circular cage.'},
    {code:'H',name:'Open stirrup',category:'STIRRUPS & LINKS',plan:'Professional',calculation:'planned',engineShape:null,dimensions:['A','B'],description:'Open link detail — calculation path to be added after detailing review.'},
    {code:'J',name:'Hook / end return',category:'BENDS',plan:'Professional',calculation:'planned',engineShape:null,dimensions:['L','H'],description:'Hooked end detail for a project-specific bar.'},
    {code:'K',name:'Closed multi-leg link',category:'STIRRUPS & LINKS',plan:'Professional',calculation:'planned',engineShape:null,dimensions:['A','B','Legs'],description:'Multi-leg link detail for complex confinement.'},
    {code:'P',name:'Helical reinforcement',category:'SPECIAL',plan:'Professional',calculation:'planned',engineShape:null,dimensions:['D','Pitch','Height'],description:'Helical/spiral reinforcement for piles or circular columns.'},
    {code:'Q',name:'Hairpin',category:'SPECIAL',plan:'Professional',calculation:'engine',engineShape:'U_BAR',dimensions:['Base','Leg 1','Leg 2'],description:'Hairpin detail; shown only when the hairpin family is selected.'},
    {code:'R',name:'Chair bar',category:'SPECIAL',plan:'Professional',calculation:'planned',engineShape:null,dimensions:['Height','Leg'],description:'Chair support detail; calculation path to be added separately.'},
    {code:'S',name:'Haunch reinforcement',category:'SPECIAL',plan:'Professional',calculation:'planned',engineShape:null,dimensions:['A','B','C'],description:'Haunch/support reinforcement.'},
    {code:'T',name:'Side-face reinforcement',category:'SPECIAL',plan:'Professional',calculation:'engine',engineShape:'STRAIGHT',dimensions:['L'],description:'Straight side-face/skin reinforcement.'},
    {code:'V',name:'Extra top / support',category:'SPECIAL',plan:'Professional',calculation:'engine',engineShape:'STRAIGHT',dimensions:['L'],description:'Straight top/support extra bar.'},
    {code:'W',name:'Starter / dowel',category:'SPECIAL',plan:'Professional',calculation:'engine',engineShape:'L_BAR',dimensions:['A','B'],description:'Starter/dowel with development return.'},
    {code:'X',name:'Custom multi-segment bar',category:'SPECIAL',plan:'Professional',calculation:'planned',engineShape:null,dimensions:['Segments'],description:'Custom detailing for non-standard project bars.'}
  ];
  const baseFamilies={
    Beam:['Bottom main','Top main','Extra top / support','Extra bottom','Side-face','Curtailment','Stirrups','Distribution','Chairs'],
    Column:['Main vertical','Column ties','Confinement','Starter / dowel','Extra top / support'],
    Slab:['Bottom main','Distribution','Top main','Extra top / support','Extra bottom','Cranked / bent-up','Corner torsion','Opening / edge','Chairs'],
    Footing:['Main bottom X','Main bottom Y','Main top X','Main top Y','Starter / dowel','Extra bottom','Hairpins','Chairs'],
    Staircase:['Waist main','Distribution','Landing reinforcement','Top / support','Extra top / support','Cranked / bent-up','Edge reinforcement'],
    Wall:['Main vertical','Distribution','Boundary / edge','Opening / edge','Starter / dowel','Confinement','Stirrups'],
    Pile:['Longitudinal bars','Helical / spiral','Confinement','Starter / dowel'],
    'Pile Cap':['Main bottom X','Main bottom Y','Main top X','Main top Y','Starter / dowel','Hairpins','Chairs','Extra bottom'],
    Raft:['Panel bottom X','Panel bottom Y','Panel top X','Panel top Y','Column strip extra','Opening / edge','Chairs','Hairpins'],
    'Retaining Wall':['Stem vertical','Stem horizontal','Top / support','Toe / heel','Shear key','Starter / dowel','Opening / edge','Stirrups'],
    'Custom Member':families
  };
  const shapeMap={
    Beam:{'Bottom main':['A','B','D'],'Top main':['A','B'],'Extra top / support':['A','B','V'],'Extra bottom':['A','B'],'Side-face':['A','T'],'Curtailment':['A','D'],'Stirrups':['E'],'Distribution':['A'],'Chairs':['I']},
    Column:{'Main vertical':['A','B'],'Column ties':['F'],'Confinement':['F'],'Starter / dowel':['B','W'],'Extra top / support':['A','B']},
    Slab:{'Bottom main':['A','D'],'Distribution':['A'],'Top main':['A','B'],'Extra top / support':['A','B','V'],'Extra bottom':['A'],'Cranked / bent-up':['D'],'Corner torsion':['A','B'],'Opening / edge':['A','B'],'Chairs':['I','R']},
    Footing:{'Main bottom X':['A'],'Main bottom Y':['A'],'Main top X':['A'],'Main top Y':['A'],'Starter / dowel':['B','W'],'Extra bottom':['A','B'],'Hairpins':['C','Q'],'Chairs':['I','R']},
    Staircase:{'Waist main':['A','D'],'Distribution':['A'],'Landing reinforcement':['A','B'],'Top / support':['A','B'],'Extra top / support':['A','B'],'Cranked / bent-up':['D'],'Edge reinforcement':['A','B']},
    Wall:{'Main vertical':['A','B'],'Distribution':['A'],'Boundary / edge':['A','B'],'Opening / edge':['A','B'],'Starter / dowel':['B','W'],'Confinement':['F'],'Stirrups':['E']},
    Pile:{'Longitudinal bars':['A','B'],'Helical / spiral':['G','P'],'Confinement':['F','G'],'Starter / dowel':['B','W']},
    'Pile Cap':{'Main bottom X':['A'],'Main bottom Y':['A'],'Main top X':['A'],'Main top Y':['A'],'Starter / dowel':['B','W'],'Hairpins':['C','Q'],'Chairs':['I','R'],'Extra bottom':['A','B']},
    Raft:{'Panel bottom X':['A'],'Panel bottom Y':['A'],'Panel top X':['A'],'Panel top Y':['A'],'Column strip extra':['A','B'],'Opening / edge':['A','B'],'Chairs':['I','R'],'Hairpins':['C','Q']},
    'Retaining Wall':{'Stem vertical':['A','B'],'Stem horizontal':['A'],'Top / support':['A','B'],'Toe / heel':['A','B'],'Shear key':['A','B'],'Starter / dowel':['B','W'],'Opening / edge':['A','B'],'Stirrups':['E']},
    'Custom Member':{}
  };
  const contexts={
    Beam:{label:'Beam detailing',fields:[['beamSection','Beam section'],['supportCondition','Support condition']],options:{beamSection:['Rectangular','T-beam','L-beam','Drawing-defined'],supportCondition:['Simply supported','Continuous','Cantilever','Drawing-defined']}},
    Column:{label:'Column detailing',fields:[['columnSection','Column section'],['supportCondition','Support condition']],options:{columnSection:['Rectangular','Square','Circular','Drawing-defined'],supportCondition:['Typical storey','Base','Top','Drawing-defined']}},
    Slab:{label:'Slab detailing context',fields:[['slabType','Slab type'],['supportCondition','Support condition']],options:{slabType:['One-way','Two-way','Cantilever','Drawing-defined'],supportCondition:['Simply supported','Continuous','Cantilever','Drawing-defined']}},
    Footing:{label:'Footing detailing context',fields:[['footingType','Footing type']],options:{footingType:['Isolated','Combined','Strip','Pile cap','Raft / mat','Drawing-defined']}},
    Staircase:{label:'Staircase detailing context',fields:[['stairType','Stair type']],options:{stairType:['Straight flight','Dog-legged','Open-well','Drawing-defined']}},
    Wall:{label:'Wall detailing context',fields:[['wallType','Wall type']],options:{wallType:['RCC wall','Shear wall','Basement wall','Drawing-defined']}},
    Pile:{label:'Pile detailing context',fields:[['pileType','Pile type']],options:{pileType:['Bored cast-in-situ','Driven','Micropile','Drawing-defined']}},
    'Pile Cap':{label:'Pile-cap detailing context',fields:[['pileArrangement','Pile arrangement']],options:{pileArrangement:['2 pile','3 pile','4 pile','Multi-pile','Drawing-defined']}},
    Raft:{label:'Raft detailing context',fields:[['raftType','Raft type']],options:{raftType:['Flat raft','Beam-and-slab raft','Cellular raft','Drawing-defined']}},
    'Retaining Wall':{label:'Retaining-wall detailing context',fields:[['wallType','Wall type'],['component','Component']],options:{wallType:['Cantilever','Counterfort','Basement','Drawing-defined'],component:['Stem','Base slab','Toe','Heel','Shear key','Starter']}},
    'Custom Member':{label:'Custom detailing context',fields:[['component','Component']],options:{component:['Project-defined']}}
  };
  const capabilities={Free:['Member-aware BBS workflow','Straight, L-bar, U-bar and core bent details','CSV preview'],Professional:['Stirrups, column ties, rings and cranked bars','Formula trace, schedules and summaries','Drawing/revision controls and exports'],Team:['Shared projects and approvals — planned','Revision history and cutting lists — planned']};
  const byCode=code=>shapes.find(s=>s.code===code);
  const familyOptions=memberType=>baseFamilies[memberType]||families;
  const workflow=memberType=>contexts[memberType]||contexts['Custom Member'];
  const allowedShapeCodes=(memberType,family)=>(shapeMap[memberType]&&shapeMap[memberType][family])||(memberType==='Custom Member'?shapes.filter(s=>s.calculation==='engine').map(s=>s.code):['A']);
  const applicableShapes=input=>allowedShapeCodes(input.memberType,input.family).map(byCode).filter(Boolean);
  return {members,families,shapes,categories:['COMMON','BENDS','STIRRUPS & LINKS','SPECIAL'],baseFamilies,shapeMap,contexts,capabilities,byCode,familyOptions,workflow,allowedShapeCodes,applicableShapes};
})();
