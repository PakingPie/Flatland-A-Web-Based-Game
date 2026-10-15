// Small world-anchored choices, a brief reply, and an optional private-safe notebook.
class SocialUI {
    constructor(game) {
        this.game=game; this.selectedId=null; this.group='root'; this.reply=null; this.signature=''; this.controller=null;
        $('talkBtn').addEventListener('click',()=>this.openNearest());
        $('closeCitizenBtn').addEventListener('click',()=>this.close());
        $('bubbleBackBtn').addEventListener('click',()=>this.showGroup(this.group==='stories'?'talk':this.group==='commitment'?'romance':'root'));
        game.canvas.addEventListener('click',e=>{
            if(game.state!=='running') return;
            const r=game.canvas.getBoundingClientRect(),c=game.citizenAtScreen(e.clientX-r.left,e.clientY-r.top);
            if(c) this.open(c.id); else this.close(false);
        },true);
        document.addEventListener('pointerdown',e=>{
            if(this.isOpen && !$('citizenPanel').contains(e.target) && e.target!==game.canvas) this.close(false);
        },true);
    }
    get isOpen() { return this.selectedId!==null; }
    get approach() {
        if(this.controller?.world!==this.game.world) this.controller=new CitizenApproach(this.game.world,(id,action)=>this.perform(id,action),text=>this.say(null,text));
        return this.controller;
    }
    openNearest() {
        if(this.game.state!=='running') return;
        const w=this.game.world, c=w.social.nearest() || w.npcs.filter(c=>c.actual.life.alive).sort((a,b)=>dist2(a.x,a.y,w.player.x,w.player.y)-dist2(b.x,b.y,w.player.x,w.player.y))[0];
        if(c) this.open(c.id);
    }
    open(id) {
        const g=this.game,c=g.world?.social.citizen(id); if(g.state!=='running' || !c?.actual.life.alive) return;
        this.close(false); this.reply=null; $('speechBubble').hidden=true; this.selectedId=id; this.group='root'; this.signature='';
        g.input.clear(); g.accumulator=0; g.world.player.runtime.moving=g.world.player.runtime.sprinting=false;
        $('citizenPanel').hidden=false; $('tooltip').hidden=true;
        this.refresh(); $('closeCitizenBtn').focus({preventScroll:true});
    }
    close(focus=true) {
        this.selectedId=null; $('citizenPanel').hidden=true; this.controller?.cancel();
        if(this.game.world) this.game.world.conversationId=null;
        this.game.input.clear(); this.game.accumulator=0;
        if(focus && this.game.state==='running') this.game.canvas.focus({preventScroll:true});
    }
    reset() { this.close(false); this.reply=null; $('speechBubble').hidden=true; }
    showGroup(group) { this.group=group; this.signature=''; this.refresh(); (this.group==='root'?$('bubbleOptions').querySelector('button'):$('bubbleBackBtn'))?.focus({preventScroll:true}); }
    setTab(tab) { this.showGroup(tab==='notes'?'details':'root'); }
    talk(topic) { this.request({kind:'social',topic}); }
    request(action) {
        if(!this.isOpen || this.game.state!=='running') return;
        const id=this.selectedId;
        this.close(false);
        if(action.kind==='family') { this.game.familyUI.open(); return; }
        this.game.world.player.runtime.resting=false;
        this.approach.start(id,action); this.game.canvas.focus({preventScroll:true});
    }
    perform(id,action) {
        const w=this.game.world;
        const result=action.kind==='social'?w.social.interact(id,action.topic):w.romance.interact(id,action.topic);
        const changes=result.changes;
        const cue=action.topic==='children'?'Family plans':action.topic==='propose' && result.ok?'♥ Married':changes?.trust>0?'Trust ↑':changes?.trust<0?'Trust ↓':action.kind==='romance'&&result.ok?'♥ Affection ↑':'';
        const reply=action.topic==='introduce'&&result.ok?`“I’m ${w.social.view(w.social.citizen(id)).name}.”`:
            result.ok?({compliment:'“That’s kind of you.”',outing:'“A walk sounds lovely.”',commitment:'“I can imagine a life together.”'}[action.topic] || briefReply(result,action.topic)):briefReply(result,action.topic);
        this.say(id,reply,cue,result.outcome);
        this.game.refreshUI();
    }
    say(id,text,cue='',outcome='neutral') {
        this.reply={id,until:performance.now()+4200};
        $('dialogueText').textContent=text; $('socialOutcome').textContent=cue;
        $('speechBubble').dataset.outcome=outcome; $('speechBubble').hidden=false;
    }
    choices(v,romance) {
        const social=(label,topic,icon='◌')=>({label,icon,action:{kind:'social',topic}});
        const love=(label,topic,icon='♡')=>({label,icon,action:{kind:'romance',topic}});
        const group=(label,next,icon='⋯')=>({label,icon,group:next});
        const details=group('Details','details','◇');
        if(this.group==='talk') return [social('Chat','chat'),social('Interests','interests'),group('More topics','stories')];
        if(this.group==='stories') return [social('Work','occupation'),social('Society','district'),social('Family stories','family'),social('Rumors','rumor')];
        if(this.group==='romance') return [love('Compliment','compliment'),love('Invite out','outing'),love('Our future','commitment'),group('Commitment','commitment')];
        if(this.group==='commitment') return [love('Preferences','preferences','◇'),love('Discuss children','children'),love('Propose','propose'),...(romance.status==='married'?[love('Separate','separate','↗')]:[])];
        if(this.group==='details') return [];
        if(!v.introduced) return [social('Greet','introduce','◌'),details];
        if(romance.status==='married') return [group('Talk','talk','◌'),group('Affection','romance','♡'),{label:'Family',icon:'⌂',action:{kind:'family'}},details];
        return [group('Talk','talk','◌'),...(v.adult && this.game.world.player.actual.life.ageYears>=18?[love('Spend time','outing'),group('Romance','romance','♡')]:[]),details];
    }
    refresh() {
        if(!this.isOpen || !this.game.world) return;
        const w=this.game.world,c=w.social.citizen(this.selectedId); if(!c?.actual.life.alive) {this.close();return;}
        const v=w.social.view(c),romance=w.romance.view(c);
        $('citizenName').textContent=v.name; $('citizenForm').textContent=v.observed.form;
        $('bubbleSummary').textContent=`${romance.status==='none'?v.relationship.label:romance.status} · World paused`;
        $('bubbleBackBtn').hidden=this.group==='root'; $('bubbleDetails').hidden=this.group!=='details';
        $('bubbleHint').textContent=this.group==='details'?'Private ancestry stays unknown.':v.remaining===0?'They need a break. Return tomorrow.':v.inRange?'Choose an action.':'Choose an action to walk over.';
        const signature=JSON.stringify([this.group,v.introduced,v.adult,romance.status]);
        if(signature!==this.signature) {
            this.signature=signature;const options=$('bubbleOptions'); options.replaceChildren();
            for(const choice of this.choices(v,romance)) {
                const b=document.createElement('button'); b.type='button'; b.className='bubble-action';
                const icon=document.createElement('span'); icon.textContent=choice.icon;icon.setAttribute('aria-hidden','true');b.append(icon,document.createTextNode(choice.label));
                if(choice.action) { if(choice.action.kind==='social') b.dataset.topic=choice.action.topic;else if(choice.action.kind==='romance') b.dataset.romance=choice.action.topic;b.addEventListener('click',()=>this.request(choice.action)); }
                else {b.dataset.group=choice.group;b.addEventListener('click',()=>this.showGroup(choice.group));}
                options.appendChild(b);
            }
        }
        if(this.group==='details') {
            $('relationshipNumbers').textContent=`Familiarity ${Math.round(v.relationship.familiarity)} · Trust ${Math.round(v.relationship.trust)} · Affection ${Math.round(romance.affection)}`;
            $('romancePreferences').textContent=romance.preferences;
            this.renderNotes(v);
        }
        this.position($('citizenPanel'),c); this.frame();
    }
    renderNotes(v) {
        const notes=$('knownFacts'); notes.replaceChildren();
        for(const fact of v.facts.filter(f=>!f.locked)) {
            const row=document.createElement('p'),label=document.createElement('strong'),value=document.createElement('span'),badge=document.createElement('small');
            label.textContent=fact.label;value.textContent=fact.value;badge.textContent=({claim:'Unconfirmed',observation:'Observed',confirmed:'Recorded'})[fact.kind];row.className='fact-row';row.append(label,value,badge);notes.appendChild(row);
        }
        if(!notes.childElementCount) notes.textContent='Introduce yourself to learn more.';
        const rumors=$('knownRumors');rumors.replaceChildren();
        for(const r of v.rumors) {const p=document.createElement('p');p.className='rumor';p.textContent=`Rumor: ${r.text}`;rumors.appendChild(p);}
    }
    position(element,c) {
        const g=this.game,p=c?g.renderer.worldToScreen(c.x,c.y):{x:innerWidth/2,y:innerHeight/2},r=element.getBoundingClientRect();
        const x=p.x+r.width+36<innerWidth?p.x+30:p.x-r.width-30;
        element.style.left=clamp(x,10,Math.max(10,innerWidth-r.width-10))+'px';
        element.style.top=clamp(p.y-r.height/2,10,Math.max(10,innerHeight-r.height-10))+'px';
    }
    frame() {
        if(this.isOpen) {const c=this.game.world?.social.citizen(this.selectedId);if(c)this.position($('citizenPanel'),c);}
        if(this.reply) {if(performance.now()>this.reply.until || this.game.state!=='running') {this.reply=null;$('speechBubble').hidden=true;}else this.position($('speechBubble'),this.game.world.social.citizen(this.reply.id));}
    }
    movement(dt,manual) {
        if(manual.magnitude>.04) this.controller?.cancel();
        return manual.magnitude>.04?manual:this.controller?.movement(dt)||manual;
    }
}
