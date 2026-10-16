class Game {
    constructor() {
        this.canvas = $('world');
        this.state = 'menu';
        this.world = null;
        this.pack = { food: 1, water: 1 };
        this.effects = [];
        this.messages = [];
        this.progress = { gathered: 0, visited: new Set(), complete: false };
        this.gatherCooldown = 0;
        this.warningLatch = {};
        this.uiClock = 0;
        this.mapClock = 0;
        this.noticeUntil = 0;
        this.accumulator = 0;
        this.lastTime = null;
        this.debugManual = false;
        this.renderer = new Renderer(this);
        this.input = new Input(this);
        this.saves = new SaveStore(this);
        this.bindUI();
        this.socialUI = new SocialUI(this);
        this.familyUI = new FamilyUI(this);
        this.inspector = new InformationInspector(this);
        this.spar = new Sparring(this);
        this.setScreen('menu');
        this.saves.refreshMenu();
        requestAnimationFrame(t => this.frame(t));
    }
    bindUI() {
        const bind = (id, fn) => $(id).addEventListener('click', () => { fn(); if (this.state === 'running')
            this.canvas.focus({ preventScroll: true }); });
        bind('startBtn', () => this.requestNew($('seedInput').value));
        bind('continueBtn', () => this.requestLoad('latest'));
        bind('saveBtn', () => this.saves.save('manual'));
        bind('loadBtn', () => this.requestLoad('manual'));
        bind('exportSaveBtn', () => this.saves.download());
        for(const id of ['importSaveBtn','startImportBtn']) bind(id, () => $('saveFileInput').click());
        $('saveFileInput').addEventListener('change', async e => {
            const file=e.target.files[0]; e.target.value=''; if(!file) return;
            if(file.size>SaveFormat.maxBytes) { this.saves.report('Import rejected: save file is too large.',true); return; }
            try { this.saves.importRaw(await file.text()); } catch(error) { this.saves.report(`Import failed: ${error.message}`,true); }
        });
        bind('newSeedBtn', () => { this.setScreen('menu'); this.saves.refreshMenu(); });
        bind('pauseBtn', () => this.pause());
        bind('helpBtn', () => this.showHelp());
        bind('resumeBtn', () => this.resume());
        bind('pauseHelpBtn', () => this.showHelp());
        bind('closeHelpBtn', () => this.closeHelp());
        bind('restartBtn', () => this.requestNew(this.world.seed));
        bind('retryBtn', () => this.requestNew(this.world.seed));
        bind('menuBtn', () => { this.input.clear(); this.setScreen('menu'); this.saves.refreshMenu(); });
        bind('eatBtn', () => this.consume('food'));
        bind('drinkBtn', () => this.consume('water'));
        bind('restBtn', () => this.toggleRest());
        bind('cancelApproachBtn', () => this.socialUI.controller?.cancel());
        bind('strikeBtn', () => this.spar.requestStrike());
        bind('endSparBtn', () => this.spar.end());
        bind('renewalToggleBtn',()=>{
            if(this.state!=='paused' || !this.world.player.actual.life.alive) return;
            this.world.renewal.setEnabled(!this.world.renewal.enabled);
            this.saves.save('auto',true);this.refreshUI();
        });
    }
    setScreen(state) {
        if(this.state==='inspect' && state!=='inspect') this.inspector.clear();
        if (state !== 'running') this.socialUI?.reset();
        this.state = state;
        const mapping = { menu: 'startScreen', paused: 'pauseScreen', help: 'helpScreen', dead: 'deathScreen', family: 'familyScreen', inspect:'inspectorScreen' };
        for (const id of Object.values(mapping))
            $(id).hidden = mapping[state] !== id;
        $('hud').hidden = state === 'menu';
        $('tooltip').hidden = true;
        this.renderer.layoutDirty = true;
        $('hud').inert = state !== 'running';
        if (state !== 'running') {
            this.input?.clear();
            this.accumulator = 0;
            const first = state === 'menu' ? $('startBtn') : state === 'paused' ? $('resumeBtn') : state === 'help' ? $('closeHelpBtn') : state === 'family' ? $('familySaveBtn') : state==='inspect' ? $('closeInspectorBtn') : $('retryBtn');
            first?.focus({ preventScroll: true });
        }
    }
    requestNew(seed) {
        const hasProgress = !!this.world || this.saves.candidates().found.length > 0;
        if (hasProgress && !confirm('Start a new expedition? This replaces the autosave, but keeps your separate manual save.')) return;
        this.start(seed);
        this.saves.save('auto', true);
    }
    requestLoad(slot) {
        if (this.world && this.state !== 'menu' && !confirm('Load saved progress? Unsaved changes in this expedition will be discarded.')) return;
        this.saves.load(slot);
    }
    installSave({ world, saved }) {
        this.spar?.end('');
        this.socialUI?.reset();
        this.input.clear();
        this.world = world; this.runId = saved.runId;
        world.captureForValidation=()=>this.saves.capture();
        this.pack = copyJSON(saved.pack);
        this.progress = { ...saved.progress, visited: new Set(saved.progress.visited) };
        this.gatherCooldown = saved.gatherCooldown; this.warningLatch = copyJSON(saved.warningLatch);
        this.effects = copyJSON(saved.effects); this.messages = copyJSON(saved.messages);
        this.noticeUntil = saved.notice.until;
        $('notice').textContent = saved.notice.text; $('notice').hidden = saved.notice.hidden;
        $('seedInput').value = world.seed;
        this.accumulator = this.uiClock = this.mapClock = 0; this.lastTime = null;
        if (saved.ended) this.die(false);
        else { $('pauseReason').textContent = 'Saved progress restored. Resume when you are ready.'; this.setScreen('paused'); }
        this.refreshUI(); this.renderer.snap(); this.renderer.map();
    }
    start(seed) {
        this.spar?.end('');
        seed = String(seed || 'abbott-1884').trim().slice(0, 48) || 'abbott-1884';
        this.socialUI?.reset();
        this.input.clear();
        this.world = new World(seed);
        this.world.captureForValidation=()=>this.saves.capture();
        this.runId = `${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        this.saves.newRun();
        this.pack = { food: 1, water: 1 };
        this.effects = [];
        this.messages = [];
        this.progress = { gathered: 0, visited: new Set(), complete: false };
        this.gatherCooldown = 0;
        this.warningLatch = {};
        this.accumulator = 0;
        this.uiClock = 0;
        this.mapClock = 0;
        this.noticeUntil = 0;
        $('notice').hidden = true;
        this.world.renewal.setEnabled(true);
        $('seedInput').value = seed;
        this.setScreen('running');
        this.renderer.snap();
        this.canvas.focus({ preventScroll: true });
        this.log('Green: food · Blue: water');
        this.refreshUI();
        this.renderer.snap();
        this.renderer.map();
    }
    pause(reason = 'Take a breath. Nothing advances while paused.') { if (this.state !== 'running')
        return; $('pauseReason').textContent = reason; this.setScreen('paused'); this.saves.save('auto', true); }
    resume() { if (this.state !== 'paused')
        return; this.input.clear(); this.accumulator = 0; this.setScreen('running'); this.canvas.focus({ preventScroll: true }); }
    showHelp() { if (!['running', 'paused'].includes(this.state))
        return; this.helpReturn = this.state; this.setScreen('help'); this.saves.save('auto', true); }
    closeHelp() { if (this.state !== 'help')
        return; this.setScreen(this.helpReturn === 'paused' ? 'paused' : 'running'); if (this.state === 'running')
        this.canvas.focus({ preventScroll: true }); }
    log(text, warn = false) { this.messages.push({ text, warn, time: this.world?.elapsed || 0 }); this.messages = this.messages.slice(-4); this.renderLog(); }
    renderLog() { const log = $('log'); log.replaceChildren(); for (const m of this.messages) {
        if (this.world && this.world.elapsed - m.time > 17)
            continue;
        const e = document.createElement('div');
        e.textContent = m.text;
        if (m.warn)
            e.className = 'warn';
        log.appendChild(e);
    } }
    notify(text) { $('notice').textContent = text; $('notice').hidden = false; this.noticeUntil = this.world.elapsed + 8; }
    nearestResource() { if (!this.world)
        return null; const p = this.world.player; let best = null, bestD = Infinity; for (const r of this.world.resources) {
        if (!r.quantity)
            continue;
        const d = dist2(p.x, p.y, r.x, r.y);
        if (d > C.GATHER_REACH ** 2 || !this.world.segmentClear(p.x, p.y, r.x, r.y, 3))
            continue;
        const penalty = this.pack[r.kind] >= C.PACK ? 100000 : 0;
        if (d + penalty < bestD) {
            bestD = d + penalty;
            best = r;
        }
    } return best; }
    gather() {
        if (this.state !== 'running' || this.gatherCooldown > 0)
            return;
        const r = this.nearestResource();
        if (!r)
            return;
        this.spar.end();
        if (this.pack[r.kind] >= C.PACK) {
            this.gatherCooldown = .8;
            this.log(`${r.kind === 'food' ? 'Food' : 'Water'} pack full (${C.PACK}/${C.PACK}). Use some before gathering more.`);
            return;
        }
        if (this.world.takeResource(r)) {
            this.pack[r.kind]++;
            this.progress.gathered++;
            this.gatherCooldown = C.GATHER_DELAY;
            this.effects.push({ text: '+1 ' + r.kind, x: r.x, y: r.y - 18, age: 0, color: r.kind === 'food' ? '#c4dfb0' : '#a9e0e5' });
            this.refreshUI();
        }
    }
    consume(kind) {
        if (this.state !== 'running')
            return;
        this.spar.end();
        if (this.pack[kind] <= 0) {
            this.log(`No ${kind} in your pack. Find ${kind === 'food' ? 'a green berry patch' : 'a blue spring'}.`, true);
            return;
        }
        const v = this.world.player.vitals, key = kind === 'food' ? 'hunger' : 'thirst';
        if (v[key] >= 99) {
            this.log(kind === 'food' ? 'You are already well fed.' : 'You are already hydrated.');
            return;
        }
        const before = v[key];
        v[key] = Math.min(100, v[key] + (kind === 'food' ? 38 : 45));
        this.pack[kind]--;
        this.log(`${kind === 'food' ? 'Ate one provision' : 'Drank one flask'} · +${Math.round(v[key] - before)} ${kind}.`);
        this.refreshUI();
    }
    toggleRest() {
        if (this.state !== 'running')
            return;
        this.spar.end();
        const p = this.world.player;
        p.runtime.resting = !p.runtime.resting;
        if (p.runtime.resting) {
            const f = this.world.refugeAt(p.x, p.y);
            this.log(f ? 'Resting at refuge.' : 'Resting in the field.');
        }
        this.refreshUI();
    }
    updatePlayer(dt) {
        const p = this.world.player, v = p.vitals, run = p.runtime, input = this.input, manual = input.movement(), move = this.socialUI.movement(dt,manual);
        const moving = move.magnitude > .04;
        if (moving)
            run.resting = false;
        if (run.exhausted && v.stamina >= 22)
            run.exhausted = false;
        const sprint = moving && input.sprint && !run.exhausted && v.stamina > 0 && !run.resting;
        run.moving = moving;
        run.sprinting = sprint;
        run.sprintRecovery = Math.max(0, run.sprintRecovery - dt);
        if (sprint) {
            v.stamina = Math.max(0, v.stamina - 25 * dt);
            run.sprintRecovery = .65;
            if (v.stamina <= 0)
                run.exhausted = true;
        }
        else if (this.spar.active) {
            const swing=this.spar.active.swings[p.id];
            if(swing?.phase==='ready' && !input.defend) v.stamina=Math.min(100,v.stamina+3*dt);
        }
        else if (run.sprintRecovery === 0) {
            v.stamina = Math.min(100, v.stamina + dt * (run.resting ? 27 : moving ? 9 : 15));
        }
        if (moving) {
            const weakness = (v.hunger < 12 || v.thirst < 12) ? 0.83 : 1;
            const speed = C.SPEED * p.actual.genome.mobility * (sprint ? C.SPRINT : 1) * weakness;
            this.world.move(p, move.x * speed * dt, move.y * speed * dt);
            p.angle = moveAngle(p.angle, Math.atan2(move.y, move.x), dt * 15);
        }
        const metabolism = p.actual.genome.metabolism * this.world.romance.household(p);
        v.hunger = Math.max(0, v.hunger - .30 * metabolism * dt * (sprint ? 1.65 : run.resting ? .65 : 1));
        v.thirst = Math.max(0, v.thirst - .46 * metabolism * dt * (sprint ? 1.8 : run.resting ? .72 : 1));
        if (v.hunger <= 0)
            v.health -= 2.8 * dt;
        if (v.thirst <= 0)
            v.health -= 5 * dt;
        if (run.resting && this.world.refugeAt(p.x, p.y) && v.hunger > 30 && v.thirst > 30)
            v.health = Math.min(100, v.health + householdSupport(this.world,p).refugeHealing * dt);
        v.health = clamp(v.health, 0, 100);
        for (const [key, label] of [['hunger', 'Food'], ['thirst', 'Water']]) {
            if (v[key] < 23 && !this.warningLatch[key]) {
                this.warningLatch[key] = true;
                this.log(`${label} is low. ${key === 'hunger' ? 'Eat with F' : 'Drink with R'} before it runs out.`, true);
            }
            else if (v[key] > 35)
                this.warningLatch[key] = false;
        }
        const refuge = this.world.refugeAt(p.x, p.y);
        if (refuge && !this.progress.visited.has(refuge.id)) {
            this.progress.visited.add(refuge.id);
            this.log('Found ' + refuge.name + '. Rest here to recover.');
        }
        if (v.health <= 0)
            this.die();
    }
    die(persist = true) {
        const w=this.world,p=w.player,v=p.vitals;
        w.family.markDeath(p,p.actual.life.deathCause || (v.thirst<=0?'thirst':v.hunger<=0?'hunger':'poor health'));
        $('deathCause').textContent=`${w.family.name(p)} died from ${p.actual.life.deathCause}. No living adult descendant can continue the playable lineage.`;
        $('deathStats').textContent=`Dynasty: ${w.family.playableIds.length} playable lives · Generation ${p.actual.lineage.generation} · ${w.family.births.reduce((n,b)=>n+b.childIds.length,0)} children born · ${this.progress.gathered} provisions gathered. Seed “${w.seed}”.`;
        if(w.family.candidates().length) this.familyUI.open(false);
        else this.setScreen('dead');
        if(persist) this.saves.save('auto',true);
    }
    step(dt) {
        if (this.state !== 'running' || this.socialUI?.isOpen)
            return;
        const w = this.world;
        for (const c of [w.player, ...w.npcs]) {
            c.px = c.x;
            c.py = c.y;
            c.prevAngle = c.angle;
        }
        this.gatherCooldown = Math.max(0, this.gatherCooldown - dt);
        w.family.elapse(dt,{deferRenewal:true});
        if (!w.player.actual.life.alive) { this.die(); return; }
        this.updatePlayer(dt);
        if (this.state !== 'running')
            return;
        w.family.flushRenewal();
        if (this.input.gather)
            this.gather();
        this.spar.step();
        for (const c of w.npcs)
            if(!this.spar.has(c.id)) w.updateNPC(c, dt);
        w.separateCitizens();
        for (const f of this.effects)
            f.age += dt;
        this.effects = this.effects.filter(f => f.age < 1.5);
        if (!this.progress.complete && w.elapsed >= C.DAY * 3 && this.progress.gathered >= 12 && this.progress.visited.size >= 2) {
            this.progress.complete = true;
            this.notify('Three days alive. Expedition complete. Continue building your family and future generations.');
            this.log('Expedition complete. Keep exploring for as long as you can.');
        }
    }
    frame(timestamp) {
        const dt = this.lastTime === null ? 0 : Math.min(.10, Math.max(0, (timestamp - this.lastTime) / 1000));
        this.lastTime = timestamp;
        if (this.state === 'running' && !this.debugManual && !this.socialUI.isOpen) {
            this.accumulator += dt;
            let steps = 0;
            while (this.accumulator >= C.DT && steps < 6) {
                this.accumulator -= C.DT;
                this.step(C.DT);
                steps++;
                if (this.state !== 'running') {
                    this.accumulator = 0;
                    break;
                }
            }
        }
        const alpha = this.state === 'running' && !this.debugManual && !this.socialUI.isOpen ? clamp(this.accumulator / C.DT, 0, 1) : 1;
        this.renderer.render(alpha, dt);
        this.socialUI?.frame();
        this.saves.tick();
        this.uiClock += dt;
        this.mapClock += dt;
        if (this.uiClock >= .125) {
            this.uiClock = 0;
            if (this.world) {
                this.refreshUI();
                this.updateInspection();
            }
        }
        if (this.mapClock >= .25) {
            this.mapClock = 0;
            if (this.world)
                this.renderer.map();
        }
        requestAnimationFrame(t => this.frame(t));
    }
    refreshUI() {
        this.spar?.refresh();
        if(this.world) {
            $('renewalToggleBtn').textContent=this.world.renewal.enabled?'Disable NPC families':'Enable NPC families';
            $('renewalToggleBtn').disabled=!this.world.player.actual.life.alive;
            $('renewalStatus').textContent=this.world.renewal.enabled?'NPC families are enabled. Changes begin at the next day.':'The founding population ages without new NPC families.';
        }
        const w = this.world;
        if (!w)
            return;
        const p = w.player;
        $('generationTag').textContent = `Generation ${p.actual.lineage.generation}`;
        $('playerIdentity').textContent = `${p.body.visibleType} · age ${Math.floor(p.actual.life.ageYears)} days`;
        for (const key of ['health', 'hunger', 'thirst', 'stamina']) {
            const value = clamp(p.vitals[key], 0, 100), num = Math.ceil(value);
            $(key + 'Text').textContent = num;
            $(key + 'Fill').style.width = value + '%';
            $(key + 'Stat').classList.toggle('low', value < 23);
            $(key + 'Bar').setAttribute('aria-valuenow', num);
        }
        const fraction = (w.elapsed % C.DAY) / C.DAY, phase = fraction < .18 ? 'Dawn' : fraction < .58 ? 'Daylight' : fraction < .76 ? 'Dusk' : 'Night';
        $('dayText').textContent = `Day ${Math.floor(w.elapsed / C.DAY) + 1} · ${phase}`;
        $('seedText').textContent = 'Seed ' + w.seed;
        $('foodCount').textContent = this.pack.food + '/' + C.PACK;
        $('waterCount').textContent = this.pack.water + '/' + C.PACK;
        $('eatBtn').disabled = this.pack.food === 0;
        $('drinkBtn').disabled = this.pack.water === 0;
        $('restBtn').classList.toggle('active', p.runtime.resting);
        $('restBtn').querySelector('span').textContent = p.runtime.resting ? 'Get up' : 'Rest';
        $('sprintBtn').classList.toggle('active', p.runtime.sprinting);
        $('sprintBtn').querySelector('span').textContent = p.runtime.exhausted ? 'Recover' : 'Sprint';
        const r = this.nearestResource(), f = w.refugeAt(p.x, p.y);
        $('gatherBtn').disabled = !r || this.pack[r.kind] >= C.PACK;
        let context = 'Explore · collect food and water · keep your meters filled';
        if (p.runtime.resting)
            context = f ? (p.vitals.hunger > 30 && p.vitals.thirst > 30 ? 'Refuge rest · healing' : 'Refuge rest · eat and drink to heal') : 'Field rest · no healing';
        else if (r)
            context = this.pack[r.kind] >= C.PACK ? `${r.kind === 'food' ? 'Food' : 'Water'} pack full · use supplies first` : `Hold E to gather ${r.kind} · ${r.quantity} remaining`;
        else if (f)
            context = 'Safe refuge · Space to rest and recover health';
        if(w.elapsed<8 && !this.progress.gathered && !r && !p.runtime.resting) context=document.body.classList.contains('touch')?'Drag the joystick to move.':'WASD / arrows · Move';
        if(r && !p.runtime.resting) context=`${document.body.classList.contains('touch')?'Hold Gather':'Hold E'} · ${r.kind} (${r.quantity})`;
        if(p.vitals.hunger<45 && this.pack.food) context=document.body.classList.contains('touch')?'Tap Eat · Use packed food':'F · Eat packed food';
        else if(p.vitals.thirst<45 && this.pack.water) context=document.body.classList.contains('touch')?'Tap Drink · Use packed water':'R · Drink packed water';
        const pending=this.socialUI?.controller?.pending;
        if(pending) context=w.social.nearby(w.social.citizen(pending.id))?'Waiting for a reply…':'Walking over…';
        $('cancelApproachBtn').hidden=!pending;
        $('context').textContent = context;
        $('restDetails').hidden = true;
        $('restDetails').textContent = `Stamina +27/s · food use −35% · water use −28%${f ? ' · eligible healing +1.8/s' : ''}`;
        $('location').textContent = w.districtAt(p.x, p.y);
        const nearby = w.social.nearest();
        $('talkBtn').disabled = !nearby;
        $('reputationSummary').textContent = w.social.reputationLabel();
        if (!pending && !p.runtime.resting && !r && nearby) $('context').textContent = 'Click a citizen · Choose an action';
        this.socialUI?.refresh();
        const days = Math.min(3, Math.floor(w.elapsed / C.DAY));
        $('daysCount').textContent = days + ' / 3';
        $('gatherCount').textContent = Math.min(12, this.progress.gathered) + ' / 12';
        $('refugesCount').textContent = Math.min(2, this.progress.visited.size) + ' / 2';
        for (const [id, done] of [['goalDays', days >= 3], ['goalGather', this.progress.gathered >= 12], ['goalRefuges', this.progress.visited.size >= 2]]) {
            $(id).classList.toggle('done', done);
            $(id).querySelector('.check').textContent = done ? '✓' : '';
        }
        $('objectiveTitle').textContent = this.progress.complete ? 'Expedition complete' : 'Your first expedition';
        if (this.noticeUntil && w.elapsed >= this.noticeUntil)
            $('notice').hidden = true;
        this.renderLog();
    }
    citizenAtScreen(x, y) {
        if (!this.world) return null;
        const point = this.renderer.screenToWorld(x, y);
        let target = null, best = Infinity;
        for (const c of this.world.npcs) {
            if (!c.actual.life.alive) continue;
            const d = dist2(c.x, c.y, point.x, point.y);
            if (d < (c.body.radius + 9) ** 2 && d < best) { best = d; target = c; }
        }
        return target;
    }
    updateInspection() {
        const tooltip = $('tooltip'), mouse = this.input.mouse;
        if (this.state !== 'running' || !mouse.inside || this.socialUI.isOpen) { tooltip.hidden = true; return; }
        const target = this.citizenAtScreen(mouse.x, mouse.y);
        if (!target) { tooltip.hidden = true; return; }
        const v = this.world.social.view(target);
        tooltip.replaceChildren();
        const title = document.createElement('strong'); title.textContent = v.introduced ? `${v.name} · ${v.observed.form}` : v.observed.form;
        const body = document.createElement('p'); body.textContent = `${v.observed.apparentClass} · ${v.observed.size} · ${v.observed.activity}.`;
        const note = document.createElement('small'); note.textContent = `${v.introduced ? v.relationship.label+' · ' : ''}Click for actions`;
        tooltip.append(title, body, note); tooltip.hidden = false;
        const left = clamp(mouse.x + 17, 8, Math.max(8, this.renderer.w - tooltip.offsetWidth - 10));
        const top = clamp(mouse.y + 18, 8, Math.max(8, this.renderer.h - tooltip.offsetHeight - 10));
        tooltip.style.left = left + 'px'; tooltip.style.top = top + 'px';
    }
}
