// Dependency-free deterministic rules/integration harness; real rendering is
// checked separately with tools/browser-smoke.cjs.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('./combat-rules.cjs');
const files = ['core','genetics','characters','registry','navigation','world','social','romance','household','family-invariants','observer-notebooks','family-view','family','renewal','approach','save-format','save-validation','save-migrations','save-codec','persistence'];
const storage=new Map();
const context = vm.createContext({ console, document: { getElementById: () => ({textContent:'', hidden:true,classList:{toggle(){}}}), querySelectorAll:()=>[] }, performance, structuredClone,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}, confirm:()=>true });
vm.runInContext(files.map(f => fs.readFileSync(`src/${f}.js`, 'utf8')).join('\n') + '\nglobalThis.rules = {lifeStage,visualRadius,World,RNG,SaveStore,SaveCodec,hash,ROMANCE,emptyRelationship,inheritGenome,normalizeGenome,validateGenome,GENETICS,FAMILY,CitizenApproach,briefReply};', context);
const { World, RNG, SaveStore, hash, emptyRelationship } = context.rules;
const { inheritGenome, normalizeGenome, validateGenome } = context.rules;
const json = x => JSON.parse(JSON.stringify(x));
function gameFor(w) { return { world:w,runId:'test-run',pack:{food:2,water:3},progress:{gathered:2,visited:new Set(),complete:false},gatherCooldown:0,warningLatch:{},effects:[],messages:[],noticeUntil:0 }; }
function saveFor(w) { const s = Object.create(SaveStore.prototype); s.game = gameFor(w); s.revision = 0; return s; }
function prepare(w, c) { c.x = c.px = w.player.x + 40; c.y = c.py = w.player.y; w.social.learn(c,'name',c.publicIdentity.displayName); c.playerKnowledge.relationship.trust=30; c.playerKnowledge.relationship.familiarity=50; w.social.reputation.score=5; }
function compatible(w, sex) { return w.npcs.find(c => c.actual.identity.sex===sex && w.romance.compatibility(w.player,c).ok); }
function action(w,c,topic) { w.elapsed += 4; return w.romance.interact(c.id,topic); }
function marry(w,c) { prepare(w,c); for(let day=0;day<5 && !w.romance.spouse(w.player);day++) { w.elapsed += 120; for(const t of ['compliment','outing','commitment']) action(w,c,t); } w.elapsed+=120; assert.equal(action(w,c,'propose').ok,true); }
function npcPair(w,sameSex=false) {
    const list=w.npcs.filter(c=>c.actual.life.ageYears<=45 && w.romance.preferences(c).familyLife>=.3 && !w.romance.spouse(c));
    for(const a of list) for(const b of list) if((a.actual.identity.sex===b.actual.identity.sex)===sameSex && w.renewal.mutual(a,b)) return [a,b];
    assert.fail('No mutual NPC fixture');
}
function renewing(seed='renewal-test') {const w=new World(seed);w.renewal.setEnabled(true);return w;}

test('visual growth switches only at 6, 18 and 65 days, including fractional ages',()=>{
    for(const [age,label,scale] of [[0,'Child',.45],[5.999,'Child',.45],[6,'Teenager',.7],[17.999,'Teenager',.7],[18,'Adult',1],[64.999,'Adult',1],[65,'Elder',.85],[92,'Elder',.85]]) {
        assert.deepEqual(json(context.rules.lifeStage(age)),{label,scale});
    }
    assert.equal(context.rules.FAMILY.adult,18);
});

test('growth is derived on load without changing genomes, body clearance, raw saves or RNG',()=>{
    const w=new World('growth-contract'),female=w.npcs.filter(c=>c.body.form==='line').slice(0,2);
    const male=w.npcs.find(c=>c.body.form==='polygon'),before=json(saveFor(w).capture()),geometry=json(w.registry.all().map(c=>c.body));
    for(const c of [...female,male]) assert.equal(context.rules.visualRadius(c),c.body.radius*context.rules.lifeStage(c.actual.life.ageYears).scale);
    assert.deepEqual(json(saveFor(w).capture()),before);assert.deepEqual(json(w.registry.all().map(c=>c.body)),geometry);
    const restored=saveFor(w).decode(saveFor(w).encode()).world;
    for(const c of [...female,male]) assert.equal(context.rules.visualRadius(restored.registry.get(c.id)),context.rules.visualRadius(c));
    // Female visible size depends only on public line form and age, not heredity.
    female[0].actual.life.ageYears=female[1].actual.life.ageYears=2;
    female[0].actual.genome.size=.8;female[1].actual.genome.size=1.3;
    assert.equal(context.rules.visualRadius(female[0]),context.rules.visualRadius(female[1]));
});

test('known children have an innate family bond without modifying saved relationships or revealing secrets',()=>{
    const {w}=familyWorld(),ids=w.family.birth().ids,child=w.registry.get(ids[0]);
    const before=json(saveFor(w).capture()),bond=w.social.familyBond(child),r=w.social.relationship(child);
    assert.equal(bond.role,child.actual.identity.sex==='female'?'Daughter':'Son');assert.equal(r.familiarity,48);assert.equal(r.trust,20);assert.equal(w.social.stage(child),2);
    assert.equal(child.playerKnowledge.relationship.trust,0);assert.equal(child.playerKnowledge.discoveredFacts.privateHistory,undefined);
    assert.deepEqual(json(saveFor(w).capture()),before);
});

