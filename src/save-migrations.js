// Explicit released-schema readers. They hydrate current in-memory defaults;
// they never rewrite input, browser slots, or the original version/checksum.
function restoreLegacyPopulation(w, s) {
    const chars=w.registry.all();
    insist(Array.isArray(s.characters) && s.characters.length===chars.length, 'Saved population does not match.');
    s.characters.forEach((c,i)=>restoreCharacter(chars[i],c,w,true));
}
function migrateSavePopulation(w, s, version) {
    switch(version) {
        case 1: // Survival-only: seeded identity signatures, no discoveries.
        case 2: // Society: same generator and seeded population as v1.
        case 3: // Marriage: same seeded population, with persistent pairs.
            restoreLegacyPopulation(w,s); break;
        case 4: // Dynamic individuals, full genomes, and playable observer ID.
            restoreFamilyPopulation(w,s.characters,s.currentPlayerId ?? s.family?.playableIds?.at(-1)); break;
        default: throw new Error('No population migration for save version.');
    }
}
function migrateSaveSystems(w, s, version) {
    switch(version) {
        case 1:
            w.social.importState(s.social,1); break;
        case 2:
            w.social.importState(s.social,2); break;
        case 3:
            w.social.importState(s.social,3); w.romance.importState(s.romance); break;
        case 4:
            w.social.importState(s.social,4); w.family.importState(s.family); w.romance.importState(s.romance,true); break;
        default: throw new Error('No system migration for save version.');
    }
}
function restoreFamilyPopulation(w, records, currentId) {
    const baseIds=w.registry.all().map(c=>c.id);
    insist(Array.isArray(records) && records.length>=baseIds.length && records.length<=FAMILY.maxPopulation, 'Invalid saved population.');
    const ids=new Set();
    insist(shortText(currentId,100), 'Missing current player ID.');
    const actors=records.map(s=> {
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
        insist(plain(pub) && (pub.displayName===null || shortText(pub.displayName,100)) && (pub.claimedOccupation===null || shortText(pub.claimedOccupation,100)) && numberIn(pub.reputation,-100,100) && Array.isArray(pub.claims) && pub.claims.length<=30 && pub.claims.every(claim=>plain(claim) && shortText(claim.key,100) && shortText(claim.value,1000)) && plain(pub.standing) && integerIn(pub.standing.tier,0,7) && shortText(pub.standing.label,160), 'Invalid public identity.');
        const c=createCharacter(s.id,a.genome,a.identity.bodyForm,s.x,s.y,new RNG(s.id),s.id===currentId);
        c.actual=copyJSON(a); c.publicIdentity=copyJSON(pub);
        return c;
    });
    insist(baseIds.every(id=>ids.has(id)), 'Seeded citizens are missing.');
    insist(ids.has(currentId), 'Current player is missing.');
    w.registry.replace(actors,currentId);
    records.forEach((s,i)=>restoreCharacter(actors[i],s,w));
}
