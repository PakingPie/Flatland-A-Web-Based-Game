class Renderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.canvas.getContext('2d', { alpha: false });
        if (!this.ctx)
            throw new Error('Canvas 2D is unavailable.');
        this.w = innerWidth;
        this.h = innerHeight;
        this.dpr = 1;
        this.camera = { x: 1728, y: 1308 };
        this.anchor = { x: innerWidth / 2, y: innerHeight / 2 };
        this.hudRects = [];
        this.layoutDirty = true;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        if (typeof ResizeObserver !== 'undefined') {
            this.layoutObserver = new ResizeObserver(() => { this.layoutDirty = true; });
            for (const el of document.querySelectorAll('.topbar,.vitals,.objectives,.map-panel,.bottom-center,#joystick,#citizenPanel')) this.layoutObserver.observe(el);
        }
    }
    resize() { const r = this.game.canvas.getBoundingClientRect(); this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.dpr = Math.min(devicePixelRatio || 1, 2); this.game.canvas.width = Math.round(this.w * this.dpr); this.game.canvas.height = Math.round(this.h * this.dpr); this.clampCamera(); }
    // Camera overhang is intentional: hard world clamps put the player beneath HUDs.
    // Select a stable clear screen anchor on layout changes, not every simulation step.
    measureLayout() {
        const blockers = [];
        if (!$('hud').hidden) for (const el of document.querySelectorAll('.topbar,.vitals,.objectives,.map-panel,.bottom-center,#joystick,#citizenPanel')) {
            const r = el.getBoundingClientRect();
            if (r.width && r.height && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden') blockers.push({ x: r.left, y: r.top, w: r.width, h: r.height });
        }
        const radius = 42, preferred = { x: this.w / 2, y: this.h * .5 };
        let best = preferred, bestScore = Infinity;
        const xs = [preferred.x], ys = [preferred.y];
        for (let x = radius; x <= this.w - radius; x += 20) xs.push(x);
        for (let y = radius; y <= this.h - radius; y += 20) ys.push(y);
        for (const x of xs) for (const y of ys) {
            let score = dist2(x, y, preferred.x, preferred.y);
            for (const r of blockers) if (circleRect(x, y, radius, r)) score += 1e8;
            if (score < bestScore) { bestScore = score; best = { x, y }; }
        }
        this.anchor = best; this.hudRects = blockers; this.layoutDirty = false;
    }
    clampCamera() { this.layoutDirty = true; } // Compatibility hook: no world-edge clamp.
    snap() {
        if (!this.game.world) return;
        this.measureLayout();
        const p = this.game.world.player;
        this.camera.x = p.x + this.w / 2 - this.anchor.x;
        this.camera.y = p.y + this.h / 2 - this.anchor.y;
    }
    screenToWorld(x, y) { return { x: x - this.w / 2 + this.camera.x, y: y - this.h / 2 + this.camera.y }; }
    worldToScreen(x, y) { return { x: x - this.camera.x + this.w / 2, y: y - this.camera.y + this.h / 2 }; }
    render(alpha, dt) {
        const ctx = this.ctx, world = this.game.world;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.fillStyle = '#101b21';
        ctx.fillRect(0, 0, this.w, this.h);
        if (!world)
            return;
        const p = world.player, px = lerp(p.px, p.x, alpha), py = lerp(p.py, p.y, alpha);
        const t = 1 - Math.exp(-dt * 10);
        if (this.layoutDirty) this.measureLayout();
        this.camera.x = lerp(this.camera.x, px + this.w / 2 - this.anchor.x, t);
        this.camera.y = lerp(this.camera.y, py + this.h / 2 - this.anchor.y, t);
        const ox = this.w / 2 - this.camera.x, oy = this.h / 2 - this.camera.y;
        ctx.save();
        ctx.translate(ox, oy);
        const view = { x: -ox - 100, y: -oy - 100, w: this.w + 200, h: this.h + 200 };
        const visible = (x, y, r = 0) => x + r > view.x && y + r > view.y && x - r < view.x + view.w && y - r < view.y + view.h;
        ctx.fillStyle = '#182a2d';
        ctx.fillRect(16, 16, C.W - 32, C.H - 32);
        for (const d of world.districts) {
            if (!rectOverlap(view, d))
                continue;
            ctx.globalAlpha = .48;
            ctx.fillStyle = d.color;
            ctx.fillRect(d.x, d.y, d.w, d.h);
        }
        ctx.globalAlpha = 1;
        for (const b of world.patches) {
            if (!visible(b.x, b.y, 90))
                continue;
            ctx.fillStyle = ['#2c413629', '#203a3b55', '#3f48402b'][b.tone];
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.rx, b.ry, b.angle, 0, TAU);
            ctx.fill();
        }
        // Restrained drafting grid and roads.
        ctx.strokeStyle = '#96bca108';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = Math.max(0, Math.floor(view.x / 64) * 64); x < Math.min(C.W, view.x + view.w); x += 64) {
            ctx.moveTo(x, Math.max(16, view.y));
            ctx.lineTo(x, Math.min(C.H - 16, view.y + view.h));
        }
        for (let y = Math.max(0, Math.floor(view.y / 64) * 64); y < Math.min(C.H, view.y + view.h); y += 64) {
            ctx.moveTo(Math.max(16, view.x), y);
            ctx.lineTo(Math.min(C.W - 16, view.x + view.w), y);
        }
        ctx.stroke();
        ctx.lineCap = 'round';
        for (const [a, b] of world.roads) {
            ctx.beginPath();
            ctx.moveTo(...a);
            ctx.lineTo(...b);
            ctx.lineWidth = 57;
            ctx.strokeStyle = '#45534b43';
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#9eb49a12';
            ctx.setLineDash([3, 12]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#64827750';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, C.W - 32, C.H - 32);
        for (const f of world.refuges) {
            if (!visible(f.x, f.y, f.r + 30))
                continue;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, TAU);
            ctx.fillStyle = '#a5d0a008';
            ctx.fill();
            ctx.strokeStyle = '#a6cfaa55';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 7]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.save();
            ctx.translate(f.x, f.y);
            polygon(ctx, [[0, -13], [13, 0], [0, 13], [-13, 0]]);
            ctx.fillStyle = '#263d36';
            ctx.fill();
            ctx.strokeStyle = '#b1d0a8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.lineTo(5, 0);
            ctx.moveTo(0, -5);
            ctx.lineTo(0, 5);
            ctx.stroke();
            ctx.restore();
            ctx.textAlign = 'center';
            ctx.font = '10px ui-sans-serif, system-ui';
            ctx.fillStyle = '#bed2b9';
            ctx.fillText(f.name.toUpperCase(), f.x, f.y - 30);
        }
        for (const o of world.obstacles) {
            if (o.kind === 'building') {
                if (rectOverlap(view, o))
                    this.building(ctx, o);
            }
            else if (visible(o.x, o.y, o.r + 8))
                this.nature(ctx, o);
        }
        const nearest = this.game.nearestResource();
        for (const r of world.resources)
            if (visible(r.x, r.y, 30))
                this.resource(ctx, r, world.elapsed, r === nearest);
        for (const c of world.npcs)
            if (visible(c.x, c.y, 40))
                this.citizen(ctx, c, alpha, world.elapsed, false);
        this.citizen(ctx, p, alpha, world.elapsed, true);
        // Day/night is atmospheric only in this phase; it never conceals vital UI.
        const phase = (world.elapsed % C.DAY) / C.DAY, night = Math.max(0, Math.sin((phase - .50) * TAU)) * .13;
        if (night > 0) {
            ctx.fillStyle = `rgba(6,13,28,${night})`;
            ctx.fillRect(Math.max(16, view.x), Math.max(16, view.y), view.w, view.h);
        }
        for (const f of this.game.effects) {
            ctx.globalAlpha = clamp(1 - f.age / 1.5, 0, 1);
            ctx.textAlign = 'center';
            ctx.font = '600 12px ui-sans-serif, system-ui';
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y - f.age * 22);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        if (p.vitals.health < 30) {
            ctx.strokeStyle = `rgba(241,163,139,${.18 + (30 - p.vitals.health) / 100})`;
            ctx.lineWidth = 6;
            ctx.strokeRect(3, 3, this.w - 6, this.h - 6);
        }
    }
    building(ctx, o) {
        const { x, y, w, h } = o;
        ctx.fillStyle = '#0f1e22';
        ctx.fillRect(x + 4, y + 5, w, h);
        ctx.fillStyle = o.type === 'ward' ? '#35423e' : o.type === 'workshop' ? '#2e3c40' : '#2b3e3b';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = o.type === 'ward' ? '#849077' : '#617871';
        ctx.lineWidth = 1.3;
        ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
        ctx.strokeStyle = '#8ca3922b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
        ctx.beginPath();
        ctx.moveTo(x + 11, y + 11);
        ctx.lineTo(x + w - 11, y + h - 11);
        ctx.moveTo(x + w - 11, y + 11);
        ctx.lineTo(x + 11, y + h - 11);
        ctx.stroke();
        ctx.fillStyle = '#708278';
        ctx.fillRect(x + w / 2 - 10, y + h - 3, 20, 3);
        ctx.fillStyle = '#a8b6a56b';
        ctx.textAlign = 'center';
        ctx.font = '9px ui-sans-serif, system-ui';
        ctx.fillText(o.type === 'ward' ? 'RESIDENCE' : o.type === 'workshop' ? 'WORKSHOP' : 'DWELLING', x + w / 2, y + h / 2 + 3);
    }
    nature(ctx, o) {
        ctx.save();
        ctx.translate(o.x, o.y);
        polygon(ctx, o.points);
        ctx.fillStyle = o.kind === 'tree' ? '#2c4b3e' : '#3e4b4b';
        ctx.fill();
        ctx.strokeStyle = o.kind === 'tree' ? '#64866b' : '#768583';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = o.kind === 'tree' ? '#6380667a' : '#91a09945';
        ctx.beginPath();
        if (o.kind === 'tree') {
            for (let i = 0; i < 3; i++) {
                ctx.moveTo(0, 0);
                ctx.lineTo(...o.points[i * 2]);
            }
        }
        else {
            ctx.moveTo(...o.points[1]);
            ctx.lineTo(-3, 3);
            ctx.lineTo(...o.points[3]);
        }
        ctx.stroke();
        ctx.restore();
    }
    resource(ctx, r, time, highlight) {
        ctx.save();
        ctx.translate(r.x, r.y);
        const active = r.quantity > 0;
        ctx.globalAlpha = active ? 1 : .28;
        if (highlight && active) {
            ctx.beginPath();
            ctx.arc(0, 0, 23 + Math.sin(time * 3) * 1.5, 0, TAU);
            ctx.strokeStyle = r.kind === 'food' ? '#b3d49d99' : '#92d7de99';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        if (r.kind === 'food') {
            polygon(ctx, [[-13, 5], [-8, -8], [2, -12], [12, -4], [11, 8], [-2, 12]]);
            ctx.fillStyle = '#35583e';
            ctx.fill();
            ctx.strokeStyle = '#7ca272';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#bdd298';
            for (let i = 0; i < (active ? r.quantity : 1); i++) {
                const x = [-5, 4, 0][i], y = [-2, -4, 5][i];
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, TAU);
                ctx.fill();
            }
        }
        else {
            ctx.beginPath();
            ctx.ellipse(0, 0, 15, 11, -.3, 0, TAU);
            ctx.fillStyle = '#244950';
            ctx.fill();
            ctx.strokeStyle = '#71aeb7';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 5 + Math.sin(time * 1.8 + r.phase), .2, Math.PI * 1.6);
            ctx.strokeStyle = '#a2d9dc';
            ctx.stroke();
        }
        ctx.restore();
    }
    citizen(ctx, c, alpha, time, isPlayer) {
        const x = lerp(c.px, c.x, alpha), y = lerp(c.py, c.y, alpha), a = moveAngle(c.prevAngle, c.angle, alpha);
        ctx.save();
        ctx.translate(x, y);
        if (isPlayer) {
            ctx.beginPath();
            ctx.arc(0, 0, c.body.radius + 8, 0, TAU);
            ctx.strokeStyle = c.runtime.resting ? '#a6cfaa80' : '#f1a38b35';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.font = '9px ui-sans-serif, system-ui';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#eac1ad';
            ctx.fillText(c.runtime.resting ? 'RESTING' : 'YOU', 0, -c.body.radius - 16);
        }
        ctx.save();
        ctx.rotate(a);
        polygon(ctx, c.body.points);
        ctx.fillStyle = isPlayer ? '#c57960' : c.body.form === 'line' ? '#bb929a' : '#293d3c';
        ctx.fill();
        ctx.strokeStyle = c.body.color;
        ctx.lineWidth = isPlayer ? 2 : 1.6;
        ctx.lineJoin = 'round';
        ctx.stroke();
        if (c.body.form === 'polygon' && c.body.points.length >= 4) {
            polygon(ctx, c.body.points.map(p => [p[0] * .68, p[1] * .68]));
            ctx.strokeStyle = c.body.color + '40';
            ctx.lineWidth = .8;
            ctx.stroke();
        }
        ctx.restore();
        if (!isPlayer && c.playerKnowledge.discoveredFacts.name && dist2(c.x, c.y, this.game.world.player.x, this.game.world.player.y) < 340 ** 2) {
            ctx.textAlign = 'center'; ctx.font = '9px ui-sans-serif, system-ui'; ctx.fillStyle = '#c8d4c3';
            ctx.fillText(c.playerKnowledge.discoveredFacts.name.value, 0, -c.body.radius - 10);
        }
        if (c.ai?.activity === 'gathering') {
            ctx.fillStyle = '#afcaaf';
            for (let i = 0; i < 3; i++) {
                ctx.globalAlpha = .4 + .6 * ((Math.sin(time * 5 + i) + 1) / 2);
                ctx.beginPath();
                ctx.arc(-5 + i * 5, -c.body.radius - 7, 1.4, 0, TAU);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        if (c.runtime.sprinting) {
            ctx.strokeStyle = '#e1b39966';
            ctx.lineWidth = 1;
            const dx = -Math.cos(a), dy = -Math.sin(a);
            ctx.beginPath();
            ctx.moveTo(dx * 28, dy * 28);
            ctx.lineTo(dx * 38, dy * 38);
            ctx.stroke();
        }
        ctx.restore();
    }
    map() {
        const world = this.game.world;
        if (!world)
            return;
        const c = $('minimap'), ctx = c.getContext('2d');
        ctx.setTransform(c.width / C.W, 0, 0, c.height / C.H, 0, 0);
        ctx.fillStyle = '#122328';
        ctx.fillRect(0, 0, C.W, C.H);
        for (const d of world.districts) {
            ctx.fillStyle = d.color;
            ctx.fillRect(d.x, d.y, d.w, d.h);
        }
        ctx.lineWidth = 24;
        ctx.strokeStyle = '#5c716759';
        for (const [a, b] of world.roads) {
            ctx.beginPath();
            ctx.moveTo(...a);
            ctx.lineTo(...b);
            ctx.stroke();
        }
        ctx.fillStyle = '#798f7860';
        for (const o of world.obstacles)
            if (o.kind === 'building')
                ctx.fillRect(o.x, o.y, o.w, o.h);
        for (const f of world.refuges) {
            ctx.save();
            ctx.translate(f.x, f.y);
            polygon(ctx, [[0, -52], [52, 0], [0, 52], [-52, 0]]);
            ctx.fillStyle = this.game.progress.visited.has(f.id) ? '#bdd6ad' : '#91aaa2';
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = '#b7c9b46a';
        for (const c of world.npcs) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 9, 0, TAU);
            ctx.fill();
        }
        const p = world.player;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        polygon(ctx, [[53, 0], [-35, 30], [-29, -33]]);
        ctx.fillStyle = '#ffb197';
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#d9e8d733';
        const left = clamp(this.camera.x - this.w / 2, 0, C.W), top = clamp(this.camera.y - this.h / 2, 0, C.H);
        ctx.strokeRect(left, top, clamp(this.camera.x + this.w / 2, 0, C.W) - left, clamp(this.camera.y + this.h / 2, 0, C.H) - top);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// 06. Game controller and Phase 1 survival loop.
// ─────────────────────────────────────────────────────────────────────────────
