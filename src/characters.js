// Presentation only. Saved adult geometry and physical clearance never change.
function lifeStage(age) {
    if(age<6) return {label:'Child',scale:.45};
    if(age<18) return {label:'Teenager',scale:.70};
    if(age<65) return {label:'Adult',scale:1};
    return {label:'Elder',scale:.85};
}
function visualRadius(c) { return c.body.radius*lifeStage(c.actual.life.ageYears).scale; }
function createCharacter(id, genome, form, x, y, rng, isPlayer = false) {
    const legacyGenome = { sideCount: 3, regularity: .5, sharpness: .6, size: 1, mobility: 1, metabolism: 1, mutationTendency: .035, ...genome };
    const g = normalizeGenome(legacyGenome);
    if (form === 'line' && genome.latentIrregularAncestry === undefined)
        g.latentIrregularAncestry ||= new RNG(`latent-ancestry:${id}`).next() < .3;
    const bodyRadius = form === 'line' ? 17 : 17 * g.size;
    const actual = { identity: { id, sex: form === 'line' ? 'female' : 'male', bodyForm: form }, genome: g,
        life: { ageYears: isPlayer ? 19 : rng.int(18, 65), alive: true },
        lineage: { generation: 0, motherId: null, fatherId: null, childrenIds: [] } };
    const publicIdentity = { displayName: null, claimedOccupation: null, reputation: 0, claims: [] };
    const playerKnowledge = { observed: {}, discoveredFacts: {}, rumors: [], relationship: { familiarity: 0, trust: 0 } };
    const c = { id, actual, publicIdentity, playerKnowledge, isPlayer,
        body: { form, radius: bodyRadius, points: [], visibleType: '', color: '' },
        x, y, px: x, py: y, angle: rng.range(-Math.PI, Math.PI), prevAngle: 0,
        vitals: { health: 100, hunger: isPlayer ? 84 : rng.range(54, 96), thirst: isPlayer ? 78 : rng.range(50, 96), stamina: 100 },
        ai: isPlayer ? null : { intent: 'wander', activity: 'idle', path: [], pathIndex: 0, targetId: null,
            wait: rng.range(.2, 3), think: rng.range(1, 3), stuck: 0, homeX: x, homeY: y },
        runtime: { resting: false, moving: false, sprinting: false, exhausted: false, sprintRecovery: 0 } };
    Object.defineProperty(c, 'legacySignature', { value: hash(JSON.stringify({id,genome:legacyGenome,form,age:c.actual.life.ageYears})) });
    c.prevAngle = c.angle;
    if (form === 'line') {
        c.body.visibleType = 'Line-form citizen';
        c.body.color = '#d5b1b7';
        c.body.points = [[-16, -1.8], [16, -1.8], [16, 1.8], [-16, 1.8]];
    }
    else if (g.sideCount === 3) {
        const r = bodyRadius;
        if (g.geometryStage === 'irregular') {
            c.body.visibleType = 'Irregular triangle';
            c.body.color = '#c9af93';
            const progress = clamp((g.regularity - .44) / .28, 0, 1);
            c.body.points = [[r, 0], [-r * lerp(.70,.65,progress), r * lerp(.53,.7,progress)], [-r * lerp(.36,.65,progress), -r * lerp(.81,.7,progress)]];
        }
        else if (g.geometryStage === 'isosceles') {
            c.body.visibleType = 'Isosceles triangle';
            c.body.color = '#a4bbc8';
            const w = lerp(.65, .22, g.sharpness);
            c.body.points = [[r, 0], [-r * .85, r * w], [-r * .85, -r * w]];
        }
        else {
            c.body.visibleType = 'Equilateral triangle';
            c.body.color = '#b8c7ba';
            c.body.points = regularPoints(3, r);
        }
    }
    else {
        c.body.visibleType = ({ 4: 'Square', 5: 'Pentagon', 6: 'Hexagon', 7: 'Heptagon', 8: 'Octagon' })[g.sideCount] || (g.sideCount >= 16 ? 'Near-circle' : g.sideCount + '-sided polygon');
        c.body.color = g.sideCount >= 10 ? '#d5c39a' : g.sideCount >= 5 ? '#bbcbb4' : '#b4c5c5';
        c.body.points = regularPoints(g.sideCount, bodyRadius).map(([x,y],i)=>[x*g.vertexProportions[i],y*g.vertexProportions[i]]);
        if (g.geometryStage === 'irregularPolygon') c.body.visibleType = `Irregular ${g.sideCount}-sided polygon`; 
    }
    if (isPlayer)
        c.body.color = '#f1a38b';
    return c;
}
// Return an intentionally small observation DTO. UI cannot accidentally enumerate
// actual identity, private genome, reputation, unverified claims, or lineage.
function observeCitizen(c) {
    const visible = { form: c.body.visibleType, activity: c.ai?.activity || 'idle',
        size: visualRadius(c) > 20 ? 'A large outline' : visualRadius(c) < 16 ? 'A small outline' : 'A medium-sized outline' };
    visible.apparentClass = apparentStanding(c).label;
    c.playerKnowledge.observed = { ...visible };
    return visible;
}
// ─────────────────────────────────────────────────────────────────────────────
// 03. Terrain, collision and pathfinding. A* uses a conservative clearance grid;
// diagonal corner cutting is forbidden. Actual movement also checks geometry.
// ─────────────────────────────────────────────────────────────────────────────
