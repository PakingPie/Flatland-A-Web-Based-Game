// Decode into a fully validated candidate only. This boundary has no storage,
// UI, active game, clocks or installation side effects.
class SaveCodec {
    static parse(raw) {
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
    static decode(raw) {
        const envelope = this.parse(raw), s = envelope.payload;
        insist(shortText(s.seed, 48) && s.seed.trim().length > 0 && shortText(s.runId, 100) && s.runId.length > 0, 'Invalid seed or expedition ID.');
        insist(numberIn(s.elapsed, 0, 1e10) && integerIn(s.rngState, 0, 4294967295) && typeof s.ended === 'boolean', 'Invalid simulation time or random state.');
        const w = new World(s.seed); // Candidate only. Failed validation never touches the live world.
        w.elapsed = s.elapsed;
        migrateSavePopulation(w, s, envelope.version);
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
        migrateSaveSystems(w, s, envelope.version);
        w.rng.state = s.rngState;
        return { world: w, saved: s, envelope };
    }
}
