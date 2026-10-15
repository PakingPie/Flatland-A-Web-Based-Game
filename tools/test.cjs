// Dependency-free deterministic rules/integration harness; real rendering is
// checked separately with tools/browser-smoke.cjs.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const files = ['core','characters','navigation','world','social','romance','persistence'];
const context = vm.createContext({ console, document: { getElementById: () => ({textContent:'', hidden:true}) }, performance, structuredClone });
vm.runInContext(files.map(f => fs.readFileSync(`src/${f}.js`, 'utf8')).join('\n') + '\nglobalThis.rules = {World,RNG,SaveStore,hash,ROMANCE,emptyRelationship};', context);
const { World, RNG, SaveStore, hash, emptyRelationship } = context.rules;
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
