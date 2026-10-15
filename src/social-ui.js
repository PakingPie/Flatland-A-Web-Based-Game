// Source-aware presentation. This module consumes SocialSystem.view(), not actual
// genomes, profile truth, public identities, or hidden genealogy records.
class SocialUI {
    constructor(game) {
        this.game = game; this.selectedId = null; this.tab = 'conversation';
        this.lastSignature = ''; this.returnFocus = null;
        $('talkBtn').addEventListener('click', () => this.openNearest());
        $('closeCitizenBtn').addEventListener('click', () => this.close());
        $('conversationTab').addEventListener('click', () => this.setTab('conversation'));
        $('notesTab').addEventListener('click', () => this.setTab('notes'));
        for (const [topic, label] of Object.entries(SOCIAL.topics)) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'topic'; b.dataset.topic = topic;
            const n = Object.keys(SOCIAL.topics).indexOf(topic) + 1;
            b.textContent = `${n} · ${label}${topic === 'family' ? ' · personal' : ''}`;
            b.title = topic === 'family' ? 'Intrusive questions can damage trust. Build a trusted relationship first.' : label;
            b.addEventListener('click', () => this.talk(topic)); $('conversationOptions').appendChild(b);
        }
        for (const [topic, label] of Object.entries(ROMANCE.topics)) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'topic'; b.textContent = label; b.dataset.romance = topic;
            b.addEventListener('click', () => { if (game.state !== 'running') return; const r = game.world.romance.interact(this.selectedId, topic); $('dialogueText').textContent = r.text; $('socialOutcome').textContent = r.outcome; this.refresh(); game.refreshUI(); });
            $('romanceOptions').appendChild(b);
        }
        $('birthBtn').addEventListener('click', () => { if (game.state !== 'running') return; const result=game.world.family.birth(); $('dialogueText').textContent=result.text; game.refreshUI(); });
        game.canvas.addEventListener('click', e => {
            if (game.state !== 'running') return;
            const box = game.canvas.getBoundingClientRect(), c = game.citizenAtScreen(e.clientX - box.left, e.clientY - box.top);
            if (c) this.open(c.id);
        });
    }
    get isOpen() { return this.selectedId !== null; }
    openNearest() {
        if (this.game.state !== 'running') return;
        const c = this.game.world.social.nearest();
        if (!c) { this.game.log('Approach a citizen, then press T or tap Talk. Click any visible citizen to inspect.'); return; }
        this.open(c.id);
    }
    open(id) {
        if (this.game.state !== 'running') return;
        const c = this.game.world.social.citizen(id); if (!c) return;
        this.game.input.clear(); this.returnFocus = document.activeElement;
        this.selectedId = id; this.lastSignature = ''; this.tab = 'conversation';
        $('citizenPanel').hidden = false; document.body.classList.add('social-open');
        $('tooltip').hidden = true;
        this.game.renderer.layoutDirty = true;
        $('dialogueText').textContent = 'An outline is visible. A life is not. Introduce yourself, listen, and let trust develop over time.';
        $('socialOutcome').textContent = '';
        this.setTab('conversation'); this.refresh();
        $('closeCitizenBtn').focus({ preventScroll: true });
    }
    close(focus = true) {
        if (this.game.world) this.game.world.conversationId = null;
        this.selectedId = null; $('citizenPanel').hidden = true; document.body.classList.remove('social-open');
        this.game.renderer.layoutDirty = true; this.game.input.clear();
        if (focus && this.game.state === 'running') this.game.canvas.focus({ preventScroll: true });
    }
    setTab(tab) {
        this.tab = tab;
        $('conversationView').hidden = tab !== 'conversation'; $('notesView').hidden = tab !== 'notes';
        $('conversationTab').setAttribute('aria-selected', String(tab === 'conversation'));
        $('notesTab').setAttribute('aria-selected', String(tab === 'notes'));
        this.refresh();
    }
    talk(topic) {
        if (!this.isOpen || this.game.state !== 'running') return;
        const result = this.game.world.social.interact(this.selectedId, topic);
        $('dialogueText').textContent = result.text;
        const change = result.changes;
        const sign = n => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
        $('socialOutcome').textContent = change && (change.familiarity || change.trust || change.reputation) ?
            `Familiarity ${sign(change.familiarity)} · Trust ${sign(change.trust)}${change.reputation ? ` · Reputation ${sign(change.reputation)}` : ''}` :
            ({ cooldown: 'No relationship gain from repeated clicks.', 'out-of-range': 'Move closer to speak.', 'daily-limit': 'Return on a later day.' })[result.outcome] || 'Their choice is respected.';
        $('socialOutcome').className = result.outcome === 'negative' || result.outcome === 'refused' ? 'social-negative' : 'social-positive';
        this.refresh(); this.game.refreshUI();
    }
    refresh() {
        if (!this.isOpen || !this.game.world) return;
        const social = this.game.world.social, citizen = social.citizen(this.selectedId);
        if (!citizen) { this.close(); return; }
        const v = social.view(citizen);
        // Only the active, nearby speaker pauses their path. Needs and every other NPC continue.
        this.game.world.conversationId = v.inRange ? v.id : null;
        $('citizenName').textContent = v.name;
        $('citizenForm').textContent = `${v.observed.form} · ${v.observed.apparentClass}`;
        $('relationshipStage').textContent = v.relationship.label;
        $('familiarityText').textContent = Math.round(v.relationship.familiarity);
        $('trustText').textContent = Math.round(v.relationship.trust);
        $('familiarityMeter').value = v.relationship.familiarity;
        $('trustMeter').value = Math.max(0, v.relationship.trust);
        $('playerReputation').textContent = social.reputationLabel();
        const romance = this.game.world.romance.view(citizen);
        $('romanceStatus').textContent = `${romance.status} · Affection ${Math.round(romance.affection)}/100 · Your spouse: ${romance.spouse}`;
        $('romancePreferences').textContent = romance.preferences;
        $('birthBtn').disabled = this.game.world.romance.spouse(this.game.world.player)?.id !== citizen.id || !!this.game.world.family.birthEligibility();
        $('birthBtn').title = this.game.world.family.birthEligibility() || 'A consensual, abstract household birth event.';
        for (const b of $('romanceOptions').querySelectorAll('button')) b.disabled = !v.inRange || v.cooldown > .01 || v.remaining <= 0;
        for (const b of $('conversationOptions').querySelectorAll('button')) {
            b.disabled = !v.inRange || v.cooldown > .01 || v.remaining <= 0 || (b.dataset.topic === 'introduce' && v.introduced);
        }
        $('conversationStatus').textContent = !v.inRange ? 'Out of speaking range. Move closer; notes remain available.' : v.cooldown > .01 ?
            `Listening… next reply in ${Math.ceil(v.cooldown)}s. The world continues.` : v.remaining ? `${v.remaining} meaningful exchanges left today · 1–7 choose · Esc closes` : 'Conversation energy spent. Return tomorrow.';
        const signature = JSON.stringify([v.facts, v.rumors]);
        if (signature !== this.lastSignature) {
            this.lastSignature = signature; this.renderNotes(v);
        }
        const scroller = document.querySelector('.social-scroll');
        $('socialScrollHint').hidden = scroller.scrollHeight <= scroller.clientHeight + 3;
    }
    renderNotes(v) {
        const notes = $('knownFacts'); notes.replaceChildren();
        for (const fact of v.facts) {
            const row = document.createElement('div'); row.className = 'fact-row';
            const label = document.createElement('strong'); label.textContent = fact.label;
            const value = document.createElement('span'); value.textContent = fact.locked ? 'Undiscovered' : fact.value;
            if (fact.locked) value.className = 'locked';
            const badge = document.createElement('small'); badge.className = 'source-badge';
            badge.textContent = fact.locked ? 'LOCKED' : ({ claim: 'CLAIM · self-reported', observation: 'OBSERVATION · your impression', confirmed: 'CONFIRMED · corroborated' })[fact.kind];
            row.append(label, value, badge); notes.appendChild(row);
        }
        const rumors = $('knownRumors'); rumors.replaceChildren();
        if (!v.rumors.length) { const p = document.createElement('p'); p.className = 'locked'; p.textContent = 'No rumors recorded from this citizen.'; rumors.appendChild(p); }
        for (const r of [...v.rumors].reverse()) {
            const p = document.createElement('p'); p.className = 'rumor';
            p.textContent = `${r.text} Source: ${r.sourceName} · day ${Math.floor(r.at / C.DAY) + 1}. UNVERIFIED.`; rumors.appendChild(p);
        }
    }
}
