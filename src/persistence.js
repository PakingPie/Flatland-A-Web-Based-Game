// Versioned, transactional local saves. Immutable terrain and identities are seeded;
// every mutable simulation field is restored into a candidate World before install.
// The checksum detects accidental corruption; it is NOT an anti-cheat mechanism.
const SaveFormat = Object.freeze({ name: 'the-flatland', version: 4, worldVersion: 1,
    keys: { manual: 'flatland.manual.v1', auto: 'flatland.auto.v1' }, maxBytes: 2_000_000 });
const copyJSON = value => JSON.parse(JSON.stringify(value));
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
class SaveStore {
    constructor(game) {
        this.game = game;
        this.expected = {};
        this.lastAuto = 0;
        this.lastError = '';
        this.revision = 0;
        this.blocked = false;
        this.lastDuration = 0;
        for (const slot of ['manual', 'auto']) {
            try { this.expected[slot] = localStorage.getItem(SaveFormat.keys[slot]); }
            catch { this.expected[slot] = null; this.lastError = 'Browser storage unavailable. Play is still possible, but progress cannot be saved.'; }
        }
        window.addEventListener('pagehide', () => this.save('auto', true));
        window.addEventListener('storage', e => {
            if (Object.values(SaveFormat.keys).includes(e.key) && this.game.world) {
                this.blocked = true;
                this.report('Another tab changed a save. Load it or start a new expedition before saving again.', true);
                this.game.pause('A save changed in another tab. Autosaving is blocked to protect that progress.');
            }
        });
    }
    report(message, error = false) {
        const changedError = error && this.lastError !== message;
        this.lastError = error ? message : '';
        $('pauseBtn').textContent = error ? 'Pause !' : 'Pause';
        $('pauseBtn').title = error ? message : 'Pause, save and load';
        if (changedError && this.game.world && this.game.state === 'running') this.game.log('Saving needs attention. Open Pause for details.', true);
        for (const el of document.querySelectorAll('[data-save-status]')) {
            el.textContent = message;
            el.classList.toggle('save-error', error);
        }
    }
    capture() {
        const g = this.game, w = g.world;
        insist(w, 'No expedition to save.');
        return { runId: g.runId, seed: w.seed, elapsed: w.elapsed, rngState: w.rng.state, currentPlayerId: w.player.id,
            ended: !w.player.actual.life.alive, characters: [w.player, ...w.npcs].map(captureCharacter),
            resources: w.resources.map(r => ({ id: r.id, quantity: r.quantity, respawn: r.respawn })),
            pack: copyJSON(g.pack), progress: { gathered: g.progress.gathered, visited: [...g.progress.visited], complete: g.progress.complete },
            gatherCooldown: g.gatherCooldown, warningLatch: copyJSON(g.warningLatch), effects: copyJSON(g.effects), messages: copyJSON(g.messages),
            notice: { text: $('notice').textContent, until: g.noticeUntil, hidden: $('notice').hidden },
            family: w.family.exportState(), romance: w.romance.exportState(),
            social: w.social ? w.social.exportState() : null };
    }
    encode(slot = 'manual') {
        const payload = this.capture();
        return JSON.stringify({ format: SaveFormat.name, version: SaveFormat.version, worldVersion: SaveFormat.worldVersion,
            savedAt: Date.now(), revision: this.revision + 1, slot, checksum: hash(JSON.stringify(payload)), payload });
    }
    parse(raw) {
        insist(typeof raw === 'string' && raw.length > 0 && raw.length <= SaveFormat.maxBytes, 'Save is missing or too large.');
        let data;
        try { data = JSON.parse(raw); } catch { throw new Error('Save contains damaged JSON.'); }
        checkJSONTree(data);
        insist(plain(data) && data.format === SaveFormat.name, 'This is not a Flatland save.');
        insist([1, 2, 3, 4].includes(data.version), 'Save version is not supported by this build.');
        insist(data.worldVersion === SaveFormat.worldVersion, 'World generator version is incompatible.');
        insist(plain(data.payload) && data.checksum === hash(JSON.stringify(data.payload)), 'Save checksum does not match.');
        insist(numberIn(data.savedAt, 0, 1e15) && integerIn(data.revision, 0, 1e12), 'Invalid save timestamp.');
        return data;
    }
    decode(raw) {
        const envelope = this.parse(raw), s = envelope.payload;
        insist(shortText(s.seed, 48) && s.seed.trim().length > 0 && shortText(s.runId, 100) && s.runId.length > 0, 'Invalid seed or expedition ID.');
        insist(numberIn(s.elapsed, 0, 1e10) && integerIn(s.rngState, 0, 4294967295) && typeof s.ended === 'boolean', 'Invalid simulation time or random state.');
        const w = new World(s.seed); // Candidate only. Failed validation never touches the live world.
        w.elapsed = s.elapsed;
        if (envelope.version >= 4) restoreFamilyPopulation(w, s.characters, s.currentPlayerId ?? s.family?.playableIds?.at(-1));
        else {
            insist(Array.isArray(s.characters) && s.characters.length === w.npcs.length + 1, 'Saved population does not match.');
            const chars = [w.player, ...w.npcs];
            s.characters.forEach((c, i) => restoreCharacter(chars[i], c, w, true));
        }
        insist(s.ended === (w.player.vitals.health <= 0), 'Life state and health disagree.');
        w.player.actual.life.alive = !s.ended;
        insist(Array.isArray(s.resources) && s.resources.length === w.resources.length, 'Saved resource population does not match.');
        s.resources.forEach((r, i) => {
            const target = w.resources[i];
            insist(plain(r) && r.id === target.id && integerIn(r.quantity, 0, target.capacity) && numberIn(r.respawn, 0, target.cycle + .001), 'Invalid resource state.');
            insist(r.quantity === 0 || r.respawn === 0, 'Inconsistent resource regeneration timer.');
            target.quantity = r.quantity; target.respawn = r.respawn;
        });
        insist(plain(s.pack) && ['food', 'water'].every(k => integerIn(s.pack[k], 0, C.PACK)), 'Invalid inventory.');
        const p = s.progress;
        insist(plain(p) && integerIn(p.gathered, 0, 1e10) && Array.isArray(p.visited) && p.visited.length <= w.refuges.length && new Set(p.visited).size === p.visited.length && p.visited.every(id => w.refuges.some(f => f.id === id)) && typeof p.complete === 'boolean', 'Invalid expedition progress.');
        insist(!p.complete || (s.elapsed >= C.DAY * 3 && p.gathered >= 12 && p.visited.length >= 2), 'Inconsistent completed expedition.');
        insist(numberIn(s.gatherCooldown, 0, 2) && plain(s.warningLatch) && Object.entries(s.warningLatch).every(([k, v]) => ['hunger', 'thirst'].includes(k) && typeof v === 'boolean'), 'Invalid survival timers.');
        insist(Array.isArray(s.effects) && s.effects.length <= 100 && s.effects.every(e => plain(e) && shortText(e.text, 160) && /^#[a-f0-9]{6}$/i.test(e.color) && numberIn(e.x, 0, C.W) && numberIn(e.y, -100, C.H) && numberIn(e.age, 0, 2)), 'Invalid transient effects.');
        insist(Array.isArray(s.messages) && s.messages.length <= 4 && s.messages.every(m => plain(m) && shortText(m.text) && typeof m.warn === 'boolean' && numberIn(m.time, 0, s.elapsed + .01)), 'Invalid event log.');
        insist(plain(s.notice) && shortText(s.notice.text) && numberIn(s.notice.until, 0, s.elapsed + 100) && typeof s.notice.hidden === 'boolean', 'Invalid notice.');
        if (w.social) w.social.importState(s.social, envelope.version);
        else insist(s.social === null, 'Social save requires a newer build.');
        if (envelope.version >= 3) w.romance.importState(s.romance);
        if (envelope.version >= 4) w.family.importState(s.family);
        w.rng.state = s.rngState;
        return { world: w, saved: s, envelope };
    }
    candidates(slot = 'latest') {
        const found = [], failures = [];
        for (const name of slot === 'latest' ? ['manual', 'auto'] : [slot]) {
            try {
                const raw = localStorage.getItem(SaveFormat.keys[name]);
                if (!raw) continue;
                const data = this.parse(raw);
                found.push({ slot: name, raw, data });
            } catch (error) { failures.push(`${name}: ${error.message}`); }
        }
        found.sort((a, b) => b.data.savedAt - a.data.savedAt || b.data.revision - a.data.revision);
        return { found, failures };
    }
    refreshMenu() {
        const { found, failures } = this.candidates();
        $('continueBtn').disabled = !found.length;
        $('loadBtn').disabled = !this.candidates('manual').found.length;
        if (found.length) {
            const s = found[0].data.payload;
            this.report(`Continue “${s.seed}” · day ${Math.floor(s.elapsed / C.DAY) + 1}${s.ended ? ' · expedition ended' : ''}${failures.length ? ' · another save is unreadable' : ''}`);
        } else if (failures.length || this.lastError) this.report(failures.join('; ') || this.lastError, true);
        else this.report('No saved expedition yet. Autosaves every 30 seconds of play.');
    }
    save(slot = 'manual', silent = false) {
        if (!this.game.world || !['manual', 'auto'].includes(slot)) return false;
        if (this.blocked) return false;
        try {
            const key = SaveFormat.keys[slot], current = localStorage.getItem(key);
            insist(current === this.expected[slot], 'A save changed in another tab. Load it before saving again.');
            const begin = performance.now(), raw = this.encode(slot);
            insist(raw.length <= SaveFormat.maxBytes, 'Save exceeds the storage budget.');
            localStorage.setItem(key, raw); // One atomic replacement; manual and auto slots are independent.
            this.expected[slot] = raw;
            this.revision++;
            this.lastAuto = this.game.world.elapsed;
            this.lastDuration = performance.now() - begin;
            if (!silent || !this.lastError) this.report(`${slot === 'manual' ? 'Manual save' : 'Autosaved'} · day ${Math.floor(this.game.world.elapsed / C.DAY) + 1} · stored in this browser`);
            $('continueBtn').disabled = false;
            if (slot === 'manual') $('loadBtn').disabled = false;
            return true;
        } catch (error) {
            this.report(`Save failed: ${error.name === 'QuotaExceededError' ? 'browser storage is full' : error.message}. Existing saves were not replaced.`, true);
            return false;
        }
    }
    load(slot = 'latest') {
        const { found, failures } = this.candidates(slot);
        for (const entry of found) {
            try {
                const restored = this.decode(entry.raw);
                const expected = {};
                for (const name of ['manual', 'auto']) expected[name] = localStorage.getItem(SaveFormat.keys[name]);
                this.game.installSave(restored);
                this.expected = expected;
                this.revision = restored.envelope.revision;
                this.lastAuto = restored.world.elapsed;
                this.blocked = false;
                this.report(`${failures.length ? 'Recovered an older valid save. ' : ''}Loaded ${entry.slot} save · paused so you can get your bearings.${failures.length ? ' ' + failures.join('; ') : ''}`);
                return true;
            } catch (error) { failures.push(`${entry.slot}: ${error.message}`); }
        }
        this.report(failures.length ? `Load failed. Your current expedition is unchanged. ${failures.join('; ')}` : 'No save is available.', true);
        return false;
    }
    tick() {
        if (!this.game.world || this.game.state !== 'running') return;
        if (this.game.world.elapsed - this.lastAuto >= 30) {
            this.lastAuto = this.game.world.elapsed; // Rate-limit retries when storage is unavailable.
            this.save('auto', true);
        }
    }
    download() {
        try {
            const raw=this.encode(); insist(raw.length<=SaveFormat.maxBytes,'Save exceeds the export budget.');
            const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})), link=document.createElement('a');
            link.href=url; link.download=`flatland-${this.game.world.seed.replace(/[^a-z0-9_-]/gi,'-')}-generation-${this.game.world.player.actual.lineage.generation}.json`;
            link.click(); setTimeout(()=>URL.revokeObjectURL(url),5000);
            this.report('Exported a portable save file. Keep it somewhere safe.'); return true;
        } catch(error) { this.report(`Export failed: ${error.message}`,true); return false; }
    }
    importRaw(raw, ask=true) {
        try {
            const restored=this.decode(raw); // Validate everything before touching active progress or storage.
            if(ask && this.game.world && !confirm('Import this validated expedition? Unsaved active progress will be replaced. Your browser save slots are kept until you explicitly save.')) return false;
            const expected={}; for(const slot of ['manual','auto']) expected[slot]=localStorage.getItem(SaveFormat.keys[slot]);
            this.game.installSave(restored); this.expected=expected; this.revision=restored.envelope.revision; this.lastAuto=restored.world.elapsed; this.blocked=false;
            this.report('Imported and paused. Existing browser slots are unchanged; save when you are ready.'); return true;
        } catch(error) { this.report(`Import failed. Active progress and saved slots are unchanged. ${error.message}`,true); return false; }
    }
    newRun() {
        this.blocked = false; this.lastAuto = 0; this.revision = 0;
        for (const name of ['manual', 'auto']) {
            try { this.expected[name] = localStorage.getItem(SaveFormat.keys[name]); } catch { /* handled on write */ }
        }
    }
}
