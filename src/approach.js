// Transient player intent. Saves retain the world, never a queued UI click.
// Uses the same conservative navigation and collision checks as the citizens.
class CitizenApproach {
    constructor(world, arrive, stop) { this.world=world; this.arrive=arrive; this.stop=stop; this.pending=null; }
    start(id, action) { this.pending={id,action,path:[],index:0,replan:0,age:0}; }
    cancel() { this.pending=null; this.world.conversationId=null; }
    fail(text) { this.cancel(); this.stop(text); return {x:0,y:0,magnitude:0}; }
    movement(dt) {
        const q=this.pending; if(!q) return null;
        const w=this.world,p=w.player,c=w.social.citizen(q.id),still={x:0,y:0,magnitude:0};
        if(!p.actual.life.alive || !c?.actual.life.alive) return this.fail('They are no longer available.');
        q.age+=dt; if(q.age>40) return this.fail('Could not catch up. Try again closer.');
        if(w.social.nearby(c)) {
            w.conversationId=c.id;
            const last=Math.max(c.playerKnowledge.relationship.lastAt,w.romance.pair(p,c).lastAt);
            if(!(q.action.kind==='romance' && q.action.topic==='separate') && w.elapsed-last<SOCIAL.cooldown) return still;
            const action=q.action; this.cancel(); this.arrive(c.id,action); return still;
        }
        w.conversationId=null; q.replan-=dt;
        if(q.replan<=0 || q.index>=q.path.length) {
            q.path=w.nav.path(p.x,p.y,c.x,c.y); q.index=0; q.replan=.8;
            if(!q.path?.length) return this.fail('No clear route. Try another position.');
        }
        while(q.index<q.path.length && hypot(q.path[q.index].x-p.x,q.path[q.index].y-p.y)<5) q.index++;
        if(q.index>=q.path.length) return still;
        const next=q.path[q.index],dx=next.x-p.x,dy=next.y-p.y,d=hypot(dx,dy);
        return {x:dx/(d||1),y:dy/(d||1),magnitude:Math.min(1,d/(C.SPEED*p.actual.genome.mobility*dt))};
    }
}
// Keep full facts in the notebook. Routine replies contain one short thought.
function briefReply(result, topic) {
    if(topic==='birth' && result.ok) return `${result.ids.length} children born. Meet them in Family.`;
    if(topic==='propose' && result.ok) return '“Yes. Let’s build a life together.”';
    if(topic==='separate' && result.ok) return 'The marriage ends. Your family history remains.';
    const quoted=result.text.match(/“([^”]+)”/);
    let text=(quoted?quoted[1]:result.text).split(/(?<=[.!?])\s/)[0];
    if(text.length>110) text=text.slice(0,107).replace(/\s+\S*$/,'')+'…';
    return quoted?`“${text}”`:text;
}
