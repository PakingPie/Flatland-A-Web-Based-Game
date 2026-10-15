const FAMILY = Object.freeze({ adult:18, fertileUntil:60, birthCooldown:2, retirement:40, maxPopulation:256 });
class FamilySystem {
    constructor(world) {
        this.world = world; this.rng = new RNG(world.seed + ':families'); this.nextId = 1;
        this.births = []; this.history = []; this.playableIds = [world.player.id]; this.notebooks = {};
        for (const c of this.actors()) { c.actual.lineage.generation = 1; c.actual.genome.generation = 1; }
    }
    actors() { return [this.world.player, ...this.world.npcs]; }
    character(id) { return this.actors().find(c=>c.id===id); }
    get year() { return this.world.elapsed / C.DAY; }
    birthEligibility() {
        const a = this.world.player, b = this.world.romance.spouse(a);
        if (!b || !a.actual.life.alive || !b.actual.life.alive) return 'A living spouse and mutual commitment are required.';
        if (a.actual.identity.sex === b.actual.identity.sex) return 'Your marriage provides household support. Joint biological births require a male and female parent under the current inheritance rules.';
        if ([a,b].some(c=>c.actual.life.ageYears < FAMILY.adult || c.actual.life.ageYears > FAMILY.fertileUntil)) return 'Both biological parents must be aged 18–60.';
        const pair = this.world.romance.pair(a,b);
        if (pair.affection < ROMANCE.affectionToMarry || b.playerKnowledge.relationship.trust < ROMANCE.trustToMarry || this.world.romance.preferences(b).familyLife < .3) return 'Your spouse is not ready to consent to raising children.';
        if (this.year - pair.lastBirthYear < FAMILY.birthCooldown) return `Allow ${Math.ceil(FAMILY.birthCooldown - (this.year-pair.lastBirthYear))} more family year(s) between births.`;
        if (this.actors().length > FAMILY.maxPopulation - 4) return 'This dynasty has reached the current population budget.';
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
            w.npcs.push(c); mother.actual.lineage.childrenIds.push(id); father.actual.lineage.childrenIds.push(id); ids.push(id);
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
        for(const c of this.actors()) if(c.actual.life.alive) {
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
            for(const c of this.actors()) if(c.actual.life.alive) {
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
        this.notebooks[old.id]={knowledge:Object.fromEntries(this.actors().map(c=>[c.id,copyJSON(c.playerKnowledge)])),reputation:copyJSON(w.social.reputation)};
        if(old.actual.life.alive) this.history.push({kind:'retirement',ids:[old.id],at:w.elapsed});
        const ai={intent:'wander',activity:'idle',path:[],pathIndex:0,targetId:null,wait:1,think:1,stuck:0,homeX:old.x,homeY:old.y};
        if(!old.actual.profile) { populateSocialIdentity(w,old,0); old.actual.identity.name='Founder'; old.publicIdentity.displayName='Founder'; }
        old.isPlayer=false; old.ai=ai;
        old.body.color=old.body.form==='line'?'#d5b1b7':'#c9af93';
        next.isPlayer=true; next.ai=null; next.body.color='#f1a38b'; next.runtime.resting=false;
        w.npcs=w.npcs.filter(c=>c.id!==next.id); w.npcs.push(old); w.player=next; w.conversationId=null;
        const book=this.notebooks[next.id];
        for(const c of this.actors()) c.playerKnowledge=book?.knowledge[c.id] ? copyJSON(book.knowledge[c.id]) : {observed:{},discoveredFacts:{},rumors:[],relationship:emptyRelationship()};
        // Birth and marriage records are shared household knowledge; unrelated
        // friendships and private claims are specific to the new observer.
        for(const c of this.knownFamily()) if(c.id!==next.id) w.social.learn(c,'name',this.name(c),'confirmed','player');
        w.social.reputation=book ? copyJSON(book.reputation) : {score:0,events:[]};
        w.romance.syncBonds(); this.playableIds.push(next.id); this.history.push({kind:'succession',ids:[old.id,next.id],at:w.elapsed});
        return {ok:true,text:`${this.name(next)} now carries the playable lineage, Generation ${next.actual.lineage.generation}. The same world continues.`};
    }
    name(c) { return c.id==='founder-000' ? 'Founder' : c.playerKnowledge.discoveredFacts.name?.value || (this.births.some(b=>b.childIds.includes(c.id)) || this.world.romance.marriages.some(m=>m.ids.includes(c.id)) ? c.publicIdentity.displayName : 'Unknown citizen'); }
    knownFamily() {
        const founder=this.character(this.playableIds[0]), base=[founder,...this.descendants(founder)], ids=new Set(base.map(c=>c.id));
        for(const m of this.world.romance.marriages) if(m.ids.some(id=>ids.has(id))) m.ids.forEach(id=>ids.add(id));
        return this.actors().filter(c=>ids.has(c.id));
    }
    view() {
        const known=this.knownFamily(), knownIds=new Set(known.map(c=>c.id)), candidates=new Set(this.candidates().map(c=>c.id));
        return { generation:this.world.player.actual.lineage.generation, canSucceed:this.canSucceed(),
            spouse:this.world.romance.spouse(this.world.player) ? this.name(this.world.romance.spouse(this.world.player)) : 'None',
            birthReason:this.birthEligibility(), members:known.map(c=>({id:c.id,name:this.name(c),age:Math.floor(c.actual.life.ageYears),sex:c.actual.identity.sex,
                form:c.body.visibleType,alive:c.actual.life.alive,generation:c.actual.lineage.generation,current:c.isPlayer,eligible:candidates.has(c.id),
                parents:[c.actual.lineage.motherId,c.actual.lineage.fatherId].filter(id=>knownIds.has(id)).map(id=>this.name(this.character(id))),
                children:c.actual.lineage.childrenIds.filter(id=>knownIds.has(id)).map(id=>this.name(this.character(id))),
                siblings:known.filter(other=>other.id!==c.id && c.actual.lineage.motherId && other.actual.lineage.motherId===c.actual.lineage.motherId && other.actual.lineage.fatherId===c.actual.lineage.fatherId).map(other=>this.name(other)),
                traits:this.births.some(b=>b.childIds.includes(c.id)) ? `Observed in family life: ${c.body.radius>20?'large':'medium'} outline, ${c.actual.genome.mobility>1.03?'brisk':c.actual.genome.mobility<.97?'measured':'steady'} pace, ${c.actual.genome.metabolism>1.03?'hearty':c.actual.genome.metabolism<.97?'light':'moderate'} appetite. ${c.body.form==='line'?'Latent geometry remains undiscovered.':'Visible geometry: '+c.body.visibleType+'.'}` : 'Private hereditary ancestry remains undiscovered.',
                death:c.actual.life.alive ? '' : `${c.actual.life.deathCause || 'death'} · family year ${Math.floor((c.actual.life.deathAt||0)/C.DAY)}` })),
            marriages:this.world.romance.marriages.filter(m=>m.ids.every(id=>knownIds.has(id))).map(m=>({names:m.ids.map(id=>this.name(this.character(id))),at:Math.floor(m.at/C.DAY),end:m.endedAt===null?'ongoing':`${m.reason} in year ${Math.floor(m.endedAt/C.DAY)}`})),
            events:this.history.filter(e=>e.ids.every(id=>knownIds.has(id))).map(e=>({kind:e.kind,names:e.ids.map(id=>this.name(this.character(id))),year:Math.floor(e.at/C.DAY)})) };
    }
    exportState() { return copyJSON({rngState:this.rng.state,nextId:this.nextId,births:this.births,history:this.history,playableIds:this.playableIds,notebooks:this.notebooks}); }
    importState(data) {
        insist(plain(data) && integerIn(data.rngState,0,4294967295) && integerIn(data.nextId,1,100000) && Array.isArray(data.births) && data.births.length<=256 && Array.isArray(data.history) && data.history.length<=2000 && Array.isArray(data.playableIds) && data.playableIds.length<=256 && data.playableIds.length>0 && new Set(data.playableIds).size===data.playableIds.length && data.playableIds.every(id=>this.character(id)) && data.playableIds.at(-1)===this.world.player.id && plain(data.notebooks), 'Invalid dynasty state.');
        const childIds=new Set(), birthIds=new Set();
        for(const b of data.births) {
            insist(plain(b) && shortText(b.id,100) && !birthIds.has(b.id) && numberIn(b.at,0,this.world.elapsed+.001) && this.character(b.motherId)?.actual.identity.sex==='female' && this.character(b.fatherId)?.actual.identity.sex==='male' && Array.isArray(b.childIds) && b.childIds.length>=2 && b.childIds.length<=4, 'Invalid birth event.'); birthIds.add(b.id);
            for(const id of b.childIds) { const c=this.character(id); insist(c && !childIds.has(id) && c.actual.lineage.motherId===b.motherId && c.actual.lineage.fatherId===b.fatherId, 'Birth does not match genealogy.'); childIds.add(id); }
        }
        for(const c of this.actors()) {
            const l=c.actual.lineage, g=c.actual.genome;
            insist(plain(l) && integerIn(l.generation,1,1000) && Array.isArray(l.childrenIds) && l.childrenIds.length<=256 && new Set(l.childrenIds).size===l.childrenIds.length && l.motherId===g.motherId && l.fatherId===g.fatherId && l.generation===g.generation, 'Invalid genealogy.');
            const parents=[l.motherId,l.fatherId].filter(Boolean); insist(parents.length===0 || parents.length===2,'Incomplete biological parentage.');
            for(const id of parents) { const p=this.character(id); insist(p && p.actual.lineage.generation<l.generation && p.actual.lineage.childrenIds.includes(c.id), 'Broken parent link.'); }
            if(parents.length) insist(childIds.has(c.id) && l.generation===Math.max(...parents.map(id=>this.character(id).actual.lineage.generation))+1,'Missing birth or wrong generation.');
            for(const id of l.childrenIds) { const child=this.character(id); insist(child && [child.actual.lineage.motherId,child.actual.lineage.fatherId].includes(c.id),'Broken child link.'); }
        }
        insist(data.history.every(e=>plain(e) && ['birth','death','retirement','succession'].includes(e.kind) && Array.isArray(e.ids) && e.ids.length>0 && e.ids.every(id=>this.character(id)) && numberIn(e.at,0,this.world.elapsed+.001)), 'Invalid family history.');
        for(const [id,book] of Object.entries(data.notebooks)) {
            insist(this.character(id) && plain(book) && plain(book.knowledge) && plain(book.reputation), 'Invalid family notebook.');
            for(const [cid,k] of Object.entries(book.knowledge)) { insist(this.character(cid),'Unknown notebook subject.'); validateKnowledge(k,this.world.elapsed,this.world); }
            const current=this.world.social.exportState(); this.world.social.importState({version:1,rngState:current.rngState,reputation:book.reputation},4); this.world.social.importState(current,4);
        }
        this.rng.state=data.rngState; this.nextId=data.nextId; this.births=copyJSON(data.births); this.history=copyJSON(data.history); this.playableIds=copyJSON(data.playableIds); this.notebooks=copyJSON(data.notebooks);
        insist(this.actors().filter(c=>c.id.startsWith('descendant-')).every(c=>Number(c.id.slice(11))<this.nextId),'Invalid next descendant ID.');
    }
}
function restoreFamilyPopulation(w, records) {
    insist(Array.isArray(records) && records.length>=65 && records.length<=FAMILY.maxPopulation, 'Invalid saved population.');
    const ids=new Set();
    const actors=records.map((s,index)=> {
        const a=s.actual, pub=s.publicIdentity;
        insist(plain(s) && shortText(s.id,100) && /^(founder-000|citizen-\d{3}|descendant-[1-9]\d*)$/.test(s.id) && !ids.has(s.id), 'Invalid or duplicate character ID.'); ids.add(s.id);
        insist(plain(a) && plain(a.identity) && a.identity.id===s.id && ['male','female'].includes(a.identity.sex) && a.identity.bodyForm===(a.identity.sex==='female'?'line':'polygon') && shortText(a.identity.name,100), 'Invalid character identity.');
        validateGenome(a.genome);
        insist(plain(a.life) && numberIn(a.life.ageYears,0,200) && typeof a.life.alive==='boolean' && a.life.alive===(s.vitals?.health>0), 'Invalid age or life state.');
        if(a.life.deathAt!==undefined) insist(!a.life.alive && numberIn(a.life.deathAt,0,w.elapsed+.001) && shortText(a.life.deathCause,100), 'Invalid death record.');
        if(a.profile) {
            const p=a.profile;
            insist(plain(p) && shortText(p.occupation,100) && plain(p.personality) && ['warmth','candor','reserve','curiosity','prejudice'].every(k=>numberIn(p.personality[k],0,1)) && plain(p.preferences) && ['likes','dislikes'].every(k=>shortText(p.preferences[k],100)) && numberIn(p.disposition,-3,5) && plain(p.background), 'Invalid social profile.');
            insist(['origin','family','ambition','concern','sensitive'].every(k=>shortText(p.background[k],1000)) && ['knowsFamily','discloseSensitive'].every(k=>typeof p.background[k]==='boolean'), 'Invalid background.');
        } else insist(s.id==='founder-000','Citizen is missing a social profile.');
        insist(plain(pub) && (pub.displayName===null || shortText(pub.displayName,100)) && (pub.claimedOccupation===null || shortText(pub.claimedOccupation,100)) && numberIn(pub.reputation,-100,100) && Array.isArray(pub.claims) && pub.claims.length<=30 && plain(pub.standing) && integerIn(pub.standing.tier,0,7) && shortText(pub.standing.label,160), 'Invalid public identity.');
        const c=createCharacter(s.id,a.genome,a.identity.bodyForm,s.x,s.y,new RNG(s.id),index===0);
        c.actual=copyJSON(a); c.publicIdentity=copyJSON(pub);
        return c;
    });
    insist(ids.has('founder-000') && Array.from({length:64},(_,i)=>`citizen-${String(i+1).padStart(3,'0')}`).every(id=>ids.has(id)), 'Seeded citizens are missing.');
    w.player=actors[0]; w.npcs=actors.slice(1);
    records.forEach((s,i)=>restoreCharacter(actors[i],s,w));
}
