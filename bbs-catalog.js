/* Product catalog only. It deliberately contains no cut-length or weight formula. */
window.SiteQuant.bbsCatalog = (() => {
  const members = ['Beam', 'Column', 'Slab', 'Footing', 'Staircase', 'Wall', 'Pile', 'Pile Cap', 'Raft', 'Retaining Wall', 'Custom Member'];
  const families = ['Bottom main', 'Top main', 'Extra top', 'Curtailment', 'Side-face', 'Distribution', 'Stirrups', 'Column ties', 'Support bars', 'Chairs', 'Hairpins', 'Haunch/support reinforcement'];
  const shapes = [
    ['A','Straight','COMMON','Free','engine','STRAIGHT',['L'],members],
    ['B','L-bar','BENDS','Free','engine','L_BAR',['A','B'],members],
    ['C','U-bar','BENDS','Free','engine','U_BAR',['Base','Leg 1','Leg 2'],members],
    ['I','Inverted U-bar','BENDS','Free','engine','U_BAR',['Base','Leg 1','Leg 2'],members],
    ['D','Bent-up / cranked','BENDS','Free','engine','CRANKED',['A','B','C','D','E'],['Beam','Slab','Staircase','Custom Member']],
    ['E','Rectangular stirrup','STIRRUPS & LINKS','Professional','engine','RECTANGULAR_STIRRUP',['W','D','H1','H2'],['Beam','Footing','Raft','Retaining Wall']],
    ['F','Closed column tie','STIRRUPS & LINKS','Professional','engine','COLUMN_TIE',['W','D','H1','H2'],['Column','Pile','Wall']],
    ['G','Circular ring','STIRRUPS & LINKS','Professional','engine','CIRCULAR_RING',['D','H1','H2'],['Column','Pile','Wall']],
    ['H','Open stirrup','STIRRUPS & LINKS','Professional','planned',null,['A','B'],['Beam','Wall']],
    ['J','Hook / 135° hook','BENDS','Professional','planned',null,['L','H'],members],
    ['K','Closed link','STIRRUPS & LINKS','Professional','planned',null,['A','B'],['Beam','Column','Wall']],
    ['P','Helical reinforcement','SPECIAL','Professional','planned',null,['D','Pitch','Height'],['Column','Pile']],
    ['Q','Hairpin','SPECIAL','Professional','planned',null,['A','B'],['Slab','Raft','Wall']],
    ['R','Chair bar','SPECIAL','Professional','planned',null,['Height','Leg'],['Slab','Raft','Pile Cap']],
    ['S','Haunch reinforcement','SPECIAL','Professional','planned',null,['A','B','C'],['Beam','Slab','Retaining Wall']],
    ['T','Side-face reinforcement','SPECIAL','Professional','planned',null,['L'],['Beam','Wall','Retaining Wall']],
    ['V','Extra top / support','SPECIAL','Professional','planned',null,['L'],['Beam','Slab']],
    ['W','Dowel / starter','SPECIAL','Professional','planned',null,['L','Embedment'],['Column','Footing','Wall']],
    ['X','Custom multi-segment bar','SPECIAL','Professional','planned',null,['Segments'],members]
  ].map(([code,name,category,plan,calculation,engineShape,dimensions,applicableMembers]) => ({ code,name,category,plan,calculation,engineShape,dimensions,applicableMembers }));
  const capabilities = { Free: ['Straight, L-bar and basic U-bar', 'Basic BBS and CSV preview'], Professional: ['Stirrups, ties, rings, cranked and member families', 'BBS summaries and advanced exports', 'Wastage analysis — planned'], Team: ['Shared projects and approvals — planned', 'Revision history and cutting lists — planned'] };
  return { members, families, shapes, categories: ['COMMON','BENDS','STIRRUPS & LINKS','SPECIAL','PREMIUM'], capabilities, byCode: code => shapes.find(shape => shape.code === code) };
})();