test('family roles survive child succession, can become estranged and never use concealed parentage',()=>{
    const {w,c}=familyWorld(),ids=w.family.birth().ids;mature(w);const founder=w.player;
    assert.equal(w.family.succeed(ids[0]).ok,true);
    assert.equal(w.social.familyBond(founder).role,'Father');assert.equal(w.social.familyBond(c).role,'Mother');assert.equal(w.social.relationship(founder).trust,20);
    const sibling=w.registry.get(ids[1]);assert.equal(w.social.familyBond(sibling).trust,12);assert.equal(w.social.relationship(sibling).familiarity,36);
    founder.playerKnowledge.relationship.trust=-30;assert.equal(w.social.relationship(founder).trust,-10);
    w.renewal.backgroundBirthIds=[w.family.births[0].id];w.renewal.knownEvents={};
    assert.equal(w.social.familyBond(founder).role,'');assert.equal(w.social.familyBond(sibling).role,'');
    saveFor(w).decode(saveFor(w).encode());
});
function demographics(w) {return json({family:w.family.exportState(),romance:w.romance.exportState(),renewal:w.renewal.exportState(),people:w.registry.all().map(c=>({id:c.id,actual:{...c.actual,life:{...c.actual.life,ageYears:+c.actual.life.ageYears.toFixed(7)}}}))});}

test('renewal builds mutual NPC commitment over four years, births privately and preserves playable RNG',()=>{
    const w=renewing(),[a,b]=npcPair(w),key=w.romance.key(a,b),familyRng=w.family.rng.state,socialRng=w.social.rng.state;
    w.renewal.addPair(a,b,0);w.family.elapse(3*120);assert.equal(w.romance.spouse(a),null);
    w.family.elapse(120);assert.equal(w.romance.spouse(a).id,b.id);assert.equal(w.family.births.length,0);
    w.family.elapse(120);const birth=w.family.births.find(e=>e.motherId===a.id || e.fatherId===a.id);assert.ok(birth);
    assert.ok(birth.childIds.length>=2 && birth.childIds.length<=4);assert.equal(w.family.rng.state,familyRng);assert.equal(w.social.rng.state,socialRng);
    for(const id of birth.childIds) {const c=w.registry.get(id);assert.equal(w.family.name(c),'Unknown citizen');assert.deepEqual(json(c.playerKnowledge.discoveredFacts),{});assert.ok(!w.family.view().members.some(m=>m.id===id));}
    assert.equal(w.renewal.pairs[key].trust[a.id],50);saveFor(w).decode(saveFor(w).encode());
    w.renewal.pairs[key].trust[b.id]=0;w.renewal.pairs[key].affection[b.id]=0;
    assert.equal(w.renewal.birthReason(w.romance.marriages.find(m=>m.ids.includes(a.id))),'mutual readiness');
    w.family.elapse(10*120);
    assert.equal(w.renewal.households[w.romance.marriages.find(m=>m.ids.includes(a.id)).id].cohorts,2);
});

test('renewal respects same-sex households, independent refusal and no joint births',()=>{
    const w=renewing('renewal-same-sex'),[a,b]=npcPair(w,true);w.renewal.addPair(a,b,0);w.family.elapse(5*120);
    assert.equal(w.romance.spouse(a).id,b.id);assert.equal(w.romance.household(a),.88);
    assert.ok(!w.family.births.some(e=>[e.motherId,e.fatherId].includes(a.id)));
    const p=w.renewal.pairs[w.romance.key(a,b)];p.trust[a.id]=0;p.affection[a.id]=0;
    assert.equal(w.romance.readinessFrom(.25,p.trust[a.id],p.affection[a.id]).ready,false);
    assert.equal(w.romance.readinessFrom(.25,100,100).ready,true);
    const [c,d]=npcPair(w);assert.equal(w.renewal.mutual(c,c),false);
    const before=w.social.reputation.score;w.social.reputation.score=-100;const mutual=w.renewal.mutual(c,d);w.social.reputation.score=100;assert.equal(w.renewal.mutual(c,d),mutual);w.social.reputation.score=before;
});

test('renewal commitment closes unfinished player courtship without stealing a marriage or revealing a partner',()=>{
    const w=renewing('renewal-competition'),[a,b]=npcPair(w);w.romance.pair(w.player,a).status='courting';
    w.renewal.addPair(a,b,0);w.family.elapse(4*120);
    assert.equal(w.romance.spouse(a).id,b.id);assert.equal(w.romance.pair(w.player,a).status,'declined');assert.equal(w.romance.spouse(w.player),null);
    prepare(w,a);w.elapsed+=4;const reply=w.romance.interact(a.id,'propose');assert.equal(reply.ok,false);assert.ok(!reply.text.includes(b.actual.identity.name));
    const family=familyWorld().w,spouse=family.romance.spouse(family.player);family.renewal.setEnabled(true);family.family.elapse(10*120);
    assert.equal(family.romance.spouse(family.player).id,spouse.id);assert.equal(family.romance.marriages[0].endedAt,null);
});

