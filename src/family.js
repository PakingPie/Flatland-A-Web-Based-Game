const FAMILY = Object.freeze({ adult:18, fertileUntil:60, birthCooldown:2, retirement:40, maxPopulation:256 });
class FamilySystem {
    constructor(world) {
        this.world = world; this.rng = new RNG(world.seed + ':families'); this.nextId = 1;
        this.births = []; this.history = []; this.playableIds = [world.player.id]; this.notebooks = {};
        for (const c of this.records()) { c.actual.lineage.generation = 1; c.actual.genome.generation = 1; }
    }
    records() { return this.world.registry.all(); }
    character(id) { return this.world.registry.get(id); }
    get year() { return this.world.elapsed / C.DAY; }
    birthEligibility() {
        const a = this.world.player, b = this.world.romance.spouse(a);
        if (!b || !a.actual.life.alive || !b.actual.life.alive) return 'A living spouse and mutual commitment are required.';
        if (a.actual.identity.sex === b.actual.identity.sex) return 'Your marriage provides household support. Joint biological births require a male and female parent under the current inheritance rules.';
        if ([a,b].some(c=>c.actual.life.ageYears < FAMILY.adult || c.actual.life.ageYears > FAMILY.fertileUntil)) return 'Both biological parents must be aged 18–60.';
        const pair = this.world.romance.pair(a,b);
        if (pair.affection < ROMANCE.affectionToMarry || b.playerKnowledge.relationship.trust < ROMANCE.trustToMarry || this.world.romance.preferences(b).familyLife < .3) return 'Your spouse is not ready to consent to raising children.';
        if (this.year - pair.lastBirthYear < FAMILY.birthCooldown) return `Allow ${Math.ceil(FAMILY.birthCooldown - (this.year-pair.lastBirthYear))} more family year(s) between births.`;
        if (this.records().length > FAMILY.maxPopulation - 4) return 'This dynasty has reached the current population budget.';
        if (a.vitals.health < 35 || a.vitals.hunger < 30 || a.vitals.thirst < 30) return 'Recover your health and supplies before expanding the household.';
        return '';
    }
    birth() {
        const reason = this.birthEligibility(); if (reason) return {ok:false,text:reason};
        const w=this.world, a=w.player, b=w.romance.spouse(a), mother=a.actual.identity.sex==='female'?a:b, father=a.actual.identity.sex==='male'?a:b;
        const count=birthCohortSize(this.rng), ids=[], generation=Math.max(a.actual.lineage.generation,b.actual.lineage.generation)+1;
        for(let i=0;i<count;i++) {
            const id=`descendant-${this.nextId++}`, sex=this.rng.next()<.5?'female':'male';
            const genome=inheritGenome(a.actual.genome,father.actual.genome,mother.actual.genome,this.rng,{motherId:mother.id,fatherId:father.id},generation);
            const spot=w.nav.free.map(index=>w.nav.point(index)).filter(p=>w.circleClear(p.x,p.y,24)).sort((p,q)=>dist2(p.x,p.y,a.x,a.y)-dist2(q.x,q.y,a.x,a.y))[i] || w.refuges[0];
            const c=createCharacter(id,genome,sex==='female'?'line':'polygon',spot.x,spot.y,this.rng);
            populateSocialIdentity(w,c,64+this.nextId);
            c.actual.identity.name=`${sex==='female'?'Lina':'Ari'} ${id.slice(11)}`; c.publicIdentity.displayName=c.actual.identity.name;
            c.actual.life={ageYears:0,alive:true}; c.actual.lineage={generation,motherId:mother.id,fatherId:father.id,childrenIds:[],ancestryKnownToSelf:false};
            c.playerKnowledge.relationship=emptyRelationship(); w.social.learn(c,'name',c.actual.identity.name,'confirmed','player');
            w.registry.add(c); mother.actual.lineage.childrenIds.push(id); father.actual.lineage.childrenIds.push(id); ids.push(id);
        }
        this.world.romance.pair(a,b).lastBirthYear=this.year;
        const record={id:`birth-${this.births.length+1}`,motherId:mother.id,fatherId:father.id,childIds:ids,at:w.elapsed};
        this.births.push(record); this.history.push({kind:'birth',ids:[mother.id,father.id,...ids],at:w.elapsed});
        return {ok:true,text:`You both choose family life. ${count} children are born; each has an individual inherited genome. Open Family to meet them.`,ids};
    }
    deathAge(c) { return 78 + hash(`${this.world.seed}:lifespan:${c.id}`) % 15; }
    markDeath(c, cause='old age') {
        if (c.actual.life.deathAt !== undefined) return;
        c.actual.life.alive=false; c.actual.life.deathAt=this.world.elapsed; c.actual.life.deathCause=cause;
        c.vitals.health=0; c.runtime.moving=c.runtime.sprinting=c.runtime.resting=false;
        if(c.ai) { c.ai.path=[]; c.ai.pathIndex=0; c.ai.targetId=null; c.ai.activity='idle'; }
        this.history.push({kind:'death',ids:[c.id],at:this.world.elapsed});
        for(const m of this.world.romance.marriages.filter(m=>m.endedAt===null && m.ids.includes(c.id))) this.world.romance.endMarriage(m,'death');
    }
    age(years) {
        for(const c of this.world.registry.living()) {
            c.actual.life.ageYears+=years;
            if(c.actual.life.ageYears>=this.deathAge(c)) this.markDeath(c);
        }
    }
    advance(years) {
        const w=this.world, p=w.player;
        if(![1,5].includes(years) || !p.actual.life.alive || !w.refugeAt(p.x,p.y) || p.vitals.health<35 || p.vitals.hunger<30 || p.vitals.thirst<30)
            return {ok:false,text:'Time advance requires a living, supplied character at a refuge (health 35+, food and water 30+).'};
        let passed=0;
        for(;passed<years && p.actual.life.alive;passed++) {
            w.elapsed+=C.DAY; w.updateResources(C.DAY); this.age(1);
            // Community subsistence covers the abstract interval. Pack contents
            // are preserved; no ordinary survival frames or AI paths are replayed.
            for(const c of w.registry.living()) {
                c.vitals.hunger=Math.max(55,c.vitals.hunger); c.vitals.thirst=Math.max(55,c.vitals.thirst); c.vitals.stamina=100;
            }
        }
        return {ok:true,text:`${passed} family year(s) pass at the refuge. Community subsistence covers the interval; your pack is unchanged. Check family history for births, adulthood and deaths.`};
    }
    descendants(c=this.world.player) {
        const result=[], pending=[...c.actual.lineage.childrenIds], seen=new Set();
        while(pending.length) { const id=pending.shift(); if(seen.has(id)) continue; seen.add(id); const child=this.character(id); if(child) { result.push(child); pending.push(...child.actual.lineage.childrenIds); } }
        return result;
    }
    candidates() { return this.descendants().filter(c=>c.actual.life.alive && c.actual.life.ageYears>=FAMILY.adult); }
    canSucceed() { return !this.world.player.actual.life.alive || this.world.player.actual.life.ageYears>=FAMILY.retirement; }
    succeed(id) {
        const w=this.world, old=w.player, next=this.candidates().find(c=>c.id===id);
        if(!next || !this.canSucceed()) return {ok:false,text:'Choose a living adult descendant after age 40 retirement or upon death.'};
        this.notebooks[old.id]=captureObserverNotebook(w);
        if(old.actual.life.alive) this.history.push({kind:'retirement',ids:[old.id],at:w.elapsed});
        const ai={intent:'wander',activity:'idle',path:[],pathIndex:0,targetId:null,wait:1,think:1,stuck:0,homeX:old.x,homeY:old.y};
        if(!old.actual.profile) { populateSocialIdentity(w,old,0); old.actual.identity.name='Founder'; old.publicIdentity.displayName='Founder'; }
        old.isPlayer=false; old.ai=ai;
        old.body=createCharacter(old.id,old.actual.genome,old.actual.identity.bodyForm,old.x,old.y,new RNG(old.id)).body;
        next.isPlayer=true; next.ai=null; next.body.color='#f1a38b'; next.runtime.resting=false;
        w.registry.select(next.id); w.conversationId=null;
        restoreObserverNotebook(w,this.notebooks[next.id]);
        // Birth and marriage records are shared household knowledge; unrelated
        // friendships and private claims are specific to the new observer.
        for(const c of this.knownFamily()) if(c.id!==next.id) w.social.learn(c,'name',this.name(c),'confirmed','player');
        w.romance.syncBonds(); this.playableIds.push(next.id); this.history.push({kind:'succession',ids:[old.id,next.id],at:w.elapsed});
        return {ok:true,text:`${this.name(next)} now carries the playable lineage, Generation ${next.actual.lineage.generation}. The same world continues.`};
    }
    name(c) { return c.id==='founder-000' ? 'Founder' : c.playerKnowledge.discoveredFacts.name?.value || (this.births.some(b=>b.childIds.includes(c.id)) || this.world.romance.marriages.some(m=>m.ids.includes(c.id)) ? c.publicIdentity.displayName : 'Unknown citizen'); }
    knownFamily() {
        const founder=this.character(this.playableIds[0]), base=[founder,...this.descendants(founder)], ids=new Set(base.map(c=>c.id));
        for(const m of this.world.romance.marriages) if(m.ids.some(id=>ids.has(id))) m.ids.forEach(id=>ids.add(id));
        return this.records().filter(c=>ids.has(c.id));
    }
    view() { return familyView(this); }
    exportState() { return copyJSON({rngState:this.rng.state,nextId:this.nextId,births:this.births,history:this.history,playableIds:this.playableIds,notebooks:this.notebooks}); }
    importState(data) {
        insist(plain(data) && integerIn(data.rngState,0,4294967295) && integerIn(data.nextId,1,100000) && Array.isArray(data.births) && data.births.length<=256 && Array.isArray(data.history) && data.history.length<=2000 && Array.isArray(data.playableIds) && data.playableIds.length<=256 && data.playableIds.length>0 && new Set(data.playableIds).size===data.playableIds.length && data.playableIds.every(id=>this.character(id)) && data.playableIds.at(-1)===this.world.player.id && plain(data.notebooks), 'Invalid dynasty state.');
        const childIds=new Set(), birthIds=new Set();
        for(const b of data.births) {
            insist(plain(b) && shortText(b.id,100) && !birthIds.has(b.id) && numberIn(b.at,0,this.world.elapsed+.001) && this.character(b.motherId)?.actual.identity.sex==='female' && this.character(b.fatherId)?.actual.identity.sex==='male' && Array.isArray(b.childIds) && b.childIds.length>=2 && b.childIds.length<=4, 'Invalid birth event.'); birthIds.add(b.id);
            for(const id of b.childIds) { const c=this.character(id); insist(c && !childIds.has(id) && c.actual.lineage.motherId===b.motherId && c.actual.lineage.fatherId===b.fatherId, 'Birth does not match genealogy.'); childIds.add(id); }
        }
        validateGenerationDAG(this.world.registry,childIds);
        insist(data.playableIds[0]==='founder-000', 'Dynasty founder is invalid.');
        for(let i=1;i<data.playableIds.length;i++) insist(this.descendants(this.character(data.playableIds[i-1])).some(c=>c.id===data.playableIds[i]), 'Playable succession does not follow biological descendants.');
        insist(data.history.every(e=>plain(e) && ['birth','death','retirement','succession'].includes(e.kind) && Array.isArray(e.ids) && e.ids.length>0 && e.ids.every(id=>this.character(id)) && numberIn(e.at,0,this.world.elapsed+.001)), 'Invalid family history.');
        for(const [id,book] of Object.entries(data.notebooks)) {
            insist(this.character(id) && plain(book) && plain(book.knowledge) && plain(book.reputation), 'Invalid family notebook.');
            for(const [cid,k] of Object.entries(book.knowledge)) { insist(this.character(cid),'Unknown notebook subject.'); validateKnowledge(k,this.world.elapsed,this.world); }
            const current=this.world.social.exportState(); this.world.social.importState({version:1,rngState:current.rngState,reputation:book.reputation},4); this.world.social.importState(current,4);
        }
        this.rng.state=data.rngState; this.nextId=data.nextId; this.births=copyJSON(data.births); this.history=copyJSON(data.history); this.playableIds=copyJSON(data.playableIds); this.notebooks=copyJSON(data.notebooks);
        insist(this.records().filter(c=>c.id.startsWith('descendant-')).every(c=>Number(c.id.slice(11))<this.nextId),'Invalid next descendant ID.');
    }
}
