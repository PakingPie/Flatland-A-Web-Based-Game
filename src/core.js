// ─────────────────────────────────────────────────────────────────────────────
// 01. Small utilities. No network, external assets, dependencies, or wall-clock RNG.
// All simulation coordinates are WORLD units. Canvas coordinates are CSS pixels;
// devicePixelRatio affects only the backing store. Simulation uses fixed steps.
// ─────────────────────────────────────────────────────────────────────────────
const C = Object.freeze({ W: 3456, H: 2304, CELL: 64, DT: 1 / 60, DAY: 120, NPCS: 64, PACK: 8,
    SPEED: 136, SPRINT: 1.65, GATHER_REACH: 58, GATHER_DELAY: .36, NAV_RADIUS: 27 });
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const hypot = Math.hypot;
const TAU = Math.PI * 2;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
} return h >>> 0; }
class RNG {
    constructor(seed) { this.state = typeof seed === 'number' ? seed >>> 0 : hash(seed); }
    next() { this.state = (this.state + 0x6D2B79F5) >>> 0; let t = this.state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return Math.floor(this.range(a, b + 1)); }
    pick(a) { return a[this.int(0, a.length - 1)]; }
}
function pointSegmentD2(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1); return dist2(px, py, ax + dx * t, ay + dy * t); }
function circleRect(x, y, r, o) { return dist2(x, y, clamp(x, o.x, o.x + o.w), clamp(y, o.y, o.y + o.h)) < r * r; }
function rectOverlap(a, b, pad = 0) { return a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad; }
function segmentRect(ax, ay, bx, by, r) { let lo = 0, hi = 1; for (const [a, d, mn, mx] of [[ax, bx - ax, r.x, r.x + r.w], [ay, by - ay, r.y, r.y + r.h]]) {
    if (Math.abs(d) < 1e-9) {
        if (a < mn || a > mx)
            return false;
    }
    else {
        let p = (mn - a) / d, q = (mx - a) / d;
        if (p > q)
            [p, q] = [q, p];
        lo = Math.max(lo, p);
        hi = Math.min(hi, q);
        if (lo > hi)
            return false;
    }
} return true; }
function polygon(ctx, points) { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
function regularPoints(n, r, angle = 0) { return Array.from({ length: n }, (_, i) => [Math.cos(angle + i * TAU / n) * r, Math.sin(angle + i * TAU / n) * r]); }
function moveAngle(a, b, t) { return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * clamp(t, 0, 1); }
// Spatial index for immutable world obstacles. Query results never depend on camera.
class SpatialHash {
    constructor(size = 128) { this.size = size; this.buckets = new Map(); }
    insert(o) { const b = o.kind === 'building' ? o : { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 }; for (let y = Math.floor(b.y / this.size); y <= Math.floor((b.y + b.h) / this.size); y++)
        for (let x = Math.floor(b.x / this.size); x <= Math.floor((b.x + b.w) / this.size); x++) {
            const key = x + ',' + y;
            if (!this.buckets.has(key))
                this.buckets.set(key, []);
            this.buckets.get(key).push(o);
        } }
    query(x, y, w, h) { const found = new Set(); for (let iy = Math.floor(y / this.size); iy <= Math.floor((y + h) / this.size); iy++)
        for (let ix = Math.floor(x / this.size); ix <= Math.floor((x + w) / this.size); ix++) {
            const bucket = this.buckets.get(ix + ',' + iy);
            if (bucket)
                for (const o of bucket)
                    found.add(o);
        } return found; }
}
class MinHeap {
    constructor() { this.a = []; }
    push(v) { const a = this.a; let i = a.length; a.push(v); while (i) {
        const p = (i - 1) >> 1;
        if (a[p].f <= v.f)
            break;
        a[i] = a[p];
        i = p;
    } a[i] = v; }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) {
        let i = 0;
        while (true) {
            let c = i * 2 + 1;
            if (c >= a.length)
                break;
            if (c + 1 < a.length && a[c + 1].f < a[c].f)
                c++;
            if (a[c].f >= last.f)
                break;
            a[i] = a[c];
            i = c;
        }
        a[i] = last;
    } return top; }
    get length() { return this.a.length; }
}
// ─────────────────────────────────────────────────────────────────────────────
// 02. Characters: three deliberately separate layers, plus runtime state.
// actual: authoritative identity, latent genome, lineage (never handed to HUD).
// publicIdentity: the persona/claims the world may present in future social play.
// playerKnowledge: only observations/discoveries; NOT a copy of the actual genome.
// A line-form woman has the same complete genome schema as a polygon-form man.
// No inference of her sideCount/ancestry is made by the Phase 1 inspection UI.
// ─────────────────────────────────────────────────────────────────────────────
