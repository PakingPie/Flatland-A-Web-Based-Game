// Private integrity checks. Strictly increasing generations along parent edges
// prove the genealogy is a DAG, including deceased and non-playable records.
function validateGenerationDAG(registry, bornIds) {
    for(const c of registry.all()) {
        const l=c.actual.lineage, g=c.actual.genome;
        insist(plain(l) && integerIn(l.generation,1,1000) && Array.isArray(l.childrenIds) && l.childrenIds.length<=256 && new Set(l.childrenIds).size===l.childrenIds.length && l.motherId===g.motherId && l.fatherId===g.fatherId && l.generation===g.generation, 'Invalid genealogy.');
        const parents=[l.motherId,l.fatherId].filter(Boolean);
        insist(parents.length===0 || (parents.length===2 && parents[0]!==parents[1]), 'Incomplete biological parentage.');
        for(const id of parents) {
            const p=registry.get(id);
            insist(p && p.actual.lineage.generation<l.generation && p.actual.lineage.childrenIds.includes(c.id), 'Broken parent link or generation cycle.');
        }
        if(parents.length) insist(bornIds.has(c.id) && l.generation===Math.max(...parents.map(id=>registry.get(id).actual.lineage.generation))+1, 'Missing birth or wrong generation.');
        for(const id of l.childrenIds) {
            const child=registry.get(id);
            insist(child && [child.actual.lineage.motherId,child.actual.lineage.fatherId].includes(c.id), 'Broken child link.');
        }
    }
}
function validateSpouseBonds(registry, marriages) {
    const expected=new Map(registry.all().map(c=>[c.id,{partnerIds:[],marriageIds:[]} ]));
    for(const m of marriages) for(const id of m.ids) {
        const bonds=expected.get(id);
        bonds.marriageIds.push(m.id);
        if(m.endedAt===null) bonds.partnerIds.push(m.ids.find(other=>other!==id));
    }
    const sameIds=(a,b)=>Array.isArray(a) && a.length===b.length && new Set(a).size===a.length && a.every(id=>b.includes(id));
    for(const c of registry.all()) {
        const actual=c.actual.bonds, wanted=expected.get(c.id);
        insist(plain(actual) && sameIds(actual.partnerIds,wanted.partnerIds) && sameIds(actual.marriageIds,wanted.marriageIds), 'Spouse bonds do not match reciprocal marriage history.');
    }
}
