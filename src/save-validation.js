// Stateless validators and character DTO conversion; no storage or DOM access.
const copyJSON = value => JSON.parse(JSON.stringify(value));
function utf8Bytes(text) {
    let bytes=0;
    for(let i=0;i<text.length;i++) {
        const c=text.charCodeAt(i);
        if(c<128) bytes++;
        else if(c<2048) bytes+=2;
        else if(c>=0xd800 && c<=0xdbff && i+1<text.length && text.charCodeAt(i+1)>=0xdc00 && text.charCodeAt(i+1)<=0xdfff) {bytes+=4;i++;}
        else bytes+=3;
    }
    return bytes;
}
// Shared complete simulation snapshot, also usable without DOM/storage for
// detached cohort validation. Browser callers supply their real UI/run fields.
function captureWorld(w,extras={}) {
    return {runId:'candidate',seed:w.seed,elapsed:w.elapsed,rngState:w.rng.state,currentPlayerId:w.player.id,
        ended:!w.player.actual.life.alive,characters:w.registry.all().map(captureCharacter),
        resources:w.resources.map(r=>({id:r.id,quantity:r.quantity,respawn:r.respawn})),
        pack:{food:0,water:0},progress:{gathered:0,visited:[],complete:false},gatherCooldown:0,warningLatch:{},effects:[],messages:[],notice:{text:'',until:0,hidden:true},
        family:w.family.exportState(),romance:w.romance.exportState(),social:w.social.exportState(),renewal:w.renewal.exportState(),...copyJSON(extras)};
}
function insist(ok, message) { if (!ok) throw new Error(message); }
function numberIn(n, lo, hi) { return typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi; }
function integerIn(n, lo, hi) { return Number.isInteger(n) && numberIn(n, lo, hi); }
function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
function shortText(s, max = 600) { return typeof s === 'string' && s.length <= max; }
function checkJSONTree(value, depth = 0, budget = { n: 0 }) {
    insist(depth < 24 && ++budget.n < 80000, 'Save structure is too large.');
    if (typeof value === 'number') insist(Number.isFinite(value), 'Save contains a non-finite number.');
    if (typeof value === 'string') insist(value.length <= 4000, 'Save text is too long.');
    if (value && typeof value === 'object') {
        insist(!Array.isArray(value) || value.length <= 3000, 'Save array is too long.');
        for (const key of Object.keys(value)) {
            insist(!['__proto__', 'prototype', 'constructor'].includes(key), 'Unsafe save property.');
            checkJSONTree(value[key], depth + 1, budget);
        }
    }
}
function identitySignature(c) {
    return hash(JSON.stringify({ id: c.id, genome: c.actual.genome, form: c.body.form, age: c.actual.life.ageYears }));
}
function captureCharacter(c) {
    const out = { id: c.id, identitySignature: identitySignature(c), actual: copyJSON(c.actual), publicIdentity: copyJSON(c.publicIdentity) };
    for (const key of ['x', 'y', 'px', 'py', 'angle', 'prevAngle', 'vitals', 'ai', 'runtime', 'playerKnowledge']) out[key] = copyJSON(c[key]);
    return out;
}
function validateKnowledge(k, elapsed, world) {
    insist(plain(k) && plain(k.observed) && plain(k.discoveredFacts) && Array.isArray(k.rumors) && plain(k.relationship), 'Invalid citizen knowledge.');
    insist(numberIn(k.relationship.familiarity, 0, 100) && numberIn(k.relationship.trust, -30, 100), 'Invalid relationship values.');
    const fields = ['form', 'activity', 'size', 'apparentClass'];
    insist(Object.keys(k.observed).every(key => fields.includes(key) && shortText(k.observed[key], 160)), 'Invalid observation.');
    if (typeof SocialSystem !== 'undefined') SocialSystem.validateKnowledge(k, elapsed, world);
    else insist(Object.keys(k.discoveredFacts).length === 0 && k.rumors.length === 0, 'Unsupported social knowledge.');
}
function restoreCharacter(target, s, world, legacy = false) {
    insist(plain(s) && s.id === target.id && s.identitySignature === (legacy ? target.legacySignature : identitySignature(target)), 'Citizen identity or generator does not match.');
    for (const key of ['x', 'px']) insist(numberIn(s[key], 0, C.W), 'Invalid citizen X coordinate.');
    for (const key of ['y', 'py']) insist(numberIn(s[key], 0, C.H), 'Invalid citizen Y coordinate.');
    insist(world.circleClear(s.x, s.y, target.body.radius - .001), 'Saved citizen overlaps solid terrain.');
    for (const key of ['angle', 'prevAngle']) insist(numberIn(s[key], -1e10, 1e10), 'Invalid orientation.');
    insist(plain(s.vitals) && ['health', 'hunger', 'thirst', 'stamina'].every(k => numberIn(s.vitals[k], 0, 100)), 'Invalid survival meters.');
    insist(plain(s.runtime), 'Missing runtime state.');
    for (const key of ['resting', 'moving', 'sprinting', 'exhausted']) insist(typeof s.runtime[key] === 'boolean', 'Invalid runtime flag.');
    insist(numberIn(s.runtime.sprintRecovery, 0, 5), 'Invalid sprint timer.');
    if (target.isPlayer) insist(s.ai === null, 'Player AI is invalid.');
    else {
        const a = s.ai;
        insist(plain(a) && ['wander', 'water', 'food', 'rest'].includes(a.intent), 'Invalid NPC intent.');
        insist(['idle', 'walking', 'wandering', 'gathering', 'resting', 'seeking food', 'seeking water'].includes(a.activity), 'Invalid NPC activity.');
        insist(Array.isArray(a.path) && a.path.length <= 1944 && integerIn(a.pathIndex, 0, a.path.length), 'Invalid NPC path.');
        insist(a.path.every(p => plain(p) && numberIn(p.x, 16, C.W - 16) && numberIn(p.y, 16, C.H - 16)), 'Invalid path waypoint.');
        insist(a.targetId === null || world.resources.some(r => r.id === a.targetId) || world.refuges.some(r => r.id === a.targetId), 'Unknown NPC destination.');
        for (const key of ['wait', 'think', 'stuck']) insist(numberIn(a[key], -10, 100), 'Invalid NPC timer.');
        insist(numberIn(a.homeX, 0, C.W) && numberIn(a.homeY, 0, C.H), 'Invalid NPC home.');
    }
    validateKnowledge(s.playerKnowledge, world.elapsed, world);
    for (const key of ['x', 'y', 'px', 'py', 'angle', 'prevAngle', 'vitals', 'ai', 'runtime', 'playerKnowledge']) target[key] = copyJSON(s[key]);
}
