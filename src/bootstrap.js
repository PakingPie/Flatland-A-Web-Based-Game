const game = new Game();
// ─────────────────────────────────────────────────────────────────────────────
// 07. Opt-in deterministic QA hooks. Absent unless the URL contains ?debug=1.
// This is a local client game, not a security boundary. UI discovery rules are
// separate from a developer's ability to inspect their own local JavaScript.
// ─────────────────────────────────────────────────────────────────────────────
if (new URLSearchParams(location.search).get('debug') === '1') {
    const clone = x => JSON.parse(JSON.stringify(x));
    window.FlatlandDebug = Object.freeze({
        start(seed = 'abbott-1884') { game.start(seed); },
        manual(value = true) { game.debugManual = !!value; game.accumulator = 0; },
        advance(seconds) { if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3600)
            throw new RangeError('Use 0–3600 seconds.'); for (let i = 0, n = Math.round(seconds / C.DT); i < n && game.state === 'running'; i++)
            game.step(C.DT); game.renderer.snap(); game.refreshUI(); return this.snapshot(); },
        snapshot() { const w = game.world; return w ? clone({ state: game.state, seed: w.seed, time: w.elapsed, rng: w.rng.state, player: w.player, pack: game.pack, progress: { gathered: game.progress.gathered, visited: [...game.progress.visited], complete: game.progress.complete }, npcs: w.npcs, resources: w.resources, obstacles: w.obstacles, refuges: w.refuges, camera: game.renderer.camera, viewport: { w: game.renderer.w, h: game.renderer.h, dpr: game.renderer.dpr }, keys: [...game.input.keys], holds: game.input.hold, touch: game.input.touch }) : { state: game.state }; },
        teleport(x, y) { const p = game.world.player; if (!Number.isFinite(x) || !Number.isFinite(y) || !game.world.circleClear(x, y, p.body.radius))
            throw new Error('Teleport destination is blocked.'); p.x = p.px = x; p.y = p.py = y; game.renderer.snap(); game.refreshUI(); },
        vitals(values) { for (const k of ['health', 'hunger', 'thirst', 'stamina'])
            if (Object.hasOwn(values, k)) {
                if (!Number.isFinite(values[k]))
                    throw new TypeError('Non-finite vital');
                game.world.player.vitals[k] = clamp(values[k], 0, 100);
            } game.refreshUI(); },
        setResource(id, quantity) { const r = game.world.resources.find(r => r.id === id); if (!r)
            throw new Error('Unknown resource'); r.quantity = clamp(Math.floor(quantity), 0, r.capacity); r.respawn = r.quantity === 0 ? r.cycle : 0; },
        pause() { game.pause(); }, resume() { game.resume(); },
        worldToScreen(x, y) { return game.renderer.worldToScreen(x, y); }, screenToWorld(x, y) { return game.renderer.screenToWorld(x, y); },
        path(ax, ay, bx, by) { return game.world.nav.path(ax, ay, bx, by); },
        validate() {
            const w = game.world, errors = [];
            if (!w)
                return ['No world'];
            for (const c of [w.player, ...w.npcs]) {
                if (!Number.isFinite(c.x) || !Number.isFinite(c.y))
                    errors.push('Non-finite actor ' + c.id);
                if (!w.circleClear(c.x, c.y, c.body.radius - .01))
                    errors.push('Actor overlaps terrain ' + c.id);
                for (const v of Object.values(c.vitals))
                    if (!Number.isFinite(v) || v < 0 || v > 100)
                        errors.push('Invalid vital ' + c.id);
            }
            for (const r of w.resources) {
                if (r.quantity < 0 || r.quantity > r.capacity)
                    errors.push('Resource quantity ' + r.id);
                if (!w.resourceSpot(r.x, r.y))
                    errors.push('Unreachable resource ' + r.id);
            }
            return errors;
        },
        save(slot = 'manual') { return game.saves.save(slot); },
        load(slot = 'latest') { return game.saves.load(slot); },
        exportSave() { return game.saves.encode(); },
        validateSave(raw) { try { game.saves.decode(raw); return []; } catch (error) { return [error.message]; } },
        saveStatus() { return { error: game.saves.lastError, duration: game.saves.lastDuration, bytes: game.saves.encode().length, keys: SaveFormat.keys }; },
        cameraLayout() { game.renderer.measureLayout(); return copyJSON({ anchor: game.renderer.anchor, blockers: game.renderer.hudRects }); },
        npcVitals(id, values) { const c = game.world.social.citizen(id); if (!c) throw new Error('Unknown citizen'); for (const k of ['health','hunger','thirst','stamina']) if (Object.hasOwn(values,k)) { if (!Number.isFinite(values[k])) throw new TypeError('Non-finite vital'); c.vitals[k] = clamp(values[k],0,100); } },
        socialView(id) { const c = game.world.social.citizen(id); if (!c) throw new Error('Unknown citizen'); return game.world.social.view(c); },
        interact(id, topic) { return game.world.social.interact(id, topic); },
        openCitizen(id) { game.socialUI.open(id); }, closeCitizen() { game.socialUI.close(); },
        socialState() { return game.world.social.exportState(); },
        config: C
    });
}