test('renewal ordinary boundaries, refuge batches, single years and restarted years agree',()=>{
    const a=renewing('renewal-clock'),b=renewing('renewal-clock'),c=renewing('renewal-clock');let d=renewing('renewal-clock');
    a.family.elapse(10*120);b.family.advance(5);b.family.advance(5);
    for(let year=0;year<10;year++) {c.family.advance(1);d.family.advance(1);d=saveFor(d).decode(saveFor(d).encode()).world;}
    assert.deepEqual(demographics(a),demographics(b));assert.deepEqual(demographics(b),demographics(c));assert.deepEqual(demographics(c),demographics(d));
});

test('renewal activation, disable and re-enable never replay historical years',()=>{
    const w=new World('renewal-policy');w.elapsed=25.5*120;w.renewal.setEnabled(true);
    w.family.elapse(59);assert.equal(Object.keys(w.renewal.pairs).length,0);w.family.elapse(1);assert.equal(w.renewal.processedYear,26);assert.equal(Object.keys(w.renewal.pairs).length,1);
    w.renewal.setEnabled(false);const before=json(w.renewal.pairs),rng=w.renewal.matchingRng.state;w.family.elapse(5*120);
    assert.deepEqual(json(w.renewal.pairs),before);assert.equal(w.renewal.matchingRng.state,rng);
    w.renewal.setEnabled(true);assert.equal(w.renewal.processedYear,31);assert.deepEqual(json(w.renewal.pairs),before);
    saveFor(w).decode(saveFor(w).encode());
    w.family.elapse(120);const once=demographics(w);w.renewal.evaluateYear(w.renewal.processedYear);assert.deepEqual(demographics(w),once);
});

test('renewal preserves fractional NPC death timing across elapsed chunks and suppresses boundary events on survival death',()=>{
    const a=renewing('fractional-death'),b=renewing('fractional-death');
    for(const w of [a,b]) w.npcs[0].actual.life.ageYears=w.family.deathAge(w.npcs[0])-.5;
    a.family.elapse(120);for(let n=0;n<4;n++) b.family.elapse(30);
    assert.equal(a.npcs.some(c=>c.id==='citizen-000'),false);
    assert.deepEqual(json(a.family.history),json(b.family.history));assert.equal(a.family.history[0].at,60);
    a.npcs[0].actual.life.ageYears=100;a.family.elapse(.1);assert.equal(a.player.actual.life.alive,true);
    const w=renewing('boundary-death');w.family.elapse(120,{deferRenewal:true});assert.equal(Object.keys(w.renewal.pairs).length,0);
    w.family.markDeath(w.player,'thirst');w.family.flushRenewal();assert.equal(Object.keys(w.renewal.pairs).length,0);assert.equal(w.renewal.processedYear,1);
});

test('renewal stops before boundary events on player death and retains pending heirs',()=>{
    const {w}=familyWorld();const children=w.family.birth().ids;mature(w);w.renewal.setEnabled(true);
    w.player.actual.life.ageYears=w.family.deathAge(w.player)-1;w.elapsed=Math.floor(w.elapsed/120)*120;
    const births=w.family.births.length;w.family.elapse(5*120);
    assert.equal(w.player.actual.life.alive,false);assert.equal(w.family.births.length,births);assert.equal(Object.keys(w.renewal.pairs).length,0);assert.ok(w.family.candidates().some(c=>children.includes(c.id)));
    const restored=saveFor(w).decode(saveFor(w).encode()).world;assert.equal(restored.player.actual.life.alive,false);assert.ok(restored.family.candidates().length);
});

test('renewal married daughter inherits her own anchor and experienced household only',()=>{
    let w,ids,daughter,spouse;
    for(let seed=0;seed<20 && !spouse;seed++) {
        w=familyWorld(`married-heir-${seed}`).w;ids=w.family.birth().ids;mature(w);w.renewal.setEnabled(true);
        daughter=ids.map(id=>w.registry.get(id)).find(c=>c.actual.identity.sex==='female');
        if(daughter) spouse=w.npcs.find(c=>c.actual.identity.sex==='male' && c.actual.life.ageYears<=50 && w.renewal.mutual(daughter,c) && !w.romance.spouse(c));
    }
    assert.ok(spouse);
    const year=Math.floor(w.elapsed/120);w.renewal.addPair(daughter,spouse,year);const p=w.renewal.pairs[w.romance.key(daughter,spouse)];
    for(const id of p.ids) {p.trust[id]=80;p.affection[id]=90;}w.renewal.marry(p,year);
    const m=w.romance.marriages.at(-1),anchor=w.renewal.households[m.id].anchorId;assert.equal(anchor,daughter.id);
    w.family.elapse(120);
    const privateBirth=w.family.births.find(b=>[b.motherId,b.fatherId].includes(daughter.id));assert.ok(privateBirth);
    const privateChild=w.registry.get(privateBirth.childIds[0]);privateChild.actual.life.ageYears=18; // Controlled adult-heir fixture.
    const dto=w.family.view();assert.ok(dto.undiscoveredHeirs.some(h=>h.id===privateChild.id));
    assert.ok(!dto.members.some(m=>m.id===privateChild.id));assert.ok(!JSON.stringify(dto).includes(privateChild.actual.identity.name));
    const stranger=w.npcs.find(c=>c!==spouse && !ids.includes(c.id) && !w.family.knownFamily().includes(c));
    w.social.learn(stranger,'privateHistory','Founder-only claim','claim',stranger.id);
    assert.equal(w.family.succeed(daughter.id).ok,true);assert.equal(w.romance.spouse(w.player).id,spouse.id);
    assert.equal(spouse.playerKnowledge.relationship.trust,90);assert.equal(w.romance.pair(w.player,spouse).affection,100);
    assert.equal(stranger.playerKnowledge.discoveredFacts.privateHistory,undefined);
    const restored=saveFor(w).decode(saveFor(w).encode()).world;assert.equal(restored.renewal.households[m.id].anchorId,anchor);
    restored.family.elapse(241);assert.equal(restored.family.birth().ok,true);assert.equal(restored.renewal.households[m.id].cohorts,2);
});

