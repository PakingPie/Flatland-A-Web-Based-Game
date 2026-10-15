// Explicit, read-only testing view. Private truth never enters ordinary DTOs or
// observer discoveries. Opening/closing is transient and does not enter saves.
class InformationInspector {
    constructor(game) {
        this.game=game; this.returnState='paused';
        $('openInspectorBtn').addEventListener('click',()=>this.toggle());
        $('closeInspectorBtn').addEventListener('click',()=>this.close());
        $('inspectorSearch').addEventListener('input',()=>this.populate());
        $('inspectorCharacter').addEventListener('change',()=>this.render());
    }
    get isOpen() { return this.game.state==='inspect'; }
    toggle() {
        if(this.isOpen) { this.close(); return false; }
        const g=this.game; if(!g.world || g.state==='menu') return false;
        const selected=g.socialUI?.selectedId || g.world.player.id;
        this.returnState=g.state;
        g.setScreen('inspect');
        $('inspectorSearch').value=''; this.populate(selected);
        return true;
    }
    close() {
        if(!this.isOpen) return;
        const g=this.game; g.setScreen(this.returnState);
        if(g.state==='running') g.canvas.focus({preventScroll:true});
    }
    clear() {
        $('inspectorSearch').value='';
        $('inspectorCharacter').replaceChildren();
        for(const id of ['inspectorSummary','inspectorRecord']) $(id).textContent='';
        $('inspectorRaw').open=false;
    }
    populate(selected=$('inspectorCharacter').value) {
        const w=this.game.world, query=$('inspectorSearch').value.trim().toLowerCase(), select=$('inspectorCharacter');
        select.replaceChildren();
        const option=(id,label)=>{const el=document.createElement('option');el.value=id;el.textContent=label;select.appendChild(el);};
        if(!query || 'world dynasty resources'.includes(query)) option('world','World & dynasty');
        for(const c of w.registry.all()) {
            const label=`${c.actual.identity.name || c.id} · ${c.id}${c.isPlayer?' · You':''}${c.actual.life.alive?'':' · Deceased'}`;
            if(!query || label.toLowerCase().includes(query)) option(c.id,label);
        }
        if([...select.options].some(o=>o.value===selected)) select.value=selected;
        select.disabled=!select.options.length;
        this.render();
    }
    render() {
        const g=this.game,w=g.world,id=$('inspectorCharacter').value,c=w.registry.get(id);
        if(id==='world') {
            $('inspectorSummary').textContent=`Seed ${w.seed} · Family year ${(w.elapsed/C.DAY).toFixed(2)} · ${w.registry.living().length} living / ${w.registry.all().length} total records`;
            $('inspectorRecord').textContent=JSON.stringify({save:g.saves.capture(),resources:w.resources,terrain:{obstacles:w.obstacles,refuges:w.refuges,roads:w.roads,districts:w.districts}},null,2);
            return;
        }
        if(!c) { $('inspectorSummary').textContent='No matching records.'; $('inspectorRecord').textContent=''; return; }
        const a=c.actual,genome=a.genome,spouse=w.romance.spouse(c),name=id=>w.registry.get(id)?.actual.identity.name || id || 'None';
        const preferences=w.romance.preferences(c),pair=c.id===w.player.id?null:w.romance.pairs[w.romance.key(w.player,c)] || null;
        const readiness=c.id===w.player.id?null:w.romance.parenthoodReadiness(w.player,c);
        const summary=[
            `${a.identity.name} · ${c.id} · ${a.identity.sex} · age ${a.life.ageYears.toFixed(2)} · ${a.life.alive?'Living':a.life.deathCause || 'Deceased'}`,
            `Visible form: ${c.body.visibleType} · Generation ${a.lineage.generation}`,
            `Hidden geometry: ${genome.sideCount} sides · ${genome.geometryStage} · regularity ${genome.regularity.toFixed(3)} · sharpness ${genome.sharpness.toFixed(3)}`,
            `Irregular-ancestry carrier: ${genome.latentIrregularAncestry?'Yes':'No'} · Mutation tendency: ${genome.mutationTendency.toFixed(3)}`,
            `Size ${genome.size.toFixed(3)} · Mobility ${genome.mobility.toFixed(3)} · Metabolism ${genome.metabolism.toFixed(3)}`,
            `Mother: ${name(a.lineage.motherId)} · Father: ${name(a.lineage.fatherId)}`,
            `Children: ${a.lineage.childrenIds.map(name).join(', ') || 'None'} · Spouse: ${spouse?name(spouse.id):'None'}`,
            `Health ${c.vitals.health.toFixed(1)} · Food ${c.vitals.hunger.toFixed(1)} · Water ${c.vitals.thirst.toFixed(1)} · Stamina ${c.vitals.stamina.toFixed(1)}`,
            `Partner preferences: ${preferences.sexes.join(', ')} · Baseline family preference: ${preferences.familyLife.toFixed(3)}`,
            ...(readiness?[`Current willingness: ${readiness.willingness.toFixed(3)} · Trust support +${readiness.trustSupport.toFixed(3)} · Affection support +${readiness.affectionSupport.toFixed(3)}`]:[]),
            `Trust ${c.playerKnowledge.relationship.trust.toFixed(1)} · Familiarity ${c.playerKnowledge.relationship.familiarity.toFixed(1)} · Affection ${pair?.affection.toFixed(1) || '0.0'}`
        ];
        $('inspectorSummary').textContent=summary.join('\n');
        $('inspectorRecord').textContent=JSON.stringify({character:c,romanticPreferences:preferences,parenthoodReadiness:readiness,
            compatibilityWithPlayer:c.id===w.player.id?null:w.romance.compatibility(w.player,c),
            closeKinToPlayer:w.romance.isCloseKin(w.player,c),
            pairs:Object.values(w.romance.pairs).filter(p=>p.ids.includes(c.id)),
            marriages:w.romance.marriages.filter(m=>m.ids.includes(c.id)),
            archivedNotebooks:Object.fromEntries(Object.entries(w.family.notebooks).filter(([observer,book])=>observer===c.id || book.knowledge[c.id]))},null,2);
    }
}
