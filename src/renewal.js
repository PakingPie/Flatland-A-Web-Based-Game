// Private household policy. Dead characters remain complete registry records.
// Export is read-only: opening F8 or saving must never initialize hidden state.
class RenewalSystem {
    constructor(world) {
        this.world=world;this.enabled=false;this.activatedAt=null;
        this.processedYear=Math.floor(world.elapsed/C.DAY);
        this.matchingRng=new RNG(world.seed+':renewal:matching');
        this.birthRng=new RNG(world.seed+':renewal:births');
        this.pairs={};this.households={};this.backgroundBirthIds=[];this.knownEvents={};
    }
    anchorFor(ids,key) {
        const f=this.world.family,founder=f.character('founder-000');
        const dynasty=new Set([founder.id,...f.descendants(founder).map(c=>c.id)]);
        const members=ids.filter(id=>dynasty.has(id));
        insist(members.length<=1,'Ambiguous household anchor.');
        return members[0] || [...ids].sort()[hash(`${this.world.seed}:anchor:${key}`)%2];
    }
    cohortsFor(m) {
        return this.world.family.births.filter(b=>m.ids.includes(b.motherId) && m.ids.includes(b.fatherId) && b.at>=m.at && (m.endedAt===null || b.at<=m.endedAt)).length;
    }
    registerMarriage(m,origin='player') {
        this.households[m.id]={anchorId:this.anchorFor(m.ids,m.id),cohorts:this.cohortsFor(m),origin};
    }
    initializeLegacy() {
        this.processedYear=Math.floor(this.world.elapsed/C.DAY);
        for(const m of this.world.romance.marriages) this.registerMarriage(m,'legacy');
    }
    setEnabled(enabled) {
        insist(typeof enabled==='boolean','Invalid population policy.');
        if(this.enabled===enabled) return;
        this.enabled=enabled;this.processedYear=Math.floor(this.world.elapsed/C.DAY);
        if(enabled) this.activatedAt=this.world.elapsed;
    }
    mutual(a,b) {
        const r=this.world.romance;
        return a!==b && a.actual.life.alive && b.actual.life.alive && [a,b].every(c=>c.actual.life.ageYears>=18) && !r.isCloseKin(a,b)
            && r.compatibility(a,b,a.publicIdentity.reputation).ok && r.compatibility(b,a,b.publicIdentity.reputation).ok;
    }
    freshPair(a,b,year) {
        const ids=[a.id,b.id].sort();
        return {ids,trust:Object.fromEntries(ids.map(id=>[id,0])),affection:Object.fromEntries(ids.map(id=>[id,0])),startedYear:year,progressYear:year,closed:false};
    }
    validateChange(change) {
        const w=this.world,s=w.captureForValidation ? w.captureForValidation() : captureWorld(w);
        change(s);
        SaveCodec.decode(JSON.stringify({format:SaveFormat.name,version:5,worldVersion:1,savedAt:0,revision:0,payload:s,checksum:hash(JSON.stringify(s))}));
    }
    addPair(a,b,year,rngState=this.matchingRng.state) {
        const key=this.world.romance.key(a,b),p=this.freshPair(a,b,year);
        this.validateChange(s=>{s.renewal.pairs[key]=p;s.renewal.matchingRngState=rngState;});
        this.pairs[key]=p;this.matchingRng.state=rngState;
    }
    marry(p,year) {
        const w=this.world,r=w.romance,[a,b]=p.ids.map(id=>w.registry.get(id)),key=r.key(a,b);
        const m={id:`marriage-${r.marriages.length+1}`,ids:[...p.ids],at:w.elapsed,endedAt:null,reason:null};
        const pair={...(r.pairs[key] || {ids:[...p.ids],knownBy:[],lastAt:-999,day:-1,today:0,topics:{},lastOutcome:'',lastBirthYear:-999}),status:'married',affection:Math.min(...Object.values(p.affection))};
        const h={anchorId:this.anchorFor(m.ids,m.id),cohorts:0,origin:'npc'};
        const closeCompeting=pairs=>{for(const [other,q] of Object.entries(pairs)) if(other!==key && q.status==='courting' && q.ids.some(id=>p.ids.includes(id))) {q.status='declined';q.lastOutcome='I have chosen another commitment.';}};
        this.validateChange(s=>{
            s.romance.marriages.push(m);s.romance.pairs[key]=pair;s.renewal.households[m.id]=h;closeCompeting(s.romance.pairs);
            for(const c of s.characters.filter(c=>p.ids.includes(c.id))) {c.actual.bonds.partnerIds=[p.ids.find(id=>id!==c.id)];c.actual.bonds.marriageIds.push(m.id);}
        });
        r.marriages.push(m);r.pairs[key]=pair;this.households[m.id]=h;closeCompeting(r.pairs);r.syncBonds();
    }
    birthReason(m) {
        const w=this.world,r=w.romance,h=this.households[m.id],p=this.pairs[[...m.ids].sort().join('|')];
        const parents=m.ids.map(id=>w.registry.get(id));
        if(m.endedAt!==null || parents.some(c=>!c?.actual.life.alive || c.id===w.player.id || c.actual.life.ageYears<18 || c.actual.life.ageYears>60 || c.vitals.health<35)) return 'ineligible parents';
        if(parents[0].actual.identity.sex===parents[1].actual.identity.sex) return 'biological eligibility';
        if(!p || p.closed || !this.mutual(...parents) || parents.some(c=>!r.readinessFrom(r.preferences(c).familyLife,p.trust[c.id],p.affection[c.id]).ready)) return 'mutual readiness';
        if(h.cohorts>=2 || Math.floor(m.at/C.DAY)>=this.processedYear || w.family.year-r.pairs[r.key(...parents)].lastBirthYear<2) return 'household pacing';
        if(w.registry.living().length>92 || w.registry.all().length>244) return 'population capacity';
        return '';
    }
    evaluateYear(year,{demographic=false}={}) {
        insist(integerIn(year,0,Math.floor(this.world.elapsed/C.DAY)),'Invalid renewal year.');
        if(year<=this.processedYear) return;
        this.processedYear=year;
        if(!this.enabled || (!demographic && !this.world.player.actual.life.alive)) return;
        const w=this.world,r=w.romance;
        this.lastFailure='';
        // Married former observers start a private background relationship, never
        // borrowing the currently playable observer's notebook or reputation.
        for(const m of r.marriages.filter(m=>m.endedAt===null && !m.ids.includes(w.player.id))) {
            const [a,b]=m.ids.map(id=>w.registry.get(id)),key=r.key(a,b);
            if((!this.pairs[key] || this.pairs[key].closed) && this.mutual(a,b)) {try {this.addPair(a,b,year);}catch(e){this.lastFailure=e.message;}}
        }
        let married=0;
        for(const key of Object.keys(this.pairs).sort()) {
            const p=this.pairs[key],[a,b]=p.ids.map(id=>w.registry.get(id));
            if(p.closed || p.ids.includes(w.player.id)) continue;
            if(!this.mutual(a,b) || [a,b].some(c=>r.spouse(c) && !p.ids.includes(r.spouse(c).id))) {p.closed=true;continue;}
            if(p.progressYear<year) {
                for(const id of p.ids) {p.trust[id]=Math.min(100,p.trust[id]+10);p.affection[id]=Math.min(100,p.affection[id]+12);}
                p.progressYear=year;
            }
            if(r.spouse(a)) continue;
            if(!married && p.ids.every(id=>p.trust[id]>=18 && p.affection[id]>=42)) {
                try {this.marry(p,year);married++;}catch(e){this.lastFailure=e.message;}
            }
        }
        // Births draw only from their own stream, after pure eligibility/capacity
        // checks. The first eligible stable household gets this year's cohort.
        for(const m of [...r.marriages].sort((a,b)=>a.id.localeCompare(b.id))) {
            const reason=this.birthReason(m);
            if(reason) {if(reason==='population capacity') this.lastFailure=reason;continue;}
            try {
                const plan=w.family.planCohort(...m.ids,this.households[m.id].anchorId,this.birthRng.state);
                w.family.preflightCohort(plan,true);w.family.commitCohort(plan,this.birthRng,false);break;
            } catch(e) {this.lastFailure=e.message;}
        }
        if(w.registry.living().length>92 || w.registry.all().length>244 || Object.keys(this.pairs).length>=1000) return;
        const busy=new Set(Object.values(this.pairs).filter(p=>!p.closed).flatMap(p=>p.ids));
        const available=w.npcs.filter(c=>c.actual.life.ageYears>=18 && c.vitals.health>=35 && !r.spouse(c) && !busy.has(c.id)).sort((a,b)=>a.id.localeCompare(b.id));
        const candidates=[];
        for(let i=0;i<available.length;i++) for(let j=i+1;j<available.length;j++) if(this.mutual(available[i],available[j]) && !this.pairs[r.key(available[i],available[j])]) candidates.push([available[i],available[j]]);
        if(candidates.length) {
            const rng=new RNG(this.matchingRng.state),[a,b]=rng.pick(candidates);
            try {this.addPair(a,b,year,rng.state);}catch(e){this.lastFailure=e.message;}
        }
    }
    knowsBirth(id,observer=this.world.player.id) {return !this.backgroundBirthIds.includes(id) || !!this.knownEvents[observer]?.birthIds.includes(id);}
    knowsMarriage(id,observer=this.world.player.id) {return this.households[id]?.origin!=='npc' || !!this.knownEvents[observer]?.marriageIds.includes(id);}
    learnEvents(subject,observer=this.world.player.id,includeOrigin=false) {
        const w=this.world,book=this.knownEvents[observer] ||= {birthIds:[],marriageIds:[]};
        for(const b of w.family.births.filter(b=>[b.motherId,b.fatherId,...(includeOrigin?b.childIds:[])].includes(subject.id))) if(!book.birthIds.includes(b.id)) book.birthIds.push(b.id);
        for(const m of w.romance.marriages.filter(m=>m.ids.includes(subject.id))) if(!book.marriageIds.includes(m.id)) book.marriageIds.push(m.id);
    }
    onControl(next) {
        const w=this.world,spouse=w.romance.spouse(next),p=spouse && this.pairs[w.romance.key(next,spouse)];
        this.learnEvents(next,next.id,true);
        if(p) {
            const rel=spouse.playerKnowledge.relationship;
            rel.trust=p.trust[spouse.id];rel.familiarity=Math.max(rel.familiarity,50);
            w.romance.pair(next,spouse).affection=p.affection[spouse.id];
        }
    }
    beforeControl(old) {
        const w=this.world,spouse=w.romance.spouse(old),p=spouse && this.pairs[w.romance.key(old,spouse)];
        if(p && old.actual.life.alive) {
            const trust=spouse.playerKnowledge.relationship.trust,affection=w.romance.pair(old,spouse).affection;
            for(const id of p.ids) {p.trust[id]=trust;p.affection[id]=affection;}
        }
    }
    onDeath(c) {for(const p of Object.values(this.pairs)) if(p.ids.includes(c.id)) p.closed=true;}
    exportState() {
        return copyJSON({version:1,enabled:this.enabled,activatedAt:this.activatedAt,processedYear:this.processedYear,
            matchingRngState:this.matchingRng.state,birthRngState:this.birthRng.state,pairs:this.pairs,
            households:this.households,backgroundBirthIds:this.backgroundBirthIds,knownEvents:this.knownEvents});
    }
    importState(s) {
        const w=this.world,year=Math.floor(w.elapsed/C.DAY),exists=id=>!!w.registry.get(id);
        insist(plain(s) && s.version===1 && typeof s.enabled==='boolean' && (s.activatedAt===null || numberIn(s.activatedAt,0,w.elapsed+.001)) && (!s.enabled || s.activatedAt!==null) && integerIn(s.processedYear,0,year),'Invalid renewal policy or cursor.');
        insist(integerIn(s.matchingRngState,0,4294967295) && integerIn(s.birthRngState,0,4294967295) && plain(s.pairs) && Object.keys(s.pairs).length<=1000 && plain(s.households) && plain(s.knownEvents),'Invalid renewal state.');
        const marriages=w.romance.marriages,births=w.family.births;
        insist(Object.keys(s.households).length===marriages.length,'Missing household state.');
        for(const [id,h] of Object.entries(s.households)) {
            const m=marriages.find(m=>m.id===id);
            insist(m && plain(h) && h.anchorId===this.anchorFor(m.ids,id) && integerIn(h.cohorts,0,256) && h.cohorts===this.cohortsFor(m) && ['legacy','player','npc'].includes(h.origin),'Invalid household anchor or cohort count.');
        }
        const occupied=new Set();
        for(const [key,p] of Object.entries(s.pairs)) {
            insist(plain(p) && Array.isArray(p.ids) && p.ids.length===2 && p.ids[0]!==p.ids[1] && p.ids.every(exists) && key===[...p.ids].sort().join('|') && plain(p.trust) && plain(p.affection) && p.ids.every(id=>numberIn(p.trust[id],-30,100) && numberIn(p.affection[id],0,100)) && Object.keys(p.trust).length===2 && Object.keys(p.affection).length===2 && integerIn(p.startedYear,0,year) && integerIn(p.progressYear,p.startedYear,year) && typeof p.closed==='boolean','Invalid NPC relationship.');
            if(!p.closed) for(const id of p.ids) {
                insist(!occupied.has(id) && w.registry.get(id).actual.life.alive && w.registry.get(id).actual.life.ageYears>=18,'Conflicting NPC relationship.');occupied.add(id);
            }
        }
        const ids=(list,records)=>Array.isArray(list) && new Set(list).size===list.length && list.every(id=>records.some(r=>r.id===id));
        insist(ids(s.backgroundBirthIds,births),'Invalid background birth provenance.');
        for(const [id,k] of Object.entries(s.knownEvents)) insist(exists(id) && plain(k) && ids(k.birthIds,births) && ids(k.marriageIds,marriages),'Invalid household discovery.');
        this.enabled=s.enabled;this.activatedAt=s.activatedAt;this.processedYear=s.processedYear;
        this.matchingRng.state=s.matchingRngState;this.birthRng.state=s.birthRngState;
        this.pairs=copyJSON(s.pairs);this.households=copyJSON(s.households);
        this.backgroundBirthIds=[...s.backgroundBirthIds];this.knownEvents=copyJSON(s.knownEvents);
    }
}
