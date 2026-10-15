// Dependency-free deterministic rules/integration harness; real rendering is
// checked separately with tools/browser-smoke.cjs.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const files = ['core','genetics','characters','navigation','world','social','romance','family','persistence'];
const storage=new Map();
const context = vm.createContext({ console, document: { getElementById: () => ({textContent:'', hidden:true}), querySelectorAll:()=>[] }, performance, structuredClone,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}, confirm:()=>true });
vm.runInContext(files.map(f => fs.readFileSync(`src/${f}.js`, 'utf8')).join('\n') + '\nglobalThis.rules = {World,RNG,SaveStore,hash,ROMANCE,emptyRelationship,inheritGenome,normalizeGenome,validateGenome,GENETICS,FAMILY};', context);
const { World, RNG, SaveStore, hash, emptyRelationship } = context.rules;
const { inheritGenome, normalizeGenome, validateGenome } = context.rules;
const json = x => JSON.parse(JSON.stringify(x));
function gameFor(w) { return { world:w,runId:'test-run',pack:{food:2,water:3},progress:{gathered:2,visited:new Set(),complete:false},gatherCooldown:0,warningLatch:{},effects:[],messages:[],noticeUntil:0 }; }
function saveFor(w) { const s = Object.create(SaveStore.prototype); s.game = gameFor(w); s.revision = 0; return s; }
function prepare(w, c) { c.x = c.px = w.player.x + 40; c.y = c.py = w.player.y; w.social.learn(c,'name',c.publicIdentity.displayName); c.playerKnowledge.relationship.trust=30; c.playerKnowledge.relationship.familiarity=50; w.social.reputation.score=5; }
function compatible(w, sex) { return w.npcs.find(c => c.actual.identity.sex===sex && w.romance.compatibility(w.player,c).ok); }
function action(w,c,topic) { w.elapsed += 4; return w.romance.interact(c.id,topic); }
function marry(w,c) { prepare(w,c); for(let day=0;day<5 && !w.romance.spouse(w.player);day++) { w.elapsed += 120; for(const t of ['compliment','outing','commitment']) action(w,c,t); } w.elapsed+=120; assert.equal(action(w,c,'propose').ok,true); }
test('seeded baseline and existing simulation state round-trip', () => {
    const a = new World('baseline'), b = new World('baseline'); assert.deepEqual(json(a.resources),json(b.resources)); assert.equal(a.rng.state,b.rng.state);
    const store=saveFor(a), raw=store.encode(), out=store.decode(raw); assert.deepEqual(json(out.world.player),json(a.player)); assert.equal(out.world.social.rng.state,a.social.rng.state);
});
test('excellent trust does not guarantee attraction; proposals can fail', () => {
    const w=new World('romance'); const c=w.npcs.find(c=>!w.romance.preferences(c).sexes.includes('male')); prepare(w,c); c.playerKnowledge.relationship.trust=100;
    assert.equal(action(w,c,'compliment').ok,false); assert.equal(w.romance.pair(w.player,c).affection,0);
    const d=compatible(w,'female'); prepare(w,d); assert.equal(action(w,d,'propose').ok,false);
});
test('varied courtship, shared cooldown, diminishing returns, repeated topics and daily cap', () => {
    const w=new World('romance'), c=compatible(w,'female'); prepare(w,c);
    assert.equal(action(w,c,'compliment').ok,true); const pair=w.romance.pair(w.player,c), before=pair.affection;
    assert.equal(w.romance.interact(c.id,'outing').outcome,'cooldown'); assert.equal(pair.affection,before);
    assert.equal(w.social.interact(c.id,'chat').outcome,'cooldown');
    action(w,c,'compliment'); assert.equal(pair.affection,before);
    action(w,c,'outing'); assert.ok(pair.affection-before<11);
    assert.equal(action(w,c,'commitment').outcome,'daily-limit');
});
for(const sex of ['female','male']) test(`consensual ${sex==='male'?'same-sex':'opposite-sex'} marriage persists without genome disclosure`, () => {
    const w=new World('romance'), c=compatible(w,sex); marry(w,c);
    assert.equal(w.romance.spouse(w.player).id,c.id); assert.equal(w.romance.household(w.player),.88);
    const view=w.romance.view(c); assert.ok(!JSON.stringify(view).includes('genome')); assert.ok(!c.playerKnowledge.discoveredFacts.privateHistory);
    const restored=saveFor(w).decode(saveFor(w).encode()).world; assert.equal(restored.romance.spouse(restored.player).id,c.id);
    w.elapsed+=120; assert.equal(action(w,c,'separate').ok,true); assert.equal(w.romance.spouse(w.player),null);
});
test('malformed marriage rejected before installation', () => { const w=new World('romance'), c=compatible(w,'female'); marry(w,c); const s=saveFor(w), data=JSON.parse(s.encode()); data.payload.romance.marriages[0].ids[1]='missing'; data.checksum=hash(JSON.stringify(data.payload)); assert.throws(()=>s.decode(JSON.stringify(data))); });
test('genuine Phase 2A snapshot migrates without losing progress', () => {
    const raw=fs.readFileSync('tools/fixtures/phase2a-v2.json','utf8'), original=JSON.parse(raw).payload;
    const restored=saveFor(new World('unused')).decode(raw);
    assert.deepEqual(json(restored.world.player.vitals),original.characters[0].vitals);
    assert.deepEqual(json(restored.world.npcs[0].playerKnowledge),original.characters[1].playerKnowledge);
    assert.deepEqual(json(restored.saved.pack),original.pack); assert.equal(restored.world.social.reputation.score,9);
    assert.equal(restored.world.resources[0].quantity,0); assert.equal(restored.world.romance.marriages.length,0);
});
function familyWorld(seed='family') { const w=new World(seed); w.social.reputation.score=5; const c=w.npcs.find(c=>c.actual.identity.sex==='female' && c.actual.life.ageYears<=60 && w.romance.compatibility(w.player,c).ok && w.romance.preferences(c).familyLife>=.3); marry(w,c); return {w,c}; }
test('multiple persistent offspring have distinct genomes, parents and stable identities', () => {
    const {w,c}=familyWorld(), result=w.family.birth(); assert.equal(result.ok,true); assert.ok(result.ids.length>=2 && result.ids.length<=4);
    const children=result.ids.map(id=>w.family.character(id)); assert.equal(new Set(children.map(c=>JSON.stringify(c.actual.genome))).size,children.length);
    for(const child of children) { validateGenome(child.actual.genome); assert.equal(child.actual.lineage.motherId,c.id); assert.equal(child.actual.lineage.fatherId,w.player.id); assert.equal(child.actual.lineage.generation,2); }
    assert.equal(w.family.birth().ok,false);
    const restored=saveFor(w).decode(saveFor(w).encode()).world; assert.deepEqual(json(restored.family.exportState()),json(w.family.exportState())); assert.equal(restored.npcs.length,w.npcs.length);
});
test('same-sex households do not create joint biological children; children survive remarriage', () => {
    const {w,c}=familyWorld(); const ids=w.family.birth().ids; w.elapsed+=120; action(w,c,'separate'); const partner=compatible(w,'male'); marry(w,partner);
    assert.equal(w.family.birth().ok,false); assert.deepEqual(json(w.player.actual.lineage.childrenIds),json(ids));
});
test('triangle stages never skip, improve by reshaping before sides and can remain unchanged', () => {
    const regular=normalizeGenome({regularity:1,sharpness:.5,latentIrregularAncestry:false});
    for(const [stage,reg,sharp] of [['irregular',.68,.7],['isosceles',.85,.8]]) {
        const base=normalizeGenome({geometryStage:stage,regularity:reg,sharpness:sharp,latentIrregularAncestry:false}), stages=new Set();
        for(let i=0;i<600;i++) { const g=inheritGenome(base,base,regular,new RNG(i),{motherId:'m',fatherId:'f'},2); validateGenome(g); assert.equal(g.sideCount,3); stages.add(g.geometryStage); if(stage==='irregular') assert.notEqual(g.geometryStage,'regular'); }
        assert.ok(stages.has(stage)); assert.ok(stages.has(stage==='irregular'?'isosceles':'regular'));
    }
});
test('regular progression is probabilistic, regular and at most one side; physical traits vary independently', () => {
    const b=normalizeGenome({sideCount:5,regularity:1,sharpness:.5,latentIrregularAncestry:false}), sides=new Set();
    for(let i=0;i<600;i++) { const g=inheritGenome(b,b,b,new RNG(i),{motherId:'m',fatherId:'f'},3); validateGenome(g); assert.ok(g.sideCount===5 || g.sideCount===6); assert.equal(g.geometryStage,'regular'); sides.add(g.sideCount); }
    assert.equal(sides.size,2);
});
test('maternal carriers can reintroduce irregularity; polygon repair cannot gain sides', () => {
    const b=normalizeGenome({sideCount:6,regularity:1,latentIrregularAncestry:false}), m=normalizeGenome({...b,latentIrregularAncestry:true}), stages=new Set();
    for(let i=0;i<600;i++) { const g=inheritGenome(b,b,m,new RNG(i),{motherId:'m',fatherId:'f'},3); validateGenome(g); stages.add(g.geometryStage); }
    assert.ok(stages.has('regular') && stages.has('irregularPolygon'));
    const damaged=normalizeGenome({sideCount:6,regularity:.6,geometryStage:'irregularPolygon'});
    for(let i=0;i<200;i++) { const g=inheritGenome(damaged,b,b,new RNG(i),{motherId:'m',fatherId:'f'},4); assert.equal(g.sideCount,6); validateGenome(g); }
});
test('female line forms carry complete latent genomes and do not disclose them', () => {
    const {w}=familyWorld(); let result=w.family.birth(); const daughter=result.ids.map(id=>w.family.character(id)).find(c=>c.actual.identity.sex==='female'); assert.ok(daughter);
    assert.equal(daughter.body.form,'line'); validateGenome(daughter.actual.genome); assert.equal(daughter.body.points.length,4);
    assert.ok(!JSON.stringify(w.social.view(daughter)).includes('sideCount')); assert.ok(!JSON.stringify(w.romance.view(daughter)).includes('latentIrregularAncestry'));
});
test('inheritance is deterministic without rendering', () => { const b=normalizeGenome({}); assert.deepEqual(json(inheritGenome(b,b,b,new RNG(42),{motherId:'m',fatherId:'f'},2)),json(inheritGenome(b,b,b,new RNG(42),{motherId:'m',fatherId:'f'},2))); });
function mature(w) { for(let i=0;i<4;i++) assert.equal(w.family.advance(5).ok,true); assert.equal(w.family.advance(1).ok,true); }
test('refuge years mature children, preserve supplies, process NPC deaths and close marriages', () => {
    const {w,c}=familyWorld(), ids=w.family.birth().ids, pack=gameFor(w).pack;
    const elder=w.npcs.find(n=>!ids.includes(n.id) && n!==c); elder.actual.life.ageYears=w.family.deathAge(elder)-.5;
    mature(w); assert.ok(ids.every(id=>w.family.character(id).actual.life.ageYears===21));
    assert.equal(elder.actual.life.alive,false); assert.ok(w.family.history.some(e=>e.kind==='death' && e.ids.includes(elder.id)));
    assert.deepEqual(pack,{food:2,water:3}); assert.ok(w.player.vitals.hunger>=55 && w.player.vitals.thirst>=55);
    w.family.markDeath(c); assert.equal(w.romance.spouse(w.player),null); assert.equal(w.romance.marriages[0].reason,'death');
    saveFor(w).decode(saveFor(w).encode());
});
for(const sex of ['female','male']) test(`Generation 2 ${sex} successor continues same world with independent siblings and saves`, () => {
    const {w}=familyWorld(), result=w.family.birth(), worldRef=w, resources=w.resources;
    mature(w); const selected=result.ids.map(id=>w.family.character(id)).find(c=>c.actual.identity.sex===sex); assert.ok(selected);
    const old=w.player, sibling=result.ids.find(id=>id!==selected.id), rng=w.rng.state;
    assert.equal(w.family.succeed(selected.id).ok,true); assert.equal(w,worldRef); assert.equal(w.resources,resources); assert.equal(w.rng.state,rng);
    assert.equal(w.player.id,selected.id); assert.equal(w.player.ai,null); assert.equal(w.player.isPlayer,true);
    assert.equal(w.player.actual.lineage.generation,2); assert.equal(old.isPlayer,false); assert.ok(old.ai);
    assert.ok(w.npcs.find(c=>c.id===sibling)?.ai); assert.ok(w.family.notebooks[old.id]);
    const restored=saveFor(w).decode(saveFor(w).encode()).world; assert.equal(restored.player.id,selected.id); assert.deepEqual(json(restored.family.exportState()),json(w.family.exportState()));
    assert.deepEqual(json(restored.player),json(w.player));assert.deepEqual(json(restored.npcs),json(w.npcs));
    w.updateNPC(w.npcs.find(c=>c.id===sibling),1/60);
});
test('female successor can court a male and produce Generation 3 with correct parents', () => {
    const {w}=familyWorld(); const ids=w.family.birth().ids; mature(w); const daughter=ids.map(id=>w.family.character(id)).find(c=>c.actual.identity.sex==='female'); assert.equal(w.family.succeed(daughter.id).ok,true);
    w.social.reputation.score=5;
    const spouse=w.npcs.find(c=>c.actual.life.alive && c.actual.identity.sex==='male' && c.actual.life.ageYears<=55 && !w.romance.isCloseKin(w.player,c) && w.romance.compatibility(w.player,c).ok && w.romance.preferences(c).familyLife>=.3); assert.ok(spouse); marry(w,spouse);
    const born=w.family.birth(); assert.equal(born.ok,true);
    for(const id of born.ids) { const child=w.family.character(id); assert.equal(child.actual.lineage.motherId,daughter.id); assert.equal(child.actual.lineage.fatherId,spouse.id); assert.equal(child.actual.lineage.generation,3); }
    const restored=saveFor(w).decode(saveFor(w).encode()).world; assert.equal(restored.player.actual.lineage.generation,2); assert.ok(restored.family.view().members.some(m=>m.generation===3));
});
test('death offers adult heirs; no adult descendants means extinction, including minors', () => {
    const {w}=familyWorld(); w.family.birth(); assert.equal(w.family.candidates().length,0); w.family.markDeath(w.player,'thirst'); assert.equal(w.family.candidates().length,0); assert.equal(w.family.canSucceed(),true);
    const {w:adults}=familyWorld(); adults.family.birth(); mature(adults); adults.family.markDeath(adults.player); const heirs=adults.family.candidates(); assert.ok(heirs.length>=2); assert.equal(adults.family.succeed(heirs[0].id).ok,true); saveFor(adults).decode(saveFor(adults).encode());
    const none=new World('no-heir'); none.family.markDeath(none.player); assert.equal(none.family.candidates().length,0);
});
test('retirement eligibility, unrelated adulthood and distant time advance are enforced', () => {
    const {w,c}=familyWorld(); const id=w.family.birth().ids[0]; assert.equal(w.family.succeed(id).ok,false); assert.equal(w.family.succeed(c.id).ok,false);
    w.player.x=1600;w.player.y=1100; const year=w.family.year; assert.equal(w.family.advance(5).ok,false); assert.equal(w.family.year,year);
});
test('genuine v3 marriage checkpoint migrates with preferences, affection and history',()=>{
    const raw=fs.readFileSync('tools/fixtures/phase2b-v3.json','utf8'), original=JSON.parse(raw).payload;
    const w=saveFor(new World('unused')).decode(raw).world;
    assert.deepEqual(json(w.romance.exportState()),original.romance);assert.ok(w.romance.spouse(w.player));assert.equal(w.family.births.length,0);
});
test('synthetic v1 schema migrates and retains inventory/resource state',()=>{
    const data=JSON.parse(fs.readFileSync('tools/fixtures/phase2a-v2.json','utf8'));data.version=1;data.payload.social=null;
    for(const c of data.payload.characters) c.playerKnowledge={observed:{},discoveredFacts:{},rumors:[],relationship:{familiarity:0,trust:0}};
    data.checksum=hash(JSON.stringify(data.payload));const result=saveFor(new World('unused')).decode(JSON.stringify(data));assert.equal(result.saved.pack.food,4);assert.equal(result.world.resources[0].quantity,0);assert.equal(result.world.npcs[0].playerKnowledge.relationship.lastAt,-999);
});
test('saving preserves all three RNG streams and the next birth exactly',()=>{
    const {w}=familyWorld();w.family.birth();w.family.advance(5);const store=saveFor(w),other=store.decode(store.encode()).world;
    assert.equal(w.rng.state,other.rng.state);assert.equal(w.social.rng.state,other.social.rng.state);assert.equal(w.family.rng.state,other.family.rng.state);
    assert.deepEqual(json(w.family.birth()),json(other.family.birth()));assert.deepEqual(json(w.family.exportState()),json(other.family.exportState()));
});
const invalidCases={
    'genome sides':s=>s.characters[0].actual.genome.sideCount=100,
    'geometry stage':s=>s.characters[0].actual.genome.geometryStage='circle',
    'vertex proportions':s=>s.characters[0].actual.genome.vertexProportions=[1],
    'negative age':s=>s.characters[0].actual.life.ageYears=-1,
    'duplicate identity':s=>s.characters[1].id=s.characters[0].id,
    'missing parent':s=>s.characters.at(-1).actual.lineage.motherId='missing',
    'broken children':s=>s.characters[0].actual.lineage.childrenIds=[],
    'wrong generation':s=>s.characters.at(-1).actual.lineage.generation=1,
    'invalid playable lineage':s=>s.family.playableIds=['citizen-001',s.characters[0].id],
    'birth record':s=>s.family.births[0].childIds=[s.characters[0].id,s.characters[1].id],
    'family RNG':s=>s.family.rngState=-1,
    'alive with no health':s=>s.characters[0].vitals.health=0,
    'invalid inventory':s=>s.pack.food=99,
    'invalid AI':s=>s.characters[1].ai.path=[{x:-1,y:0}],
    'hidden knowledge forgery':s=>s.characters[1].playerKnowledge.discoveredFacts.genome={value:'everything',kind:'confirmed',sourceId:'player',at:0},
};
const malformedFixture=(()=>{const {w}=familyWorld();w.family.birth();return saveFor(w).encode();})();
for(const [label,damage] of Object.entries(invalidCases)) test(`transactional rejection: ${label}`,()=>{
    const store=saveFor(new World('live')), live=store.game.world, data=JSON.parse(malformedFixture);damage(data.payload);data.checksum=hash(JSON.stringify(data.payload));
    assert.throws(()=>store.decode(JSON.stringify(data)));assert.equal(store.game.world,live);assert.equal(store.importRaw(JSON.stringify(data),false),false);assert.equal(store.game.world,live);
});
test('damaged newest slot falls back to an older valid save without overwriting either slot',()=>{
    storage.clear();const store=saveFor(new World('valid'));const valid=store.encode('manual'), data=JSON.parse(valid);data.savedAt+=10;data.payload.characters[0].actual.life.ageYears=-1;data.checksum=hash(JSON.stringify(data.payload));const broken=JSON.stringify(data);
    storage.set('flatland.manual.v1',valid);storage.set('flatland.auto.v1',broken);store.game.installSave=restored=>{store.game.world=restored.world;};assert.equal(store.load(),true);assert.equal(store.game.world.seed,'valid');assert.equal(storage.get('flatland.auto.v1'),broken);assert.equal(storage.get('flatland.manual.v1'),valid);
});
test('checksum, unsafe keys, unsupported versions and invalid JSON fail safely',()=>{
    const store=saveFor(new World('valid')), data=JSON.parse(store.encode());data.checksum=0;assert.throws(()=>store.decode(JSON.stringify(data)));
    data.version=999;assert.throws(()=>store.decode(JSON.stringify(data)));assert.throws(()=>store.decode('{bad'));assert.throws(()=>store.decode('{"__proto__":{}}'));
});
test('seeded citizens and all visible geometry remain valid over multiple seeds',()=>{
    for(let i=0;i<12;i++){const w=new World(`seed-regression-${i}`);assert.equal(w.npcs.length,64);for(const c of [w.player,...w.npcs]){validateGenome(c.actual.genome);assert.ok(w.circleClear(c.x,c.y,c.body.radius-.001));assert.ok(c.body.points.every(p=>p.every(Number.isFinite)));}saveFor(w).decode(saveFor(w).encode());}
});
test('a married partner can refuse an outing without corrupting marital state',()=>{
    const w=new World('romance');w.social.reputation.score=5;
    const c=w.npcs.find(c=>w.romance.compatibility(w.player,c).ok && w.romance.preferences(c).reputation>.75);assert.ok(c);marry(w,c);
    w.social.reputation.score=-10;w.elapsed+=120;const r=action(w,c,'outing');assert.equal(r.ok,false);assert.equal(w.romance.pair(w.player,c).status,'married');assert.equal(w.romance.spouse(w.player).id,c.id);saveFor(w).decode(saveFor(w).encode());
});
test('quota failure and a changed slot preserve the previous stored data',()=>{
    storage.clear();const store=saveFor(new World('storage')), previous=store.encode();storage.set('flatland.manual.v1',previous);store.expected={manual:previous};
    const write=context.localStorage.setItem;context.localStorage.setItem=()=>{const e=new Error('full');e.name='QuotaExceededError';throw e;};
    try{assert.equal(store.save('manual'),false);assert.equal(storage.get('flatland.manual.v1'),previous);}finally{context.localStorage.setItem=write;}
    store.expected.manual='outdated';assert.equal(store.save('manual'),false);assert.equal(storage.get('flatland.manual.v1'),previous);
});
test('current player identity follows a stable ID rather than a population array index',()=>{
    const {w}=familyWorld();const children=w.family.birth().ids;mature(w);assert.equal(w.family.succeed(children[0]).ok,true);
    const store=saveFor(w),data=JSON.parse(store.encode());data.payload.characters.reverse();data.checksum=hash(JSON.stringify(data.payload));
    const restored=store.decode(JSON.stringify(data)).world;assert.equal(restored.player.id,w.player.id);assert.deepEqual(json(restored.player.actual),json(w.player.actual));assert.equal(restored.player.ai,null);
});