test('renewal capacity refusal does not draw RNG or consume IDs and respects the player reserve',()=>{
    const {w}=familyWorld();while(w.registry.all().length<245) {w.elapsed+=241;assert.equal(w.family.birth().ok,true);}
    const [a,b]=npcPair(w);w.renewal.setEnabled(true);const year=Math.floor(w.elapsed/120);w.renewal.addPair(a,b,year);
    const p=w.renewal.pairs[w.romance.key(a,b)];for(const id of p.ids) {p.trust[id]=100;p.affection[id]=100;}w.renewal.marry(p,year);
    const rng=[w.rng.state,w.family.rng.state,w.social.rng.state,w.renewal.birthRng.state,w.renewal.matchingRng.state],nextId=w.family.nextId,count=w.family.births.length;
    w.family.elapse(120);assert.equal(w.family.births.length,count);assert.equal(w.family.nextId,nextId);
    assert.deepEqual([w.rng.state,w.family.rng.state,w.social.rng.state,w.renewal.birthRng.state,w.renewal.matchingRng.state],rng);
    assert.equal(w.renewal.lastFailure,'population capacity');
});
test('seeded baseline and existing simulation state round-trip', () => {
    const a = new World('baseline'), b = new World('baseline'); assert.deepEqual(json(a.resources),json(b.resources)); assert.equal(a.rng.state,b.rng.state);
    const store=saveFor(a), raw=store.encode(), out=store.decode(raw); assert.deepEqual(json(out.world.player),json(a.player)); assert.equal(out.world.social.rng.state,a.social.rng.state);
});

test('parenthood checkpoint v4 retains every deceased record and observer notebook',()=>{
    const original=JSON.parse(fs.readFileSync('tools/fixtures/parenthood-v4.json','utf8'));
    const store=saveFor(new World('unused')),out=store.decode(JSON.stringify(original));
    store.game={...gameFor(out.world),...out.saved,world:out.world,progress:{...out.saved.progress,visited:new Set(out.saved.progress.visited)},noticeUntil:out.saved.notice.until};
    const captured=json(store.capture());delete captured.renewal;assert.deepEqual(captured,original.payload);
});

test('v5 lossless archive round-trips and all legacy policies stay disabled',()=>{
    for(const fixture of ['phase2a-v2','phase2b-v3','released-v4','parenthood-v4']) {
        const raw=fs.readFileSync(`tools/fixtures/${fixture}.json`,'utf8'),out=context.rules.SaveCodec.decode(raw),store=saveFor(out.world);
        assert.equal(out.world.renewal.enabled,false);assert.equal(out.envelope.version,JSON.parse(raw).version);
        const a=json(store.capture()),b=store.decode(store.encode()).world;
        assert.deepEqual(json(b.registry.all().map(c=>c.actual)),a.characters.map(c=>c.actual));
        assert.deepEqual(json(b.family.notebooks),a.family.notebooks);
        assert.deepEqual(json(b.renewal.exportState()),a.renewal);
    }
});

test('v5 rejects invalid anchor, cohort count, cursor and RNG without mutating the source',()=>{
    const {w}=familyWorld(),store=saveFor(w),before=store.encode();
    for(const mutate of [s=>s.renewal.processedYear=999,s=>s.renewal.birthRngState=-1,s=>s.renewal.households['marriage-1'].anchorId='missing',s=>s.renewal.households['marriage-1'].cohorts=2]) {
        const d=JSON.parse(before);mutate(d.payload);d.checksum=hash(JSON.stringify(d.payload));
        assert.throws(()=>store.decode(JSON.stringify(d)),/renewal|household/i);
    }
    assert.deepEqual(json(store.capture()),JSON.parse(before).payload);
});

test('v5 measures UTF-8 bytes while the legacy string-unit reader retains its acceptance',()=>{
    const data=JSON.parse(saveFor(new World('unicode')).encode());
    data.padding=Array.from({length:180},()=>'界'.repeat(4000));
    const raw=JSON.stringify(data);assert.ok(raw.length<2_000_000);assert.ok(Buffer.byteLength(raw)>2_000_000);
    assert.throws(()=>context.rules.SaveCodec.parse(raw),/byte budget/);
    data.version=4;assert.equal(context.rules.SaveCodec.parse(JSON.stringify(data)).version,4);
});

test('oversized notebook rejects the whole birth with no IDs, RNG, cooldown or discovery consumed',()=>{
    const {w}=familyWorld(),k=json(w.npcs[0].playerKnowledge);
    k.discoveredFacts.family={value:'x'.repeat(1000),kind:'claim',sourceId:w.npcs[0].id,at:w.elapsed};
    // Valid knowledge entries, repeated across archived observers and subjects;
    // the retained history exceeds the structural budget before a new cohort.
    for(const observer of w.registry.all()) w.family.notebooks[observer.id]={knowledge:Object.fromEntries(w.registry.all().map(c=>[c.id,k])),reputation:{score:0,events:[]}};
    const before=json(saveFor(w).capture()),result=w.family.birth();
    assert.equal(result.ok,false);assert.match(result.text,/large|budget/i);
    assert.deepEqual(json(saveFor(w).capture()),before);
});

