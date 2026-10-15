// Uses a deliberately limited family DTO. Female latent geometry and carrier
// status never enter the DOM. Ordinary needs pause while this screen is open.
class FamilyUI {
    constructor(game) {
        this.game=game; this.returnState='running';
        $('familyBtn').addEventListener('click',()=>this.open());
        $('pauseFamilyBtn').addEventListener('click',()=>this.open());
        $('deathFamilyBtn').addEventListener('click',()=>this.open());
        $('closeFamilyBtn').addEventListener('click',()=>this.close());
        $('familyBirthBtn').addEventListener('click',()=>this.birth());
        for(const years of [1,5]) $(`advance${years}Btn`).addEventListener('click',()=>this.advance(years));
        $('familySaveBtn').addEventListener('click',()=>game.saves.save('manual'));
    }
    open(save=true) {
        const g=this.game; if(!g.world || (save && !['running','paused','dead','family'].includes(g.state))) return;
        if(g.state!=='family') this.returnState=g.state;
        g.setScreen('family'); this.refresh(); if(save) g.saves.save('auto',true);
    }
    close() {
        const g=this.game;
        if(!g.world.player.actual.life.alive) { if(g.world.family.candidates().length) return; g.setScreen('dead'); return; }
        g.setScreen(this.returnState==='paused'?'paused':'running');
    }
    birth() { const r=this.game.world.family.birth(); $('familyOutcome').textContent=briefReply(r,'birth'); this.refresh(); this.game.saves.save('auto',true); }
    advance(years) {
        const g=this.game,r=g.world.family.advance(years); $('familyOutcome').textContent=r.ok?`${years} family years pass.`:briefReply(r,'advance');
        if(!g.world.player.actual.life.alive) g.die();
        this.refresh(); g.refreshUI(); g.renderer.snap(); g.renderer.map(); g.saves.save('auto',true);
    }
    choose(id) {
        const g=this.game,r=g.world.family.succeed(id); $('familyOutcome').textContent=r.text;
        if(!r.ok) return;
        g.warningLatch={}; g.gatherCooldown=0; g.input.clear(); g.log(r.text);
        $('pauseReason').textContent=r.text; g.setScreen('paused'); g.refreshUI(); g.renderer.snap(); g.renderer.map(); g.saves.save('auto',true);
    }
    refresh() {
        const g=this.game, f=g.world.family, v=f.view(), p=g.world.player;
        $('familySummary').textContent=`Generation ${v.generation} · ${f.name(p)}, age ${Math.floor(p.actual.life.ageYears)} · Spouse: ${v.spouse}`;
        $('familyBirthStatus').textContent=v.birthReason.includes('Joint biological')?'Joint births require a male and female spouse.':v.birthReason || 'Ready to raise children.';
        $('familyBirthBtn').disabled=!!v.birthReason;
        $('closeFamilyBtn').disabled=!p.actual.life.alive && f.candidates().length>0;
        $('successionStatus').textContent=!p.actual.life.alive ? (f.candidates().length ? 'Choose an adult heir to continue.' : 'No adult heir. This lineage has ended.') : `${f.candidates().length} adult heirs · Children mature at 18 · ${v.canSucceed?'You may retire now.':'Retire at 40.'}`;
        const refuge=!!g.world.refugeAt(p.x,p.y);
        for(const n of [1,5]) $(`advance${n}Btn`).disabled=!p.actual.life.alive || !refuge;
        $('timeAdvanceStatus').textContent=refuge ? 'Refuge years provide subsistence. Your pack is kept.' : 'Return to a refuge to advance years.';
        const list=$('familyMembers'); list.replaceChildren();
        for(const m of v.members) {
            const card=document.createElement('article'); card.className='family-member';
            const title=document.createElement('h3'); title.textContent=`${m.name}${m.current?' · You':''} · Generation ${m.generation}`;
            const details=document.createElement('p'); details.textContent=`Age ${m.age} · ${m.sex} · ${m.form} · ${m.alive ? (m.age<18?'Child':'Adult') : m.death}`;
            const extra=document.createElement('details'), summary=document.createElement('summary'); summary.textContent='Traits & relationships';
            const traits=document.createElement('p'); traits.textContent=m.traits;
            const links=document.createElement('p'); links.textContent=`Parents: ${m.parents.join(', ') || 'Not recorded'} · Children: ${m.children.join(', ') || 'None'} · Siblings: ${m.siblings.join(', ') || 'None recorded'}`;
            const eligibility=document.createElement('small'); eligibility.textContent=m.current?'Current playable character':m.eligible?'Adult heir':!m.alive?'Deceased':m.age<18?`Adult in ${18-m.age} years`:'Family member';
            extra.append(summary,traits,links); card.append(title,details,eligibility,extra);
            if(m.eligible) { const b=document.createElement('button'); b.className='small-btn'; b.textContent=`Continue as ${m.name}`; b.disabled=!v.canSucceed; b.dataset.successor=m.id; b.addEventListener('click',()=>this.choose(m.id)); card.appendChild(b); }
            list.appendChild(card);
        }
        $('familyMarriages').textContent=v.marriages.map(m=>`${m.names.join(' + ')} · married year ${m.at} · ${m.end}`).join('\n') || 'No recorded marriages.';
        $('familyHistory').textContent=v.events.map(e=>`Year ${e.year} · ${e.kind} · ${e.names.join(', ')}`).join('\n') || 'Your family history begins here.';
    }
}
