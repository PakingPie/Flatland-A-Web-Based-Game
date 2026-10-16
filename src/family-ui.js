// Uses a deliberately limited family DTO. Female latent geometry and carrier
// status never enter the DOM. Ordinary needs pause while this screen is open.
class FamilyUI {
    constructor(game) {
        this.game=game; this.returnState='running'; this.memberRows=new Map();
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
        const g=this.game,r=g.world.family.advance(years); $('familyOutcome').textContent=r.ok?(years===1?'1 family year passes.':`${years} family years pass.`):briefReply(r,'advance');
        if(!g.world.player.actual.life.alive) g.die();
        this.refresh(); g.refreshUI(); g.renderer.snap(); g.renderer.map(); g.saves.save('auto',true);
    }
    choose(id) {
        const g=this.game,r=g.world.family.succeed(id); $('familyOutcome').textContent=r.text;
        if(!r.ok) return;
        g.warningLatch={}; g.gatherCooldown=0; g.input.clear(); g.log(r.text);
        $('pauseReason').textContent=r.text; g.setScreen('paused'); g.refreshUI(); g.renderer.snap(); g.renderer.map(); g.saves.save('auto',true);
    }
    memberRow(m, canSucceed) {
        let row=this.memberRows.get(m.id);
        if(!row) {
            const card=document.createElement('article'); card.className='family-member'; card.dataset.memberId=m.id;
            const title=document.createElement('h3'), details=document.createElement('p'), eligibility=document.createElement('small');
            const extra=document.createElement('details'), summary=document.createElement('summary'); summary.textContent='Traits & relationships';
            const traits=document.createElement('p'), links=document.createElement('p');
            extra.append(summary,traits,links); card.append(title,details,eligibility,extra);
            row={card,title,details,eligibility,traits,links,button:null}; this.memberRows.set(m.id,row);
        }
        const text=(el,value)=>{if(el.textContent!==value) el.textContent=value;};
        text(row.title,`${m.name}${m.current?' · You':''} · Generation ${m.generation}`);
        text(row.details,`Age ${m.age} · ${m.sex} · ${m.form} · ${m.alive ? (m.age<18?'Child':'Adult') : m.death}`);
        text(row.eligibility,m.current?'Current playable character':m.eligible?'Adult heir':!m.alive?'Deceased':m.age<18?`Adult in ${18-m.age} years`:'Family member');
        text(row.traits,m.traits);
        text(row.links,`Parents: ${m.parents.join(', ') || 'Not recorded'} · Children: ${m.children.join(', ') || 'None'} · Siblings: ${m.siblings.join(', ') || 'None recorded'}`);
        if(m.eligible) {
            if(!row.button) {
                row.button=document.createElement('button'); row.button.className='small-btn'; row.button.dataset.successor=m.id;
                row.button.addEventListener('click',()=>this.choose(m.id)); row.card.appendChild(row.button);
            }
            text(row.button,`Continue as ${m.name}`); row.button.disabled=!canSucceed;
        } else if(row.button) { row.button.remove(); row.button=null; }
        return row;
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
        const list=$('familyMembers'), ids=new Set(v.members.map(m=>m.id));
        for(const [id,row] of this.memberRows) if(!ids.has(id)) { row.card.remove(); this.memberRows.delete(id); }
        v.members.forEach((m,index)=>{
            const row=this.memberRow(m,v.canSucceed);
            if(list.children[index]!==row.card) list.insertBefore(row.card,list.children[index] || null);
        });
        const unseen=$('undiscoveredHeirs');unseen.replaceChildren();
        for(const heir of v.undiscoveredHeirs) {
            const button=document.createElement('button');button.className='small-btn';button.textContent=heir.label;
            button.dataset.successor=heir.id;button.addEventListener('click',()=>this.choose(heir.id));unseen.appendChild(button);
        }
        $('familyMarriages').textContent=v.marriages.map(m=>`${m.names.join(' + ')} · married year ${m.at} · ${m.end}`).join('\n') || 'No recorded marriages.';
        $('familyHistory').textContent=v.events.map(e=>`Year ${e.year} · ${e.kind} · ${e.names.join(', ')}`).join('\n') || 'Your family history begins here.';
    }
}