test('detached explicit-parent planning preserves a54a872 inheritance and consumes no live state',()=>{
    const {w,c}=familyWorld(),before=saveFor(w).capture(),plan=w.family.planCohort(w.player.id,c.id,w.player.id,w.family.rng.state);
    assert.deepEqual(json(saveFor(w).capture()),json(before));
    const released=JSON.parse(fs.readFileSync('tools/fixtures/parenthood-v4.json','utf8')).payload;
    assert.deepEqual(json(plan.children.map(c=>c.actual.genome)),released.family.births[0].childIds.map(id=>released.characters.find(c=>c.id===id).actual.genome));
    assert.equal(plan.rngState,released.family.rngState);assert.equal(plan.nextId,released.family.nextId);
    const invalid=()=>w.family.planCohort(w.player.id,c.id,'missing',w.family.rng.state);
    assert.throws(invalid,/Invalid cohort/);assert.deepEqual(json(saveFor(w).capture()),json(before));
});
test('frozen released v4 family, daughter observer and deceased ancestors round-trip exactly', () => {
    const raw=fs.readFileSync('tools/fixtures/released-v4.json','utf8'), original=JSON.parse(raw);
    const store=saveFor(new World('unused')), restored=store.decode(raw);
    store.game={...gameFor(restored.world),...restored.saved,world:restored.world,progress:{...restored.saved.progress,visited:new Set(restored.saved.progress.visited)},noticeUntil:restored.saved.notice.until};
    const captured=json(store.capture());delete captured.renewal;assert.deepEqual(captured,original.payload);
    assert.equal(restored.world.player.actual.identity.sex,'female');
    assert.equal(restored.world.family.character('founder-000').actual.life.alive,false);
    assert.ok(restored.world.family.notebooks['founder-000']);
});
test('save codec validates released schemas without a DOM, storage adapter or active game', () => {
    const portable=vm.createContext({});
    const source=files.filter(f=>f!=='persistence').map(f=>fs.readFileSync(`src/${f}.js`,'utf8')).join('\n');
    vm.runInContext(source+'\nglobalThis.codec=SaveCodec;',portable);
    for(const fixture of ['phase2a-v2','phase2b-v3','released-v4']) {
        const raw=fs.readFileSync(`tools/fixtures/${fixture}.json`,'utf8');
        const decoded=portable.codec.decode(raw);
        assert.deepEqual(json(decoded.envelope),JSON.parse(raw));
        assert.equal(decoded.world.player.id,decoded.saved.currentPlayerId || 'founder-000');
        assert.equal(decoded.world.rng.state,decoded.saved.rngState);
        assert.equal(typeof portable.document,'undefined');
        assert.equal(typeof portable.localStorage,'undefined');
        assert.equal(typeof portable.game,'undefined');
    }
    const data=JSON.parse(fs.readFileSync('tools/fixtures/released-v4.json','utf8'));
    data.payload.characters.at(-1).actual.life.ageYears=-1; data.checksum=hash(JSON.stringify(data.payload));
    assert.throws(()=>portable.codec.decode(JSON.stringify(data)),/Invalid age/);
});
test('released v4 observer fallback migrates without rewriting the source envelope', () => {
    const data=JSON.parse(fs.readFileSync('tools/fixtures/released-v4.json','utf8'));
    const playerId=data.payload.currentPlayerId; delete data.payload.currentPlayerId;
    data.checksum=hash(JSON.stringify(data.payload)); const raw=JSON.stringify(data);
    const out=context.rules.SaveCodec.decode(raw);
    assert.equal(out.world.player.id,playerId); assert.deepEqual(json(out.envelope),data);
});
test('registry keeps deceased identities and observer sources outside living NPC simulation', () => {
    const {w,c}=familyWorld(); const children=w.family.birth().ids;
    w.social.learn(w.npcs[1],'occupation','A recorded claim','claim',c.id);
    const total=w.registry.all().length, oldId=c.id, genome=json(c.actual.genome);
    w.family.markDeath(c);
    assert.equal(w.registry.all().length,total);
    assert.equal(w.registry.get(oldId),c); assert.equal(w.family.character(oldId),c);
    assert.ok(!w.npcs.includes(c)); assert.ok(!w.registry.living().includes(c));
    assert.equal(w.social.citizen(oldId),null);
    assert.equal(w.romance.spouse(w.player),null);
    assert.throws(()=>w.registry.add(c),/Duplicate/);
    const before=w.registry.all().map(c=>c.id);
    assert.throws(()=>w.registry.replace([w.player,w.player],w.player.id));
    assert.deepEqual(w.registry.all().map(c=>c.id),before);
    const restored=saveFor(w).decode(saveFor(w).encode()).world;
    assert.ok(!restored.npcs.some(c=>c.id===oldId));
    assert.deepEqual(json(restored.registry.get(oldId).actual.genome),genome);
    for(const id of children) assert.equal(restored.family.character(id).actual.lineage.motherId,oldId);
});
test('registry preserves dead founder genealogy, kinship and notebooks through daughter succession', () => {
    const {w}=familyWorld(); const children=w.family.birth().ids; mature(w);
    const old=w.player; w.family.markDeath(old); const next=w.family.character(children[0]);
    assert.equal(w.family.succeed(next.id).ok,true);
    assert.equal(w.player,next); assert.ok(!w.npcs.includes(old));
    assert.equal(w.registry.get(old.id),old); assert.ok(w.family.notebooks[old.id]);
    assert.equal(w.romance.isCloseKin(next,w.family.character(children[1])),true);
    const dto=JSON.stringify(w.family.view());
    assert.ok(dto.includes('Founder')); assert.ok(!dto.includes('latentIrregularAncestry')); assert.ok(!dto.includes('sideCount'));
    const restored=saveFor(w).decode(saveFor(w).encode()).world;
    assert.equal(restored.family.character(old.id).actual.life.alive,false);
    assert.equal(restored.player.id,next.id);
    assert.equal(restored.registry.all().length,w.registry.all().length);
});
test('observer transfer archives discoveries without sharing private claims with an heir', () => {
    const {w}=familyWorld(); const children=w.family.birth().ids; mature(w);
    const subject=w.npcs.find(c=>!children.includes(c.id) && !w.family.knownFamily().includes(c));
    w.social.learn(subject,'privateHistory','A private founder conversation','claim',subject.id);
    const founder=w.player.id;
    assert.equal(w.family.succeed(children[0]).ok,true);
    const archived=w.family.notebooks[founder].knowledge[subject.id];
    assert.equal(archived.discoveredFacts.privateHistory.value,'A private founder conversation');
    assert.equal(subject.playerKnowledge.discoveredFacts.privateHistory,undefined);
    w.social.learn(subject,'name','A fresh observation','confirmed','player');
    assert.notEqual(archived.discoveredFacts.name?.value,'A fresh observation');
    assert.ok(!JSON.stringify(w.family.view()).includes('A private founder conversation'));
    saveFor(w).decode(saveFor(w).encode());
});
test('population budget counts deceased records and refuses births without consuming IDs or RNG', () => {
    const {w,c}=familyWorld();
    while(w.registry.all().length<=context.rules.FAMILY.maxPopulation-4) {
        w.elapsed+=2*120+1; const born=w.family.birth(); assert.equal(born.ok,true,born.text);
    }
    const count=w.registry.all().length, nextId=w.family.nextId, rng=w.family.rng.state;
    assert.ok(count<=256 && count>252);
    for(const child of w.registry.all().filter(n=>n!==w.player && n!==c)) w.family.markDeath(child);
    assert.equal(w.npcs.length,1);
    assert.equal(w.family.birth().ok,false);
    assert.equal(w.family.nextId,nextId);assert.equal(w.family.rng.state,rng);
    const restored=saveFor(w).decode(saveFor(w).encode()).world;
    assert.equal(restored.registry.all().length,count);assert.equal(restored.npcs.length,1);
});
test('age is learned by conversation, dated in the notebook and preserved through save and succession', () => {
    const {w}=familyWorld(), c=w.npcs[0]; prepare(w,c);
    c.actual.life.ageYears=70.75;
    assert.equal(w.social.view(c).facts.find(f=>f.key==='age').locked,true);
    assert.equal(c.playerKnowledge.discoveredFacts.age,undefined);
    w.elapsed+=120;
    const result=w.social.interact(c.id,'age');
    assert.equal(result.ok,true); assert.match(result.text,/I’m 70 days old/);
    const fact=json(c.playerKnowledge.discoveredFacts.age);
    assert.equal(fact.value,`70 days old on day ${Math.floor(w.elapsed/120)+1}`);
    assert.equal(fact.kind,'claim'); assert.equal(fact.sourceId,c.id);
    assert.equal(c.playerKnowledge.discoveredFacts.privateHistory,undefined);
    w.elapsed+=120; c.actual.life.ageYears+=1;
    assert.deepEqual(json(w.social.view(c).facts.find(f=>f.key==='age')), {key:'age',label:'Age when asked',...fact});
    const restored=saveFor(w).decode(saveFor(w).encode()).world;
    assert.deepEqual(json(restored.registry.get(c.id).playerKnowledge.discoveredFacts.age),fact);
    c.actual.life.ageYears=40; // Keep a possible spouse eligible in this isolated succession fixture.
    const child=w.registry.get(w.family.birth().ids[0]); child.actual.life.ageYears=18; w.player.actual.life.ageYears=40;
    const founder=w.player.id; assert.equal(w.family.succeed(child.id).ok,true);
    assert.equal(c.playerKnowledge.discoveredFacts.age,undefined);
    assert.deepEqual(json(w.family.notebooks[founder].knowledge[c.id].discoveredFacts.age),fact);
    saveFor(w).decode(saveFor(w).encode());
});
test('asking age respects introductions, cooldown, repetition and daily conversation limits', () => {
    const w=new World('age-conversation'),c=w.npcs[0];
    c.x=c.px=w.player.x+40; c.y=c.py=w.player.y;
    assert.equal(w.social.interact(c.id,'age').ok,false);
    assert.equal(c.playerKnowledge.discoveredFacts.age,undefined);
    w.elapsed+=4; prepare(w,c);
    assert.equal(w.social.interact(c.id,'age').ok,false); // Same topic already asked today.
    w.elapsed+=120;
    assert.equal(w.social.interact(c.id,'age').ok,true);
    const fact=json(c.playerKnowledge.discoveredFacts.age);
    assert.equal(w.social.interact(c.id,'age').outcome,'cooldown');
    w.elapsed+=4; assert.equal(w.social.interact(c.id,'age').outcome,'negative');
    c.playerKnowledge.relationship.today=6; w.elapsed+=4;
    assert.equal(w.social.interact(c.id,'age').outcome,'daily-limit');
    assert.deepEqual(json(c.playerKnowledge.discoveredFacts.age),fact);
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
test('separation bypasses exhausted budgets, cooldown and repeated topics, preserves children and permits remarriage',()=>{
    const {w,c}=familyWorld(),children=json(w.family.birth().ids),pair=w.romance.pair(w.player,c),r=c.playerKnowledge.relationship;
    r.day=pair.day=Math.floor(w.elapsed/120);r.today=6;pair.today=3;r.lastAt=pair.lastAt=w.elapsed;pair.topics.separate=1;
    const before=json({r,affection:pair.affection,today:pair.today,lastAt:pair.lastAt,topics:pair.topics});
    assert.equal(w.romance.interact(c.id,'separate').ok,true);
    assert.equal(w.romance.spouse(w.player),null);assert.equal(w.romance.spouse(c),null);assert.equal(pair.status,'separated');
    assert.deepEqual(json(w.player.actual.bonds.partnerIds),[]);assert.deepEqual(json(c.actual.bonds.partnerIds),[]);
    assert.equal(w.romance.household(w.player),1);
    assert.deepEqual(json(w.player.actual.lineage.childrenIds),children);assert.deepEqual(json(c.actual.lineage.childrenIds),children);
    assert.equal(w.romance.marriages[0].endedAt,w.elapsed);assert.equal(w.romance.marriages[0].reason,'separation');
    assert.deepEqual(json({r,affection:pair.affection,today:pair.today,lastAt:pair.lastAt,topics:pair.topics}),before);
    assert.equal(w.romance.interact(c.id,'separate').ok,false);assert.equal(w.romance.marriages.length,1);
    const restored=saveFor(w).decode(saveFor(w).encode()).world;assert.equal(restored.romance.spouse(restored.player),null);
    const partner=compatible(w,'male');marry(w,partner);assert.equal(w.romance.spouse(w.player).id,partner.id);
    assert.deepEqual(json(w.player.actual.lineage.childrenIds),children);saveFor(w).decode(saveFor(w).encode());
});
test('separation still requires proximity and its queued approach skips only the courtship cooldown',()=>{
    const {w,c}=familyWorld();c.playerKnowledge.relationship.lastAt=w.romance.pair(w.player,c).lastAt=w.elapsed;
    const q=new context.rules.CitizenApproach(w,(id,action)=>assert.equal(w.romance.interact(id,action.topic).ok,true),()=>assert.fail('Approach failed'));
    const x=c.x;c.x=w.player.x+500;assert.equal(w.romance.interact(c.id,'separate').outcome,'out-of-range');assert.equal(w.romance.spouse(w.player).id,c.id);
    c.x=x;q.start(c.id,{kind:'romance',topic:'separate'});q.movement(.1);
    assert.equal(q.pending,null);assert.equal(w.romance.spouse(w.player),null);
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
function hesitantFamily() {
    for(let seed=0;seed<20;seed++) {
        const w=new World(`hesitant-${seed}`);w.social.reputation.score=5;
        const c=w.npcs.find(c=>c.actual.identity.sex==='female' && c.actual.life.ageYears<=60 && w.romance.compatibility(w.player,c).ok && w.romance.preferences(c).familyLife<.3);
        if(c) {marry(w,c);return {w,c};}
    }
    assert.fail('No hesitant fixture partner');
}
test('hesitant spouse can reconsider with trust and affection, and readiness can fall again',()=>{
    const {w,c}=hesitantFamily(),pair=w.romance.pair(w.player,c),base=w.romance.preferences(c).familyLife;
    c.playerKnowledge.relationship.trust=30;pair.affection=42;
    assert.equal(w.romance.parenthoodReadiness(w.player,c).ready,false);assert.match(w.family.birthEligibility(),/unsure/);
    for(let day=0;day<4 && !w.romance.parenthoodReadiness(w.player,c).ready;day++) {
        w.elapsed+=120;for(const topic of ['compliment','outing','commitment']) assert.equal(action(w,c,topic).ok,true);
    }
    const ready=w.romance.parenthoodReadiness(w.player,c);assert.equal(ready.ready,true);assert.ok(ready.willingness>base);
    assert.equal(w.family.birthEligibility(),'');
    const store=saveFor(w),restored=store.decode(store.encode()).world;
    assert.deepEqual(json(restored.romance.parenthoodReadiness(restored.player,restored.registry.get(c.id))),json(ready));
    assert.equal(restored.family.birth().ok,true);
    c.playerKnowledge.relationship.trust=10;assert.match(w.family.birthEligibility(),/trust/);
    c.playerKnowledge.relationship.trust=30;pair.affection=42;assert.equal(w.romance.parenthoodReadiness(w.player,c).ready,false);
    assert.equal(w.romance.preferences(c).familyLife,base);
});
test('discussing children explains hesitation but cannot farm willingness and uses shared limits',()=>{
    const {w,c}=hesitantFamily(),pair=w.romance.pair(w.player,c);c.playerKnowledge.relationship.trust=30;pair.affection=42;w.elapsed+=120;
    const before=json(w.romance.parenthoodReadiness(w.player,c)),rng=[w.rng.state,w.social.rng.state,w.family.rng.state];
    assert.match(action(w,c,'children').text,/unsure/);
    assert.equal(w.romance.interact(c.id,'children').outcome,'cooldown');
    action(w,c,'children');action(w,c,'children');assert.equal(action(w,c,'children').outcome,'daily-limit');
    assert.deepEqual(json(w.romance.parenthoodReadiness(w.player,c)),before);
    assert.deepEqual([w.rng.state,w.social.rng.state,w.family.rng.state],rng);
    assert.equal(Object.hasOwn(pair.topics,'children'),false);
    const store=saveFor(w);store.decode(store.encode());
});
test('family discussions support same-sex households while retaining biological birth rules',()=>{
    const w=new World('romance'),c=compatible(w,'male');marry(w,c);w.elapsed+=120;
    const result=action(w,c,'children');assert.equal(result.ok,true);assert.match(result.text,/can’t have joint biological children/);
    assert.equal(w.family.birth().ok,false);
    const other=compatible(w,'female');prepare(w,other);w.romance.pair(w.player,other).affection=90;
    assert.match(action(w,other,'children').text,/existing marriage/);
    saveFor(w).decode(saveFor(w).encode());
});
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
    'one-sided spouse bond':s=>s.characters[0].actual.bonds.partnerIds=[],
    'invented spouse bond':s=>s.characters.find(c=>!c.actual.bonds.partnerIds.length).actual.bonds.partnerIds=[s.characters[0].id],
    'missing marriage history bond':s=>s.characters[0].actual.bonds.marriageIds=[],
    'duplicate spouse bond':s=>s.characters[0].actual.bonds.partnerIds.push(s.characters[0].actual.bonds.partnerIds[0]),
    'ancestor cycle':s=>{const c=s.characters.at(-1);c.actual.lineage.childrenIds.push(s.characters[0].id);s.characters[0].actual.lineage.motherId=c.id;s.characters[0].actual.genome.motherId=c.id;},
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
test('approach waits until nearby and respects the existing interaction cooldown',()=>{
    const w=new World('approach'), c=w.npcs[0];c.x=c.px=1728;c.y=c.py=1092;
    let called=0;const q=new context.rules.CitizenApproach(w,()=>called++,()=>assert.fail('Route failed'));
    q.start(c.id,{kind:'social',topic:'introduce'});assert.equal(called,0);
    for(let i=0;i<300&&q.pending;i++){w.elapsed+=1/60;const m=q.movement(1/60);if(m)w.move(w.player,m.x*136/60,m.y*136/60);}
    assert.equal(called,1);assert.equal(q.pending,null);
    c.playerKnowledge.relationship.lastAt=w.elapsed;q.start(c.id,{});q.movement(.1);assert.equal(called,1);
    w.elapsed+=3.1;q.movement(.1);assert.equal(called,2);
});
test('queued approach can cancel and handles missing/deceased targets without interaction',()=>{
    const w=new World('approach'),c=w.npcs[0],errors=[];let called=0;
    const q=new context.rules.CitizenApproach(w,()=>called++,message=>errors.push(message));q.start(c.id,{});q.cancel();assert.equal(q.movement(1),null);
    q.start('missing',{});q.movement(.1);assert.equal(errors.length,1);c.actual.life.alive=false;q.start(c.id,{});q.movement(.1);assert.equal(errors.length,2);assert.equal(called,0);
});
test('brief replies preserve a character line without exposing mechanical commentary',()=>{
    const reply=context.rules.briefReply({text:'“Yes. Let us build a life together.” Household support lowers food and water use by 12%.',ok:true},'propose');
    assert.ok(reply.includes('Yes'));assert.ok(!reply.includes('12%'));assert.ok(reply.length<60);
    assert.equal(context.rules.briefReply({text:'A long birth event.',ok:true,ids:['a','b']},'birth'),'2 children born. Meet them in Family.');
});
test('automatic approach takes a collision-free route around a building',()=>{
    const w=new World('approach-obstacles'),c=w.npcs[0];let fixture;
    for(const b of w.obstacles.filter(b=>b.kind==='building')) {
        const left={x:b.x-32,y:b.y+b.h/2},right={x:b.x+b.w+32,y:b.y+b.h/2};
        if(!w.circleClear(left.x,left.y,27)||!w.circleClear(right.x,right.y,27))continue;
        const path=w.nav.path(left.x,left.y,right.x,right.y);
        if(path?.length>1){fixture={left,right};break;}
    }
    assert.ok(fixture);Object.assign(w.player,fixture.left);Object.assign(c,fixture.right);let arrived=false;
    const q=new context.rules.CitizenApproach(w,()=>arrived=true,message=>assert.fail(message));q.start(c.id,{});
    for(let i=0;i<2000 && q.pending;i++){w.elapsed+=1/60;const m=q.movement(1/60);if(m)w.move(w.player,m.x*136/60,m.y*136/60);assert.ok(w.circleClear(w.player.x,w.player.y,w.player.body.radius-.001));}
    assert.ok(arrived);
});

require('./combat-integration.cjs')({test,assert,context,World,prepare,saveFor,json,familyWorld,mature});
