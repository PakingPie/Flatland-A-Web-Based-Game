// Observer-facing presentation only. Never return private genomes or carrier state.
function familyView(family) {
    const known=family.knownFamily(), knownIds=new Set(known.map(c=>c.id)), candidates=new Set(family.candidates().map(c=>c.id));
    return { generation:family.world.player.actual.lineage.generation, canSucceed:family.canSucceed(),
        undiscoveredHeirs:family.canSucceed() ? [...candidates].filter(id=>!knownIds.has(id)).map(id=>({id,label:'Continue as an adult descendant'})) : [],
        spouse:family.world.romance.spouse(family.world.player) ? family.name(family.world.romance.spouse(family.world.player)) : 'None',
        birthReason:family.birthEligibility(), members:known.map(c=>({id:c.id,name:family.name(c),age:Math.floor(c.actual.life.ageYears),sex:c.actual.identity.sex,
            form:c.body.visibleType,alive:c.actual.life.alive,generation:c.actual.lineage.generation,current:c.isPlayer,eligible:candidates.has(c.id),
            parents:[c.actual.lineage.motherId,c.actual.lineage.fatherId].filter(id=>knownIds.has(id)).map(id=>family.name(family.character(id))),
            children:c.actual.lineage.childrenIds.filter(id=>knownIds.has(id)).map(id=>family.name(family.character(id))),
            siblings:known.filter(other=>other.id!==c.id && c.actual.lineage.motherId && other.actual.lineage.motherId===c.actual.lineage.motherId && other.actual.lineage.fatherId===c.actual.lineage.fatherId).map(other=>family.name(other)),
            traits:family.births.some(b=>b.childIds.includes(c.id) && family.world.renewal.knowsBirth(b.id)) ? `Observed in family life: ${c.body.radius>20?'large':'medium'} outline, ${c.actual.genome.mobility>1.03?'brisk':c.actual.genome.mobility<.97?'measured':'steady'} pace, ${c.actual.genome.metabolism>1.03?'hearty':c.actual.genome.metabolism<.97?'light':'moderate'} appetite. ${c.body.form==='line'?'Latent geometry remains undiscovered.':'Visible geometry: '+c.body.visibleType+'.'}` : 'Private hereditary ancestry remains undiscovered.',
            death:c.actual.life.alive ? '' : `${c.actual.life.deathCause || 'death'} · day ${Math.floor((c.actual.life.deathAt||0)/C.DAY)+1}` })),
        marriages:family.world.romance.marriages.filter(m=>family.world.renewal.knowsMarriage(m.id) && m.ids.every(id=>knownIds.has(id))).map(m=>({names:m.ids.map(id=>family.name(family.character(id))),at:Math.floor(m.at/C.DAY),end:m.endedAt===null?'ongoing':`${m.reason} on day ${Math.floor(m.endedAt/C.DAY)+1}`})),
        events:family.history.filter(e=>e.ids.every(id=>knownIds.has(id)) && (e.kind!=='birth' || family.births.some(b=>b.at===e.at && b.childIds.every(id=>e.ids.includes(id)) && family.world.renewal.knowsBirth(b.id)))).map(e=>({kind:e.kind,names:e.ids.map(id=>family.name(family.character(id))),year:Math.floor(e.at/C.DAY)})) };
}
