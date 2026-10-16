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
        const readiness=this.world.romance.parenthoodReadiness(a,b);
        if(!readiness.ready) return readiness.reason;
        if (this.year - pair.lastBirthYear < FAMILY.birthCooldown) return `Allow ${Math.ceil(FAMILY.birthCooldown - (this.year-pair.lastBirthYear))} more family year(s) between births.`;
        if (this.records().length > FAMILY.maxPopulation - 4) return 'This dynasty has reached the current population budget.';
        if (a.vitals.health < 35 || a.vitals.hunger < 30 || a.vitals.thirst < 30) return 'Recover your health and supplies before expanding the household.';
        return '';
    }
    birth() {
        const reason = this.birthEligibility(); if (reason) return {ok:false,text:reason};
        const w=this.world,a=w.player,b=w.romance.spouse(a);
        try {
            const marriage=w.romance.marriages.find(m=>m.endedAt===null && m.ids.includes(a.id) && m.ids.includes(b.id));
            const anchor=w.renewal?.households[marriage?.id]?.anchorId || a.id;
            const plan=this.planCohort(a.id,b.id,anchor,this.rng.state);
            this.preflightCohort(plan,false);
            return this.commitCohort(plan,this.rng,true);
        } catch(error) { return {ok:false,text:`This household cannot add a cohort: ${error.message}`}; }
    }
    // Detached planning preserves IDs/RNG and observer state until the entire
    // cohort is accepted. Explicit parents never require swapping world.player.
    planCohort(aId,bId,anchorId,rngState) {
        const w=this.world,a=this.character(aId),b=this.character(bId),anchor=this.character(anchorId);
        insist(a && b && a!==b && [a,b].includes(anchor) && a.actual.life.alive && b.actual.life.alive && a.actual.identity.sex!==b.actual.identity.sex,'Invalid cohort parents.');
        const mother=a.actual.identity.sex==='female'?a:b,father=a.actual.identity.sex==='male'?a:b;
        const rng=new RNG(rngState),count=birthCohortSize(rng),ids=[],children=[],generation=Math.max(a.actual.lineage.generation,b.actual.lineage.generation)+1;
        let nextId=this.nextId;
        for(let i=0;i<count;i++) {
            const id=`descendant-${nextId++}`, sex=rng.next()<.5?'female':'male';
            insist(!this.character(id),'Duplicate child ID.');
            const genome=inheritGenome(anchor.actual.genome,father.actual.genome,mother.actual.genome,rng,{motherId:mother.id,fatherId:father.id},generation);
            const spot=w.nav.free.map(index=>w.nav.point(index)).filter(p=>w.circleClear(p.x,p.y,24)).sort((p,q)=>dist2(p.x,p.y,a.x,a.y)-dist2(q.x,q.y,a.x,a.y))[i] || w.refuges[0];
            const c=createCharacter(id,genome,sex==='female'?'line':'polygon',spot.x,spot.y,rng);
            populateSocialIdentity(w,c,64+nextId);
            c.actual.identity.name=`${sex==='female'?'Lina':'Ari'} ${id.slice(11)}`; c.publicIdentity.displayName=c.actual.identity.name;
            c.actual.life={ageYears:0,alive:true}; c.actual.lineage={generation,motherId:mother.id,fatherId:father.id,childrenIds:[],ancestryKnownToSelf:false};
            c.playerKnowledge.relationship=emptyRelationship();
            children.push(c);ids.push(id);
        }
        const record={id:`birth-${this.births.length+1}`,motherId:mother.id,fatherId:father.id,childIds:ids,at:w.elapsed};
        return {aId,bId,anchorId,children,ids,nextId,rngState:rng.state,record};
    }
    commitCohort(plan,rng,known) {
        const w=this.world,{children,ids,record}=plan,a=this.character(plan.aId),b=this.character(plan.bId);
        for(const c of children) {
            if(known) w.social.learn(c,'name',c.actual.identity.name,'confirmed','player');
            w.registry.add(c);a.actual.lineage.childrenIds.push(c.id);b.actual.lineage.childrenIds.push(c.id);
        }
        this.nextId=plan.nextId;rng.state=plan.rngState;
        w.romance.pair(a,b).lastBirthYear=this.year;
        this.births.push(record); this.history.push({kind:'birth',ids:[record.motherId,record.fatherId,...ids],at:w.elapsed});
        const marriage=w.romance.marriages.find(m=>m.endedAt===null && m.ids.includes(a.id) && m.ids.includes(b.id));
        if(marriage && w.renewal?.households[marriage.id]) w.renewal.households[marriage.id].cohorts++;
        if(!known) w.renewal.backgroundBirthIds.push(record.id);
        return {ok:true,text:`You both choose family life. ${ids.length} children are born; each has an individual inherited genome. Open Family to meet them.`,ids};
    }
    preflightCohort(plan,background) {
        const w=this.world,s=w.captureForValidation ? w.captureForValidation() : captureWorld(w);
        for(const c of plan.children) {
            if(!background) c.playerKnowledge.discoveredFacts.name={value:c.actual.identity.name,kind:'confirmed',sourceId:'player',at:w.elapsed};
            s.characters.push(captureCharacter(c));
        }
        for(const id of [plan.aId,plan.bId]) s.characters.find(c=>c.id===id).actual.lineage.childrenIds.push(...plan.ids);
        s.family.nextId=plan.nextId;
        if(background) {s.renewal.birthRngState=plan.rngState;s.renewal.backgroundBirthIds.push(plan.record.id);}
        else s.family.rngState=plan.rngState;
        s.family.births.push(plan.record);s.family.history.push({kind:'birth',ids:[plan.record.motherId,plan.record.fatherId,...plan.ids],at:w.elapsed});
        const key=w.romance.key(this.character(plan.aId),this.character(plan.bId));
        s.romance.pairs[key].lastBirthYear=this.year;
        const m=s.romance.marriages.find(m=>m.endedAt===null && m.ids.includes(plan.aId) && m.ids.includes(plan.bId));
        if(m) s.renewal.households[m.id].cohorts++;
        SaveCodec.decode(JSON.stringify({format:SaveFormat.name,version:5,worldVersion:1,savedAt:0,revision:0,payload:s,checksum:hash(JSON.stringify(s))}));
    }
    deathAge(c) { return 78 + hash(`${this.world.seed}:lifespan:${c.id}`) % 15; }
    markDeath(c, cause='old age') {
        if (c.actual.life.deathAt !== undefined) return;
        c.actual.life.alive=false; c.actual.life.deathAt=this.world.elapsed; c.actual.life.deathCause=cause;
        c.vitals.health=0; c.runtime.moving=c.runtime.sprinting=c.runtime.resting=false;
        if(c.ai) { c.ai.path=[]; c.ai.pathIndex=0; c.ai.targetId=null; c.ai.activity='idle'; }
        this.history.push({kind:'death',ids:[c.id],at:this.world.elapsed});
        this.world.renewal?.onDeath(c);
        if(c===this.world.player) {this.pendingYear=null;this.world.renewal.processedYear=Math.floor(this.world.elapsed/C.DAY);}
        for(const m of this.world.romance.marriages.filter(m=>m.endedAt===null && m.ids.includes(c.id))) this.world.romance.endMarriage(m,'death');
    }
    age(years) {
        for(const c of this.world.registry.living()) {
            c.actual.life.ageYears+=years;
            const integerAge=Math.round(c.actual.life.ageYears);
            if(Math.abs(c.actual.life.ageYears-integerAge)<1e-9) c.actual.life.ageYears=integerAge;
            if(c.actual.life.ageYears>=this.deathAge(c)-1e-9) {c.actual.life.ageYears=Math.max(c.actual.life.ageYears,this.deathAge(c));this.markDeath(c);}
        }
    }
    elapse(seconds,{deferRenewal=false}={}) {
        const w=this.world,start=w.elapsed;let left=seconds;
        insist(numberIn(seconds,0,1e7),'Invalid time interval.');
        while(left>1e-8 && w.player.actual.life.alive) {
            const boundary=(Math.floor((w.elapsed+1e-8)/C.DAY)+1)*C.DAY;
            const untilDeath=Math.max(0,Math.min(...w.registry.living().map(c=>(this.deathAge(c)-c.actual.life.ageYears)*C.DAY)));
            const step=Math.min(left,boundary-w.elapsed,untilDeath);
            if(step<1e-8) {this.age(0);if(!w.player.actual.life.alive) break;continue;}
            w.elapsed+=step;if(Math.abs(w.elapsed-boundary)<1e-7) w.elapsed=boundary;
            w.updateResources(step);this.age(step/C.DAY);left-=step;
            if(!w.player.actual.life.alive) {w.renewal.processedYear=Math.floor(w.elapsed/C.DAY);break;}
            if(w.elapsed===boundary) {
                const year=Math.floor(boundary/C.DAY);
                if(deferRenewal) this.pendingYear=year;
                else w.renewal.evaluateYear(year);
            }
        }
        return w.elapsed-start;
    }
    flushRenewal() {
        const year=this.pendingYear;this.pendingYear=null;
        if(year!==undefined && year!==null && this.world.player.actual.life.alive) this.world.renewal.evaluateYear(year);
    }
    advance(years) {
        const w=this.world, p=w.player;
        if(![1,5].includes(years) || !p.actual.life.alive || !w.refugeAt(p.x,p.y) || p.vitals.health<35 || p.vitals.hunger<30 || p.vitals.thirst<30)
            return {ok:false,text:'Time advance requires a living, supplied character at a refuge (health 35+, food and water 30+).'};
        let passed=0;
        for(;passed<years && p.actual.life.alive;passed++) {
            this.elapse(C.DAY);
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
        w.renewal.beforeControl(old);
        this.notebooks[old.id]=captureObserverNotebook(w);
        if(old.actual.life.alive) this.history.push({kind:'retirement',ids:[old.id],at:w.elapsed});
        const ai={intent:'wander',activity:'idle',path:[],pathIndex:0,targetId:null,wait:1,think:1,stuck:0,homeX:old.x,homeY:old.y};
        if(!old.actual.profile) { populateSocialIdentity(w,old,0); old.actual.identity.name='Founder'; old.publicIdentity.displayName='Founder'; }
        old.isPlayer=false; old.ai=ai;
        old.body=createCharacter(old.id,old.actual.genome,old.actual.identity.bodyForm,old.x,old.y,new RNG(old.id)).body;
        next.isPlayer=true; next.ai=null; next.body.color='#f1a38b'; next.runtime.resting=false;
        w.registry.select(next.id); w.conversationId=null;
        restoreObserverNotebook(w,this.notebooks[next.id]);
        w.renewal.onControl(next);
        // Birth and marriage records are shared household knowledge; unrelated
        // friendships and private claims are specific to the new observer.
        for(const c of this.knownFamily()) if(c.id!==next.id) w.social.learn(c,'name',this.name(c),'confirmed','player');
        w.romance.syncBonds(); this.playableIds.push(next.id); this.history.push({kind:'succession',ids:[old.id,next.id],at:w.elapsed});
        return {ok:true,text:`${this.name(next)} now carries the playable lineage, Generation ${next.actual.lineage.generation}. The same world continues.`};
    }
    name(c) { return c.id==='founder-000' ? 'Founder' : c.playerKnowledge.discoveredFacts.name?.value || (this.births.some(b=>b.childIds.includes(c.id) && this.world.renewal.knowsBirth(b.id)) || this.world.romance.marriages.some(m=>m.ids.includes(c.id) && this.world.renewal.knowsMarriage(m.id)) ? c.publicIdentity.displayName : 'Unknown citizen'); }
    knownFamily() {
        const ids=new Set([...this.playableIds,this.world.player.id]);let changed=true;
        const events=[...this.births.filter(b=>this.world.renewal.knowsBirth(b.id)).map(b=>[b.motherId,b.fatherId,...b.childIds]),...this.world.romance.marriages.filter(m=>this.world.renewal.knowsMarriage(m.id)).map(m=>m.ids)];
        while(changed) {changed=false;for(const members of events) if(members.some(id=>ids.has(id))) for(const id of members) if(!ids.has(id)) {ids.add(id);changed=true;}}
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
