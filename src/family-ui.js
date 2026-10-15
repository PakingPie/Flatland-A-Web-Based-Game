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
        const g=this.game; if(!g.world || !['running','paused','dead','family'].includes(g.state)) return;
        if(g.state!=='family') this.returnState=g.state;
        g.setScreen('family'); this.refresh(); if(save) g.saves.save('auto',true);
    }
    close() {
        const g=this.game;
        if(!g.world.player.actual.life.alive) { if(g.world.family.candidates().length) return; g.setScreen('dead'); return; }
        g.setScreen(this.returnState==='paused'?'paused':'running');
    }
    birth() { const r=this.game.world.family.birth(); $('familyOutcome').textContent=r.text; this.refresh(); this.game.saves.save('auto',true); }
    advance(years) {
        const g=this.game,r=g.world.family.advance(years); $('familyOutcome').textContent=r.text;
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
        $('familyBirthStatus').textContent=v.birthReason || 'Both partners are ready to consent to raising biological children.';
        $('familyBirthBtn').disabled=!!v.birthReason;
        $('closeFamilyBtn').disabled=!p.actual.life.alive && f.candidates().length>0;
        $('successionStatus').textContent=!p.actual.life.alive ? (f.candidates().length ? 'Choose a living adult descendant to continue this world.' : 'The playable lineage has ended. No living adult descendant was eligible; minors cannot inherit control.') : v.canSucceed ? 'You may retire now and choose a living adult descendant.' : 'Raise children to adulthood (18). Voluntary retirement opens at age 40. On death, only living adult descendants can continue the lineage; minors cannot inherit control.';
        const refuge=!!g.world.refugeAt(p.x,p.y);
        for(const n of [1,5]) $(`advance${n}Btn`).disabled=!p.actual.life.alive || !refuge;
        $('timeAdvanceStatus').textContent=refuge ? 'One survival day equals one family year. Refuge time advance supplies basic needs through community subsistence, preserves your pack, and processes aging and deaths. It stops if you die.' : 'Return to a refuge with health 35+, food and water 30+ to advance family years.';
        const list=$('familyMembers'); list.replaceChildren();
        for(const m of v.members) {
            const card=document.createElement('article'); card.className='family-member';
            const title=document.createElement('h3'); title.textContent=`${m.name}${m.current?' · You':''} · Generation ${m.generation}`;
            const details=document.createElement('p'); details.textContent=`Age ${m.age} · ${m.sex} · ${m.form} · ${m.alive ? (m.age<18?'Child':'Adult') : m.death}`;
            const traits=document.createElement('p'); traits.textContent=m.traits;
            const links=document.createElement('p'); links.textContent=`Parents: ${m.parents.join(', ') || 'Not recorded'} · Children: ${m.children.join(', ') || 'None'} · Siblings: ${m.siblings.join(', ') || 'None recorded'}`;
            const eligibility=document.createElement('small'); eligibility.textContent=m.current?'Current playable character':m.eligible?'Eligible adult descendant':!m.alive?'Deceased':m.age<18?'Not eligible: minor':'Not a descendant of the current character';
            card.append(title,details,traits,links,eligibility);
            if(m.eligible) { const b=document.createElement('button'); b.className='small-btn'; b.textContent=`Continue as ${m.name}`; b.disabled=!v.canSucceed; b.dataset.successor=m.id; b.addEventListener('click',()=>this.choose(m.id)); card.appendChild(b); }
            list.appendChild(card);
        }
        $('familyMarriages').textContent=v.marriages.map(m=>`${m.names.join(' + ')} · married year ${m.at} · ${m.end}`).join('\n') || 'No recorded marriages.';
        $('familyHistory').textContent=v.events.map(e=>`Year ${e.year} · ${e.kind} · ${e.names.join(', ')}`).join('\n') || 'Your family history begins here.';
    }
}
