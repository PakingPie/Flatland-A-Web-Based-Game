// Reproduce the released v4 compatibility fixture from checkpoint source only.
// Never regenerate this fixture using the current implementation.
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const checkpoint = 'a54a872';
const files = ['core','genetics','characters','registry','navigation','world','social','romance','household','family-invariants','observer-notebooks','family-view','family','approach','save-format','save-validation','save-migrations','save-codec','persistence'];
const source = files.map(f => execFileSync('git', ['show', `${checkpoint}:src/${f}.js`], {encoding:'utf8'})).join('\n');
const context = vm.createContext({document:{getElementById:()=>({textContent:'',hidden:true})}});
const raw = vm.runInContext(source + `
    const w = new World('family'); w.social.reputation.score=5;
    const c=w.npcs.find(c=>c.actual.identity.sex==='female' && c.actual.life.ageYears<=60 && w.romance.compatibility(w.player,c).ok && w.romance.preferences(c).familyLife>=.3);
    c.x=c.px=w.player.x+40; c.y=c.py=w.player.y;
    w.social.learn(c,'name',c.publicIdentity.displayName);
    c.playerKnowledge.relationship.trust=30; c.playerKnowledge.relationship.familiarity=50;
    const act=t=>{w.elapsed+=4;return w.romance.interact(c.id,t);};
    for(let d=0;d<5 && !w.romance.spouse(w.player);d++){w.elapsed+=120;for(const t of ['compliment','outing','commitment']) act(t);}
    w.elapsed+=120; insist(act('propose').ok,'Fixture marriage failed');
    const children=w.family.birth().ids;
    for(let i=0;i<4;i++) w.family.advance(5); w.family.advance(1);
    const heir=children.map(id=>w.family.character(id)).find(c=>c.actual.identity.sex==='female');
    insist(w.family.succeed(heir.id).ok,'Fixture succession failed');
    w.family.markDeath(w.family.character('founder-000'));
    const store=Object.create(SaveStore.prototype);
    store.game={world:w,runId:'parenthood-v4-family',pack:{food:2,water:3},progress:{gathered:2,visited:new Set(),complete:false},gatherCooldown:0,warningLatch:{},effects:[],messages:[],noticeUntil:0};
    store.revision=0;
    const envelope=JSON.parse(store.encode()); envelope.savedAt=1792022400000;
    JSON.stringify(envelope);
`, context);
fs.writeFileSync('tools/fixtures/parenthood-v4.json', raw+'\n');
console.log(`Frozen parenthood-v4 fixture from ${checkpoint} (${raw.length} characters).`);
