// One transient encounter. Registry IDs are resolved every tick; no saved combat state.
class Sparring {
    constructor(game) {
        this.game=game;this.active=null;this.feedback='';
        for(const b of document.querySelectorAll('[data-end-spar]')) b.addEventListener('click',()=>{this.end();this.game.familyUI.refresh();});
    }
    has(id) { return !!this.active && [this.active.playerId,this.active.opponentId].includes(id); }
    profile(c) { return combatProfile(c.body,lifeStage(c.actual.life.ageYears).scale); }
    reason(id) {
        const w=this.game.world,p=w.player,c=w.registry.get(id);
        if(this.active) return 'Finish this practice first.';
        if(!c || c===p || !w.social.view(c).introduced) return 'Introduce yourself first.';
        if([p,c].some(a=>!a.actual.life.alive || a.actual.life.ageYears<18)) return 'Practice is for living adults.';
        if([p,c].some(a=>a.vitals.health<35 || a.vitals.hunger<30 || a.vitals.thirst<30 || a.vitals.stamina<30)) return 'We need health, supplies and energy first.';
        if(!w.social.nearby(c) || !w.segmentClear(p.x,p.y,c.x,c.y,3)) return 'Come closer on a clear path.';
        return '';
    }
    invite(id) {
        const reason=this.reason(id);if(reason) return {ok:false,text:reason};
        const w=this.game.world,p=w.player,c=w.registry.get(id);
        // Consent is specific to this low-stakes practice and current readiness.
        // A hostile personal relationship can decline; rank/attraction play no role.
        if(w.social.relationship(c).trust<0) return {ok:false,text:'“I do not want to practice together.”'};
        this.game.socialUI.controller?.cancel();this.game.input.clear();
        p.runtime.resting=c.runtime.resting=false;
        this.active={world:w,playerId:p.id,opponentId:c.id,swings:{[p.id]:freshSwing(),[c.id]:freshSwing()},
            tick:0,escape:0,wait:60,guards:{},path:[],index:0,replan:0};
        w.sparring=this;this.feedback='Practice begins. Watch the amber wind-up.';
        this.refresh();return {ok:true,text:'“A friendly practice. Stop whenever you like.”'};
    }
    end(text='Practice ended. Rest at a supplied refuge to heal.') {
        if(!this.active) return;
        const w=this.active.world;w.sparring=null;this.active=null;
        this.game.input.attack=false;this.game.input.hold.defend=false;
        if(text) this.game.notify(text);
        this.refresh();
    }
    requestStrike() {
        if(this.active && this.game.state==='running' && !this.game.socialUI.isOpen) this.game.input.attack=true;
    }
    step() {
        const a=this.active,g=this.game,w=g.world;if(!a) {g.input.attack=false;return;}
        const p=w.registry.get(a.playerId),c=w.registry.get(a.opponentId);
        if(w!==a.world || w.player.id!==a.playerId || !p?.actual.life.alive || !c?.actual.life.alive) {this.end('Practice ended.');return;}
        if([p,c].some(v=>v.vitals.health<=1 || v.vitals.stamina<=1e-8)) {this.end('Practice finished. Take a breath.');return;}
        a.tick++;a.escape=dist2(p.x,p.y,c.x,c.y)>MELEE.escapeRange**2?a.escape+1:0;
        if(a.escape>=MELEE.escapeTicks) {this.end('You leave the practice.');return;}
        const ps=a.swings[p.id],cs=a.swings[c.id];
        a.guards[p.id]=g.input.defend && ps.phase!=='windup';
        a.guards[c.id]=a.tick%240>=120 && a.tick%240<180 && cs.phase==='ready';
        for(const v of [p,c]) if(a.guards[v.id]) v.vitals.stamina=Math.max(0,v.vitals.stamina-MELEE.guardDrain*C.DT);
        if(g.input.attack) { g.input.attack=false;this.attack(p,a.guards[p.id]); }
        // Existing NPC needs continue, but no gathering/rest or ordinary AI owns this actor.
        const metabolism=c.actual.genome.metabolism*w.romance.household(c);
        c.runtime.moving=false;c.vitals.hunger=Math.max(0,c.vitals.hunger-.15*metabolism*C.DT);c.vitals.thirst=Math.max(0,c.vitals.thirst-.23*metabolism*C.DT);
        if(cs.phase==='ready') {
            c.angle=moveAngle(c.angle,Math.atan2(p.y-c.y,p.x-c.x),C.DT*7);
            const distance=hypot(c.x-p.x,c.y-p.y),reach=meleeReach(this.profile(c),this.profile(p));
            if(!a.guards[c.id] && a.escape===0 && distance>reach-4) {
                if(--a.replan<=0 || a.index>=a.path.length) {a.path=w.nav.path(c.x,c.y,p.x,p.y)||[];a.index=0;a.replan=48;}
                while(a.index<a.path.length && hypot(a.path[a.index].x-c.x,a.path[a.index].y-c.y)<5) a.index++;
                const dest=w.segmentClear(c.x,c.y,p.x,p.y,c.body.radius)?p:a.path[a.index];
                if(dest) {const dx=dest.x-c.x,dy=dest.y-c.y,d=hypot(dx,dy),step=Math.min(67*C.DT,d,Math.max(0,distance-reach+4));w.move(c,dx/(d||1)*step,dy/(d||1)*step);c.runtime.moving=true;}
            }
            if(--a.wait<=0 && !a.guards[c.id] && meleeContact(c,p,this.profile(c),this.profile(p),(x,y,bx,by)=>w.segmentClear(x,y,bx,by,3))) this.attack(c,false);
        }
        for(const [source,target] of [[p,c],[c,p]]) {
            const swing=a.swings[source.id];
            if(tickSwing(swing)) {
                const pose={x:source.x,y:source.y,angle:swing.angle};
                if(meleeContact(pose,target,this.profile(source),this.profile(target),(x,y,bx,by)=>w.segmentClear(x,y,bx,by,3))) {
                    const hit=sparDamage(target.vitals.health,target.vitals.stamina,a.guards[target.id] && faces(target,source,Math.PI/2));
                    target.vitals.health=hit.health;target.vitals.stamina=hit.stamina;
                    this.feedback=hit.blocked?'Frontal block · reduced hit':source===p?'Your strike connects.':'Their strike connects.';
                } else this.feedback='Strike missed.';
            }
            if(source===c && swing.phase==='ready' && !a.guards[c.id]) source.vitals.stamina=Math.min(100,source.vitals.stamina+3*C.DT);
        }
        if([p,c].some(v=>v.vitals.health<=1 || v.vitals.stamina<=1e-8)) this.end('Practice finished. Take a breath.');
    }
    attack(c,guard) {
        const a=this.active,s=a.swings[c.id];
        if(!guard && beginSwing(s,c.vitals.stamina,c.angle)) {c.vitals.stamina-=MELEE.cost;if(c.id===a.opponentId)a.wait=60;}
    }
    refresh() {
        const a=this.active;$('sparPanel').hidden=!a;
        for(const b of document.querySelectorAll('[data-end-spar]')) b.hidden=!a;
        if(!a) return;
        const c=a.world.registry.get(a.opponentId);if(!c) return;
        const swing=a.swings[c.id];
        $('sparStatus').textContent=`${a.world.social.view(c).name} · Health ${Math.ceil(c.vitals.health)} · Stamina ${Math.ceil(c.vitals.stamina)} · ${swing.phase==='windup'?'WIND-UP':a.guards[c.id]?'Defending':swing.phase}`;
        $('sparFeedback').textContent=this.feedback;
        $('defendBtn').classList.toggle('active',!!a.guards[a.playerId]);
    }
    draw(ctx) {
        const a=this.active;if(!a) return;
        for(const id of [a.playerId,a.opponentId]) {
            const c=a.world.registry.get(id);if(!c) continue;
            const other=a.world.registry.get(id===a.playerId?a.opponentId:a.playerId);if(!other) continue;
            const s=a.swings[id],p=this.profile(c),reach=meleeReach(p,this.profile(other)),angle=s.phase==='windup'?s.angle:c.angle;
            ctx.save();ctx.translate(c.x,c.y);
            ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,reach,angle-p.arc,angle+p.arc);ctx.closePath();
            ctx.fillStyle=s.phase==='windup'?'#f1cd884d':'#a9e0e510';ctx.fill();ctx.strokeStyle=s.phase==='windup'?'#f1cd88':'#a9e0e555';ctx.lineWidth=1;ctx.stroke();
            if(a.guards[id]) {ctx.beginPath();ctx.arc(0,0,p.radius+7,c.angle-Math.PI/2,c.angle+Math.PI/2);ctx.strokeStyle='#a9e0e5';ctx.lineWidth=3;ctx.stroke();}
            ctx.restore();
        }
    }
}
