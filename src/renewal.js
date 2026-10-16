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
        for(const [key,p] of Object.entries(s.pairs)) {
            insist(plain(p) && Array.isArray(p.ids) && p.ids.length===2 && p.ids[0]!==p.ids[1] && p.ids.every(exists) && key===[...p.ids].sort().join('|') && plain(p.trust) && plain(p.affection) && p.ids.every(id=>numberIn(p.trust[id],-30,100) && numberIn(p.affection[id],0,100)) && Object.keys(p.trust).length===2 && Object.keys(p.affection).length===2 && integerIn(p.startedYear,0,year) && integerIn(p.progressYear,p.startedYear,year) && typeof p.closed==='boolean','Invalid NPC relationship.');
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
