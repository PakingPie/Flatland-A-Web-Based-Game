// Browser storage and file I/O adapter. Candidate validation lives in SaveCodec.
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
            ended: !w.player.actual.life.alive, characters: w.registry.all().map(captureCharacter),
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
    parse(raw) { return SaveCodec.parse(raw); }
    decode(raw) { return SaveCodec.decode(raw); }
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
