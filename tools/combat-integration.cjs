// Reuse the dependency-free world harness without UI/browser globals.
module.exports=({test,assert,context,World,prepare,saveFor,json,familyWorld,mature})=>{
    const fs=require('node:fs'),vm=require('node:vm');
    vm.runInContext(fs.readFileSync('src/combat-rules.js','utf8')+'\n'+fs.readFileSync('src/sparring.js','utf8')+'\nglobalThis.rules.Sparring=Sparring;',context);
    function fixture(w=new World('spar-integration')) {
        const c=w.npcs.find(c=>c.body.form==='line'),p=w.player;prepare(w,c);p.angle=0;c.angle=Math.PI;
        const g={world:w,state:'running',input:{attack:false,defend:false,hold:{},clear(){this.attack=false;this.defend=false;this.hold={};}},socialUI:{isOpen:false},notify(){}};
        const spar=new context.rules.Sparring(g);g.spar=spar;return {w,c,p,g,spar};
    }
    test('spar eligibility refuses unknown, minor, dead, hungry, tired and distrusting participants without RNG or social gains',()=>{
        const {w,c,spar}=fixture(),rng=w.rng.state;
        for(const [key,value] of [['health',34],['hunger',29],['thirst',29],['stamina',29]]) {const v=c.vitals[key];c.vitals[key]=value;assert.equal(spar.invite(c.id).ok,false);c.vitals[key]=v;}
        const age=c.actual.life.ageYears;c.actual.life.ageYears=17;assert.equal(spar.invite(c.id).ok,false);c.actual.life.ageYears=age;
        c.actual.life.alive=false;assert.equal(spar.invite(c.id).ok,false);c.actual.life.alive=true;
        c.playerKnowledge.relationship.trust=-1;const before=json(saveFor(w).capture());assert.equal(spar.invite(c.id).ok,false);assert.equal(spar.active,null);assert.equal(w.rng.state,rng);assert.deepEqual(json(saveFor(w).capture()),before);
        delete c.playerKnowledge.discoveredFacts.name;assert.equal(spar.invite(c.id).ok,false);
    });
    test('spar locks one opponent, strikes once, spends stamina once and rejects recovery commands',()=>{
        const {w,c,p,g,spar}=fixture();assert.equal(spar.invite(c.id).ok,true);assert.equal(spar.invite(w.npcs[1].id).ok,false);
        const before=c.vitals.health,stamina=p.vitals.stamina;g.input.attack=true;spar.step();
        for(let i=1;i<21;i++) {g.input.attack=true;spar.step();}
        assert.equal(c.vitals.health,before-8);assert.equal(p.vitals.stamina,stamina-12);
        for(let i=0;i<25;i++) {g.input.attack=true;spar.step();}assert.equal(c.vitals.health,before-8);
    });
    test('spar terrain rejection and rotated/retreated targets miss without damage',()=>{
        const {w,c,g,spar}=fixture();spar.invite(c.id);w.segmentClear=()=>false;const health=c.vitals.health;
        g.input.attack=true;for(let i=0;i<21;i++)spar.step();assert.equal(c.vitals.health,health);
        spar.active.swings[w.player.id].phase='ready';w.segmentClear=()=>true;w.player.angle=Math.PI;g.input.attack=true;for(let i=0;i<21;i++)spar.step();assert.equal(c.vitals.health,health);
    });
    test('nonlethal floor, guard exhaustion and sustained escape terminate safely with retained vitals',()=>{
        let f=fixture();f.spar.invite(f.c.id);f.c.vitals.health=2;f.g.input.attack=true;for(let i=0;i<21;i++)f.spar.step();assert.equal(f.c.vitals.health,1);assert.equal(f.c.actual.life.alive,true);assert.equal(f.spar.active,null);
        f=fixture();f.spar.invite(f.c.id);f.p.vitals.stamina=.05;f.g.input.defend=true;f.spar.step();assert.equal(f.spar.active,null);assert.equal(f.p.vitals.stamina,0);
        f=fixture();f.spar.invite(f.c.id);f.c.x=f.p.x+240;for(let i=0;i<120;i++)f.spar.step();assert.equal(f.spar.active,null);
    });
    test('spar saves only normal vitals and never encounter, swing or inputs; family days are refused',()=>{
        const {w,c,p,g,spar}=fixture();spar.invite(c.id);g.input.attack=true;spar.step();
        const store=saveFor(w),captured=json(store.capture()),loaded=store.decode(store.encode()).world;
        assert.equal(w.family.advance(1).ok,false);assert.equal(loaded.sparring,undefined);assert.deepEqual(json(loaded.player.vitals),json(p.vitals));
        assert.ok(!JSON.stringify(captured).includes('windup'));const knowledge=json(c.playerKnowledge);spar.end('');assert.deepEqual(json(c.playerKnowledge),knowledge);assert.equal(w.sparring,null);
    });
    test('shared natural death cancels an in-flight swing once without replacing the participant',()=>{
        const {w,c,p,g,spar}=fixture();spar.invite(c.id);g.input.attack=true;spar.step();const health=p.vitals.health;
        c.actual.life.ageYears=w.family.deathAge(c)-.0001;w.family.elapse(.1);assert.equal(spar.active,null);assert.equal(c.vitals.health,0);assert.equal(w.registry.get(c.id),c);assert.equal(p.vitals.health,health);
        w.family.markDeath(c);assert.equal(w.family.history.filter(e=>e.kind==='death'&&e.ids.includes(c.id)).length,1);
    });
    test('daughter succession cancels sparring while keeping identity, family bonds and the line profile',()=>{
        const {w}=familyWorld();const ids=w.family.birth().ids;mature(w);const daughter=ids.map(id=>w.registry.get(id)).find(c=>c.body.form==='line');assert.ok(daughter);
        const {c,spar}=fixture(w);c.x=w.player.x+40;c.y=w.player.y;spar.invite(c.id);assert.ok(spar.active);
        assert.equal(w.family.succeed(daughter.id).ok,true);assert.equal(spar.active,null);assert.equal(w.player.id,daughter.id);assert.equal(w.player.body.form,'line');
        assert.equal(spar.profile(w.player).extension,18);saveFor(w).decode(saveFor(w).encode());
    });
};
