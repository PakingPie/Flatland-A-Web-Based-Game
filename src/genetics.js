// Pure seeded inheritance. Social class has no role in physical fitness.
const GENETICS = Object.freeze({ cohort: [[2, .65], [3, .30], [4, .05]], maternalExpression: .32,
    maxSides: 32, improvement: .65, sideGain: .28 });
function normalizeGenome(input = {}) {
    const g = { sideCount: 3, regularity: .5, sharpness: .6, size: 1, mobility: 1, metabolism: 1, mutationTendency: .035, ...input };
    g.geometryStage ||= g.sideCount > 3 ? (g.regularity >= .99 ? 'regular' : 'irregularPolygon') : g.regularity < .72 ? 'irregular' : g.sharpness > .72 ? 'isosceles' : 'regular';
    g.latentIrregularAncestry ??= g.geometryStage !== 'regular';
    g.vertexProportions ||= Array.from({length:g.sideCount}, (_, i) => g.geometryStage === 'irregular' || g.geometryStage === 'irregularPolygon' ? 1 - (1-g.regularity) * (i % 2 ? .4 : i % 3 ? .23 : 0) : 1);
    g.motherId ??= null; g.fatherId ??= null; g.generation ??= 1;
    return g;
}
function inheritGenome(anchor, father, mother, rng, parentIds, generation) {
    const base = normalizeGenome(anchor), f = normalizeGenome(father), m = normalizeGenome(mother);
    let sideCount = base.sideCount, geometryStage = base.geometryStage, regularity = base.regularity, sharpness = base.sharpness;
    const tendency = (f.mutationTendency + m.mutationTendency) / 2;
    if (rng.next() < GENETICS.improvement) {
        if (geometryStage === 'irregular') {
            regularity = Math.min(.85, regularity + rng.range(.10, .21));
            if (regularity >= .72) { geometryStage = 'isosceles'; sharpness = .94; regularity = .85; }
        } else if (geometryStage === 'isosceles') {
            sharpness = Math.max(.55, sharpness - rng.range(.10, .18));
            if (sharpness <= .72) { geometryStage = 'regular'; regularity = 1; sharpness = .55; }
        } else if (geometryStage === 'irregularPolygon') {
            regularity = Math.min(1, regularity + rng.range(.10, .20));
            if (regularity >= .99) { geometryStage = 'regular'; regularity = 1; }
        } else if (rng.next() < GENETICS.sideGain + tendency && sideCount < GENETICS.maxSides) sideCount++;
    }
    // A carrier can be phenotypically regular. Expression is maternal in this rule
    // set; the latent allele can be inherited from either parent by either sex.
    const latentIrregularAncestry = (f.latentIrregularAncestry || m.latentIrregularAncestry) && rng.next() < .72;
    if (m.latentIrregularAncestry && rng.next() < GENETICS.maternalExpression && geometryStage === 'regular') {
        geometryStage = sideCount === 3 ? 'irregular' : 'irregularPolygon'; regularity = rng.range(.45, .66); sharpness = rng.range(.6, .85);
    }
    const blend = key => clamp((f[key] + m[key]) / 2 + rng.range(-.065, .065), .75, 1.28);
    return normalizeGenome({ sideCount, geometryStage, regularity, sharpness,
        size: blend('size'), mobility: blend('mobility'), metabolism: blend('metabolism'),
        mutationTendency: clamp(tendency + rng.range(-.008,.008),.01,.09),
        latentIrregularAncestry: latentIrregularAncestry || geometryStage !== 'regular',
        motherId: parentIds.motherId, fatherId: parentIds.fatherId, generation });
}
function birthCohortSize(rng) { let n = rng.next(); for (const [size, probability] of GENETICS.cohort) { n -= probability; if (n < 0) return size; } return 4; }
function validateGenome(g) {
    insist(plain(g) && integerIn(g.sideCount,3,GENETICS.maxSides) && ['irregular','isosceles','regular','irregularPolygon'].includes(g.geometryStage), 'Invalid genome stage.');
    insist(numberIn(g.regularity,.1,1) && numberIn(g.sharpness,0,1) && ['size','mobility','metabolism'].every(k=>numberIn(g[k],.75,1.3)) && numberIn(g.mutationTendency,.001,.1) && typeof g.latentIrregularAncestry === 'boolean', 'Invalid hereditary traits.');
    insist(Array.isArray(g.vertexProportions) && g.vertexProportions.length === g.sideCount && g.vertexProportions.every(v=>numberIn(v,.6,1)), 'Invalid vertex proportions.');
    insist(g.sideCount === 3 ? g.geometryStage !== 'irregularPolygon' : ['regular','irregularPolygon'].includes(g.geometryStage), 'Geometry stage disagrees with side count.');
    insist(g.geometryStage !== 'regular' || (g.regularity === 1 && g.vertexProportions.every(v=>v===1) && (g.sideCount!==3 || g.sharpness<=.72)), 'Regular genome is inconsistent.');
    insist(g.geometryStage !== 'irregular' || g.regularity < .72, 'Irregular triangle skipped its stage.');
    insist(g.geometryStage !== 'isosceles' || (g.regularity>=.72 && g.sharpness>.72 && g.vertexProportions.every(v=>v===1)), 'Invalid isosceles triangle.');
    insist(integerIn(g.generation,1,1000) && [g.motherId,g.fatherId].every(id=>id===null || shortText(id,100)), 'Invalid genome lineage.');
}
