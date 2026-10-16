// Pure visible-contour rules. No world, ancestry, prestige, RNG or input access.
const MELEE = Object.freeze({ windup:21, recovery:39, cost:12, damage:8, blockCost:8,
    blockFactor:.4, guardDrain:6, escapeRange:220, escapeTicks:120 });
function combatProfile(body, scale=1) {
    const line=body.form==='line', triangle=!line && body.points.length===3;
    const radius=line?17*scale:Math.max(...body.points.map(p=>hypot(p[0],p[1])))*scale;
    return { radius, extension:line?18:triangle?22:14, arc:line?.75:triangle?.5:1,
        windup:MELEE.windup, recovery:MELEE.recovery, damage:MELEE.damage };
}
function meleeReach(a,b) { return a.radius+b.radius+Math.min(22,a.extension); }
function faces(a,b,arc) { return Math.abs(Math.atan2(Math.sin(Math.atan2(b.y-a.y,b.x-a.x)-a.angle),Math.cos(Math.atan2(b.y-a.y,b.x-a.x)-a.angle)))<=arc; }
function meleeContact(a,b,ap,bp,clear) {
    return dist2(a.x,a.y,b.x,b.y)<=meleeReach(ap,bp)**2 && faces(a,b,ap.arc) && clear(a.x,a.y,b.x,b.y);
}
function freshSwing() { return { phase:'ready', ticks:0, angle:0 }; }
function beginSwing(s,stamina,angle) {
    if(s.phase!=='ready' || stamina<MELEE.cost) return false;
    s.phase='windup'; s.ticks=MELEE.windup; s.angle=angle; return true;
}
// Called exactly once per fixed simulation tick. The strike event is emitted once.
function tickSwing(s) {
    if(s.phase==='ready') return false;
    if(--s.ticks>0) return false;
    if(s.phase==='windup') { s.phase='recovery';s.ticks=MELEE.recovery;return true; }
    s.phase='ready';s.ticks=0;return false;
}
function sparDamage(health,stamina,frontalGuard) {
    const blocked=frontalGuard && stamina>=MELEE.blockCost;
    return { health:Math.max(1,health-MELEE.damage*(blocked?MELEE.blockFactor:1)),
        stamina:Math.max(0,stamina-(blocked?MELEE.blockCost:0)), blocked };
}
