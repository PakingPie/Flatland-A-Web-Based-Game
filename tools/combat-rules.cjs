const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const ctx=vm.createContext({});
vm.runInContext(['core','genetics','characters','combat-rules'].map(f=>fs.readFileSync(`src/${f}.js`,'utf8')).join('\n')+'\nglobalThis.rules={RNG,createCharacter,combatProfile,meleeContact,meleeReach,faces,freshSwing,beginSwing,tickSwing,sparDamage,MELEE};',ctx);
const r=ctx.rules,plain=x=>JSON.parse(JSON.stringify(x));
const actor=(sides=3,form='polygon',seed='melee')=>r.createCharacter(seed,{sideCount:sides},form,0,0,new r.RNG(seed),true);
test('visible triangle, blunt and line profiles trade capped reach for arc',()=>{
    const t=r.combatProfile(actor().body),p=r.combatProfile(actor(8).body),l=r.combatProfile(actor(3,'line').body);
    assert.ok(t.extension>p.extension && t.arc<p.arc); assert.equal(l.radius,17);
    for(const profile of [t,p,l]) {assert.ok(profile.extension<=22);assert.equal(profile.damage,8);}
});
test('female profiles ignore hidden genome, carrier, rank and saved adult radius',()=>{
    const a=actor(3,'line'),b=actor(12,'line','other');b.actual.genome.latentIrregularAncestry=true;b.actual.genome.size=1.3;b.body.radius=100;
    assert.deepEqual(plain(r.combatProfile(a.body)),plain(r.combatProfile(b.body)));
    assert.equal(r.combatProfile(a.body,.85).radius,14.45);
});
test('contact rejects facing, range and terrain and includes exact contact boundary',()=>{
    const p=r.combatProfile(actor().body),a={x:0,y:0,angle:0},b={x:r.meleeReach(p,p),y:0,angle:Math.PI};
    assert.equal(r.meleeContact(a,b,p,p,()=>true),true);b.x+=.01;assert.equal(r.meleeContact(a,b,p,p,()=>true),false);
    b.x=40;a.angle=Math.PI;assert.equal(r.meleeContact(a,b,p,p,()=>true),false);a.angle=0;assert.equal(r.meleeContact(a,b,p,p,()=>false),false);
});
test('one fixed-step strike after 21 ticks, 39 recovery ticks, no repeat bypass',()=>{
    const s=r.freshSwing();assert.equal(r.beginSwing(s,12,0),true);
    let hits=0;for(let i=1;i<=60;i++) {if(r.tickSwing(s)) {hits++;assert.equal(i,21);} if(i<60) assert.equal(r.beginSwing(s,100,0),false);}
    assert.equal(hits,1);assert.equal(s.phase,'ready');assert.equal(r.beginSwing(s,11.99,0),false);
});
test('frontal block costs stamina, rear and exhausted defense do not block; damage is nonlethal',()=>{
    assert.deepEqual(plain(r.sparDamage(100,8,true)),{health:96.8,stamina:0,blocked:true});
    assert.equal(r.sparDamage(100,7.99,true).health,92);assert.equal(r.sparDamage(100,100,false).health,92);
    assert.equal(r.sparDamage(2,100,false).health,1);assert.equal(r.sparDamage(1,100,true).health,1);
    assert.equal(r.faces({x:0,y:0,angle:Math.PI},{x:10,y:0},Math.PI/2),false);
});
test('profiles derive irregular visible outlines and reproduce across fixed seeds without mutation',()=>{
    for(const seed of ['triangle','regular','irregular','daughter']) {
        const a=actor(seed==='regular'?8:seed==='irregular'?5:3,seed==='daughter'?'line':'polygon',seed),before=plain(a);
        if(seed==='irregular') a.body.points[1][0]*=.8;
        const body=plain(a.body);assert.deepEqual(plain(r.combatProfile(a.body)),plain(r.combatProfile(body)));
        assert.deepEqual(plain(a.body),body);assert.equal(a.actual.lineage.generation,before.actual.lineage.generation);
    }
});
