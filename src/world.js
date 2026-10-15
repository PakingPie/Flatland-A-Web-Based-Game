class World {
    constructor(seed) {
        this.seed = seed;
        this.rng = new RNG(seed);
        this.elapsed = 0;
        this.obstacles = [];
        this.resources = [];
        this.npcs = [];
        this.patches = [];
        this.index = new SpatialHash();
        this.refuges = [{ id: 'refuge-common', x: 1728, y: 1280, r: 96, name: 'Common refuge' }, { id: 'refuge-west', x: 576, y: 1600, r: 96, name: 'West hollow' }, { id: 'refuge-court', x: 2784, y: 576, r: 96, name: 'Quiet court' }];
        this.roads = [[[192, 1152], [3264, 1152]], [[1728, 160], [1728, 2144]], [[576, 192], [576, 1984]], [[576, 1600], [1728, 1600]], [[1728, 576], [3040, 576]], [[2784, 320], [2784, 1664]], [[1728, 1920], [3072, 1920]]];
        this.districts = [{ x: 128, y: 128, w: 1250, h: 840, name: 'THE ORCHARD', color: '#29433b' },
            { x: 128, y: 1312, w: 1216, h: 800, name: 'LOWER COMMONS', color: '#283f3b' },
            { x: 1920, y: 128, w: 1408, h: 880, name: 'UPPER WARD', color: '#3b4038' },
            { x: 1920, y: 1312, w: 1408, h: 800, name: 'WORKERS’ YARD', color: '#373e40' }];
        this.generateTerrain();
        this.nav = new Navigation(this);
        this.generateResources();
        this.player = createCharacter('founder-000', { sideCount: 3, regularity: .44, sharpness: .61, size: 1.15, mobility: 1, metabolism: 1 }, 'polygon', 1728, 1308, this.rng, true);
        this.player.angle = -.8;
        this.player.prevAngle = -.8;
        this.generateCitizens();
        this.social = new SocialSystem(this);
        this.romance = new RomanceSystem(this);
        this.family = new FamilySystem(this);
        this.conversationId = null;
    }
    addObstacle(o) { o.id = 'obstacle-' + this.obstacles.length; this.obstacles.push(o); this.index.insert(o); }
    circleClear(x, y, r) {
        if (x < r + 16 || y < r + 16 || x > C.W - r - 16 || y > C.H - r - 16)
            return false;
        for (const o of this.index.query(x - r, y - r, r * 2, r * 2)) {
            if (o.kind === 'building' ? circleRect(x, y, r, o) : dist2(x, y, o.x, o.y) < (r + o.r) ** 2)
                return false;
        }
        return true;
    }
    segmentClear(ax, ay, bx, by, r) {
        if (!this.circleClear(ax, ay, r) || !this.circleClear(bx, by, r))
            return false;
        const minX = Math.min(ax, bx) - r, minY = Math.min(ay, by) - r;
        for (const o of this.index.query(minX, minY, Math.abs(bx - ax) + r * 2, Math.abs(by - ay) + r * 2)) {
            if (o.kind === 'building') {
                if (segmentRect(ax, ay, bx, by, { x: o.x - r, y: o.y - r, w: o.w + 2 * r, h: o.h + 2 * r }))
                    return false;
            }
            else if (pointSegmentD2(o.x, o.y, ax, ay, bx, by) < (o.r + r) ** 2)
                return false;
        }
        return true;
    }
    nearRoad(x, y, pad) { return this.roads.some(([a, b]) => pointSegmentD2(x, y, ...a, ...b) < pad * pad); }
    generateTerrain() {
        const rng = this.rng;
        for (let i = 0; i < 175; i++) {
            this.patches.push({ x: rng.range(70, C.W - 70), y: rng.range(70, C.H - 70), rx: rng.range(20, 85), ry: rng.range(15, 60), angle: rng.range(0, TAU), tone: rng.int(0, 2) });
        }
        const regions = [{ x: 192, y: 1344, w: 1152, h: 704, n: 9, type: 'home' }, { x: 1952, y: 128, w: 1344, h: 832, n: 16, type: 'ward' }, { x: 1952, y: 1344, w: 1344, h: 768, n: 12, type: 'workshop' }, { x: 160, y: 128, w: 1120, h: 864, n: 5, type: 'home' }];
        for (const zone of regions) {
            let made = 0;
            for (let attempt = 0; attempt < 450 && made < zone.n; attempt++) {
                const w = rng.pick([128, 128, 192]), h = rng.pick([128, 128, 192]);
                const o = { kind: 'building', x: Math.round(rng.range(zone.x, zone.x + zone.w - w) / 64) * 64, y: Math.round(rng.range(zone.y, zone.y + zone.h - h) / 64) * 64, w, h, type: zone.type };
                if (this.obstacles.some(b => rectOverlap(o, b, 44)))
                    continue;
                if (this.roads.some(([a, b]) => segmentRect(...a, ...b, { x: o.x - 76, y: o.y - 76, w: w + 152, h: h + 152 })))
                    continue;
                if (this.refuges.some(f => circleRect(f.x, f.y, f.r + 44, o)))
                    continue;
                this.addObstacle(o);
                made++;
            }
        }
        for (let i = 0, tries = 0; i < 106 && tries < 1400; tries++) {
            const x = rng.range(100, C.W - 100), y = rng.range(100, C.H - 100), r = rng.range(18, 34);
            if (this.nearRoad(x, y, 76) || this.refuges.some(f => hypot(x - f.x, y - f.y) < f.r + r + 52) || !this.circleClear(x, y, r + 35))
                continue;
            const tree = x < 1480 ? rng.next() < .78 : rng.next() < .25;
            this.addObstacle({ kind: tree ? 'tree' : 'rock', x, y, r, angle: rng.range(0, TAU), points: regularPoints(tree ? 6 : rng.int(5, 7), r, rng.range(0, TAU)) });
            i++;
        }
    }
    resourceSpot(x, y) { return this.circleClear(x, y, 30) && this.nav.reachable[this.nav.index(x, y)] && this.segmentClear(x, y, this.nav.point(this.nav.index(x, y)).x, this.nav.point(this.nav.index(x, y)).y, C.NAV_RADIUS); }
    addResource(kind, x, y) { this.resources.push({ id: 'resource-' + this.resources.length, kind, x, y, capacity: 3, quantity: 3, respawn: 0, cycle: this.rng.range(kind === 'food' ? 80 : 55, kind === 'food' ? 125 : 90), phase: this.rng.range(0, TAU) }); }
    generateResources() {
        // Guaranteed, accessible supplies near the spawn; no overlap with the refuge icon.
        this.addResource('food', 1650, 1300);
        this.addResource('water', 1810, 1260);
        for (const [kind, count] of [['food', 116], ['water', 58]]) {
            let added = 0;
            for (let tries = 0; tries < 6000 && added < count; tries++) {
                let x = this.rng.range(96, C.W - 96), y = this.rng.range(96, C.H - 96);
                if (kind === 'food' && this.rng.next() < .44) {
                    x = this.rng.range(160, 1280);
                    y = this.rng.range(160, 2080);
                }
                if (!this.resourceSpot(x, y) || this.resources.some(r => dist2(x, y, r.x, r.y) < 52 ** 2) || this.refuges.some(f => dist2(x, y, f.x, f.y) < 43 ** 2))
                    continue;
                this.addResource(kind, x, y);
                added++;
            }
        }
    }
    generateCitizens() {
        const rng = this.rng;
        const types = [{ n: 3, r: .42, s: .6 }, { n: 3, r: .9, s: .94 }, { n: 3, r: 1, s: .55 }, { n: 4, r: 1, s: .5 }, { n: 5, r: 1, s: .4 }, { n: 6, r: 1, s: .4 }, { n: 8, r: 1, s: .3 }, { n: 20, r: 1, s: .2 }];
        for (let i = 0; i < C.NPCS; i++) {
            const t = types[i % types.length], form = (Math.floor(i / types.length) + i) % 4 === 1 ? 'line' : 'polygon';
            let spot = null;
            for (let attempt = 0; attempt < 120; attempt++) {
                const p = this.nav.point(rng.pick(this.nav.free));
                if (dist2(p.x, p.y, this.player.x, this.player.y) < 160 ** 2 || this.npcs.some(c => dist2(c.x, c.y, p.x, p.y) < 52 ** 2))
                    continue;
                spot = p;
                break;
            }
            if (!spot)
                continue;
            const g = { sideCount: t.n, regularity: t.r, sharpness: t.s, size: rng.range(.86, 1.23), mobility: rng.range(.82, 1.18), metabolism: rng.range(.86, 1.15), mutationTendency: rng.range(.015, .065) };
            this.npcs.push(createCharacter('citizen-' + String(i + 1).padStart(3, '0'), g, form, spot.x, spot.y, rng));
        }
        // A visible neighbor near the start makes the living-world premise immediate.
        const p = this.npcs[0];
        if (p && this.circleClear(1728, 1092, p.body.radius)) {
            p.x = p.px = 1728;
            p.y = p.py = 1092;
            p.ai.homeX = p.x;
            p.ai.homeY = p.y;
        }
    }
    move(c, dx, dy) {
        const r = c.body.radius;
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (r * .6)));
        dx /= steps;
        dy /= steps;
        for (let i = 0; i < steps; i++) {
            const nx = clamp(c.x + dx, r + 16, C.W - r - 16);
            if (this.circleClear(nx, c.y, r))
                c.x = nx;
            const ny = clamp(c.y + dy, r + 16, C.H - r - 16);
            if (this.circleClear(c.x, ny, r))
                c.y = ny;
        }
    }
    takeResource(r) { if (r.quantity <= 0)
        return false; r.quantity--; if (r.quantity === 0)
        r.respawn = r.cycle; return true; }
    refugeAt(x, y) { return this.refuges.find(f => dist2(x, y, f.x, f.y) < f.r * f.r) || null; }
    districtAt(x, y) { return this.districts.find(d => x > d.x && y > d.y && x < d.x + d.w && y < d.y + d.h)?.name || 'THE CROSSROADS'; }
    updateResources(dt) { for (const r of this.resources)
        if (r.quantity === 0) {
            r.respawn = Math.max(0, r.respawn - dt);
            if (r.respawn === 0)
                r.quantity = r.capacity;
        } }
    choosePlan(c, force = null) {
        const ai = c.ai, rng = this.rng;
        ai.path = [];
        ai.pathIndex = 0;
        ai.targetId = null;
        ai.stuck = 0;
        const intent = force || (c.vitals.thirst < 46 ? 'water' : c.vitals.hunger < 46 ? 'food' : rng.next() < .19 ? 'rest' : 'wander');
        ai.intent = intent;
        if (intent === 'food' || intent === 'water') {
            const choices = this.resources.filter(r => r.kind === intent && r.quantity > 0).sort((a, b) => dist2(c.x, c.y, a.x, a.y) - dist2(c.x, c.y, b.x, b.y));
            for (const r of choices.slice(0, 12)) {
                const path = this.nav.path(c.x, c.y, r.x, r.y);
                if (path) {
                    ai.path = path;
                    ai.targetId = r.id;
                    ai.activity = intent === 'food' ? 'seeking food' : 'seeking water';
                    break;
                }
            }
        }
        else if (intent === 'rest') {
            const choices = [...this.refuges].sort((a, b) => dist2(c.x, c.y, a.x, a.y) - dist2(c.x, c.y, b.x, b.y));
            for (const f of choices) {
                const a = rng.range(0, TAU), r = rng.range(15, 55), x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r;
                const path = this.nav.path(c.x, c.y, x, y);
                if (path) {
                    ai.path = path;
                    ai.targetId = f.id;
                    ai.activity = 'walking';
                    break;
                }
            }
        }
        else {
            for (let i = 0; i < 12; i++) {
                const p = this.nav.point(rng.pick(this.nav.free));
                if (i < 8 && dist2(c.x, c.y, p.x, p.y) > 800 ** 2)
                    continue;
                const path = this.nav.path(c.x, c.y, p.x, p.y);
                if (path) {
                    ai.path = path;
                    ai.activity = 'wandering';
                    break;
                }
            }
        }
        if (!ai.path.length) {
            ai.activity = 'idle';
            ai.wait = rng.range(1, 3);
        }
    }
    updateNPC(c, dt) {
        const ai = c.ai, v = c.vitals, m = c.actual.genome.metabolism;
        c.runtime.moving = false;
        // Phase 1 needs drive NPC behavior; NPC mortality/aging is deliberately deferred.
        v.hunger = clamp(v.hunger - .15 * m * dt, 0, 100);
        v.thirst = clamp(v.thirst - .23 * m * dt, 0, 100);
        // A nearby speaker briefly stays with you, but still needs supplies. Other NPCs remain autonomous.
        if (this.conversationId === c.id && v.hunger >= 17 && v.thirst >= 17 && this.social.nearby(c)) return;
        ai.think -= dt;
        if (ai.think <= 0) {
            ai.think = this.rng.range(2, 4);
            if (v.thirst < 27 && ai.intent !== 'water')
                this.choosePlan(c, 'water');
            else if (v.hunger < 27 && ai.intent !== 'food' && v.thirst > 35)
                this.choosePlan(c, 'food');
        }
        if (ai.targetId?.startsWith('resource-')) {
            const r = this.resources[Number(ai.targetId.slice(9))];
            if (!r || r.quantity <= 0) {
                ai.path = [];
                ai.targetId = null;
                ai.activity = 'idle';
                ai.wait = .2;
            }
        }
        if (ai.pathIndex < ai.path.length) {
            const target = ai.path[ai.pathIndex], dx = target.x - c.x, dy = target.y - c.y, d = hypot(dx, dy);
            const speed = 67 * c.actual.genome.mobility;
            if (d < 5) {
                ai.pathIndex++;
                ai.stuck = 0;
            }
            else {
                const oldX = c.x, oldY = c.y, step = Math.min(d, speed * dt);
                this.move(c, dx / d * step, dy / d * step);
                c.angle = moveAngle(c.angle, Math.atan2(dy, dx), dt * 7);
                c.runtime.moving = true;
                if (hypot(c.x - oldX, c.y - oldY) < step * .18)
                    ai.stuck += dt;
                else
                    ai.stuck = Math.max(0, ai.stuck - dt * .5);
                if (ai.stuck > 1.6) {
                    ai.path = [];
                    ai.pathIndex = 0;
                    ai.targetId = null;
                    ai.activity = 'idle';
                    ai.wait = .4;
                    ai.stuck = 0;
                }
            }
            if (ai.pathIndex >= ai.path.length) {
                ai.path = [];
                ai.pathIndex = 0;
                if (ai.intent === 'food' || ai.intent === 'water') {
                    ai.activity = 'gathering';
                    ai.wait = 1.5;
                }
                else if (ai.intent === 'rest') {
                    ai.activity = 'resting';
                    ai.wait = this.rng.range(5, 13);
                }
                else {
                    ai.activity = 'idle';
                    ai.wait = this.rng.range(1, 5);
                }
            }
        }
        else {
            ai.wait -= dt;
            if (ai.wait <= 0) {
                if (ai.activity === 'gathering' && ai.targetId) {
                    const r = this.resources[Number(ai.targetId.slice(9))];
                    if (r && dist2(c.x, c.y, r.x, r.y) < 46 ** 2 && this.takeResource(r)) {
                        const key = r.kind === 'food' ? 'hunger' : 'thirst';
                        v[key] = clamp(v[key] + 45, 0, 100);
                    }
                }
                this.choosePlan(c);
            }
        }
    }
    separateCitizens() {
        const chars = this.npcs;
        for (let i = 0; i < chars.length; i++) {
            const a = chars[i];
            for (let j = i + 1; j < chars.length; j++) {
                const b = chars[j], min = (a.body.radius + b.body.radius) * .88, dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
                if (d2 >= min * min)
                    continue;
                const d = Math.sqrt(d2), nx = d ? dx / d : 1, ny = d ? dy / d : 0, push = Math.min(.7, (min - d) * .3);
                this.move(a, -nx * push, -ny * push);
                this.move(b, nx * push, ny * push);
            }
            const p = this.player, dx = a.x - p.x, dy = a.y - p.y, d = hypot(dx, dy), min = a.body.radius + p.body.radius + 3;
            if (d < min) {
                const push = Math.min(1.2, (min - d) * .3);
                this.move(a, (d ? dx / d : 1) * push, (d ? dy / d : 0) * push);
            }
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// 04. Input. Reset every input source on pause, blur, death, restart or cancellation.
// Modifier shortcuts and seed text editing retain normal browser behavior.
// ─────────────────────────────────────────────────────────────────────────────
