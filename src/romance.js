// Pair records survive control changes. Preferences are private until discussed;
// trust is a prerequisite for intimacy, never a substitute for attraction.
const ROMANCE = Object.freeze({ affectionToMarry: 42, trustToMarry: 18,
    topics: { preferences: 'Discuss partnership preferences', compliment: 'Offer a sincere compliment',
        outing: 'Invite a quiet walk', commitment: 'Discuss a shared future', propose: 'Propose marriage', separate: 'End this marriage' } });
class RomanceSystem {
    constructor(world) { this.world = world; this.pairs = {}; this.marriages = []; }
    actors() { return [this.world.player, ...this.world.npcs]; }
    character(id) { return this.actors().find(c => c.id === id); }
    preferences(c) {
        const rng = new RNG(`${this.world.seed}:romance:${c.id}`), roll = rng.next();
        return { sexes: roll < .55 ? ['male', 'female'] : [roll < .8 ? (c.actual.identity.sex === 'male' ? 'female' : 'male') : c.actual.identity.sex],
            independence: rng.next(), reputation: rng.next(), familyLife: rng.range(.25, 1) };
    }
    key(a, b) { return [a.id, b.id].sort().join('|'); }
    pair(a, b) {
        const key = this.key(a, b);
        return this.pairs[key] ||= { ids: [a.id, b.id].sort(), affection: 0, status: 'none', knownBy: [],
            lastAt: -999, day: -1, today: 0, topics: {}, lastOutcome: '', lastBirthYear: -999 };
    }
    spouse(c) { const m = this.marriages.find(m => m.endedAt === null && m.ids.includes(c.id)); return m ? this.character(m.ids.find(id => id !== c.id)) : null; }
    compatibility(a, b) {
        const pref = this.preferences(b), profile = b.actual.profile;
        if (!pref.sexes.includes(a.actual.identity.sex)) return { ok: false, reason: 'I value our friendship, but I do not feel that kind of attraction.' };
        const spark = new RNG(`${this.world.seed}:spark:${this.key(a, b)}`).next();
        if (spark < .15) return { ok: false, reason: 'Friendship feels right to me. Romance does not.' };
        const gap = Math.max(0, apparentStanding(b).tier - apparentStanding(a).tier);
        if (profile && pref.independence < .5 && profile.personality.prejudice * gap > 1.25)
            return { ok: false, reason: 'My family expects a different social match. That is their belief about status, not a truth about your worth.' };
        if (pref.reputation > .75 && this.world.social.reputation.score < 2)
            return { ok: false, reason: 'I want to know how you treat the wider community first.' };
        return { ok: true, reason: 'There may be something here, if we both choose it.' };
    }
    isCloseKin(a, b) {
        const parents = c => [c.actual.lineage.motherId, c.actual.lineage.fatherId].filter(Boolean);
        const ancestors = c => { const seen = new Set(), pending = parents(c); while (pending.length) { const id = pending.pop(); if (seen.has(id)) continue; seen.add(id); const p = this.character(id); if (p) pending.push(...parents(p)); } return seen; };
        const aa = ancestors(a), bb = ancestors(b);
        return aa.has(b.id) || bb.has(a.id) || [...aa].some(id => bb.has(id));
    }
    interact(id, topic) {
        const w = this.world, a = w.player, b = w.social.citizen(id);
        const result = (text, outcome = 'refused') => ({ ok: outcome === 'positive', text, outcome });
        if (!b || !Object.hasOwn(ROMANCE.topics, topic) || !a.actual.life.alive) return result('That interaction is unavailable.');
        if (!w.social.nearby(b)) return result('Come closer to speak.', 'out-of-range');
        if (a.actual.life.ageYears < 18 || b.actual.life.ageYears < 18 || this.isCloseKin(a, b)) return result('Courtship requires unrelated adults.');
        const r = b.playerKnowledge.relationship, pair = this.pair(a, b), time = w.elapsed, day = Math.floor(time / C.DAY);
        if (time - Math.max(r.lastAt, pair.lastAt) < SOCIAL.cooldown) return result('Give them time to respond. Repeated clicks do not build affection.', 'cooldown');
        if (!b.playerKnowledge.discoveredFacts.name) return result('Introduce yourself first.');
        if (r.day !== day) { r.day = day; r.today = 0; r.topics = {}; }
        if (pair.day !== day) { pair.day = day; pair.today = 0; pair.topics = {}; }
        if (r.today >= SOCIAL.dailyLimit || pair.today >= 3) return result('Let us leave room for tomorrow.', 'daily-limit');
        r.lastAt = pair.lastAt = time; r.today++; pair.today++;
        const repeated = pair.topics[topic] || 0; pair.topics[topic] = repeated + 1;
        const finish = (text, outcome = 'refused') => { pair.lastOutcome = text; return result(text, outcome); };
        if (repeated) return finish('We have already discussed that today. Affection needs more than repetition.');
        if (topic === 'preferences') {
            if (!pair.knownBy.includes(a.id)) pair.knownBy.push(a.id);
            return finish(this.preferenceText(b), 'positive');
        }
        if (topic === 'separate') {
            const m = this.marriages.find(m => m.endedAt === null && m.ids.includes(a.id) && m.ids.includes(b.id));
            if (!m) return finish('You are not married to one another.');
            this.endMarriage(m, 'separation'); pair.status = 'separated';
            return finish('The marriage ends. Your family history and children remain part of both lives.', 'positive');
        }
        if (b.vitals.hunger < 20 || b.vitals.thirst < 20) return finish('I need supplies before I can think about this.');
        if (this.spouse(a)?.id !== b.id && (this.spouse(a) || this.spouse(b))) return finish('An existing marriage must be resolved first.');
        if (r.trust < 7) return finish('I would like to know you better before courtship.');
        const compatible = this.compatibility(a, b);
        if (!compatible.ok) { if (pair.status !== 'married') pair.status = 'declined'; return finish(compatible.reason); }
        if (topic === 'propose') {
            if (this.spouse(a)?.id === b.id) return finish('We are already married.');
            if (pair.affection < ROMANCE.affectionToMarry || r.trust < ROMANCE.trustToMarry || pair.status !== 'courting')
                return finish('I am not ready. Let affection and trust grow through different shared experiences.');
            const m = { id: `marriage-${this.marriages.length + 1}`, ids: [a.id, b.id], at: time, endedAt: null, reason: null };
            this.marriages.push(m); pair.status = 'married'; this.syncBonds();
            w.social.reputationEvent(1, 'marriage', b.id);
            return finish('Yes. Let us build a life together. Household support lowers food and water use by 12% and improves rest.', 'positive');
        }
        if (topic === 'commitment' && pair.affection < 15) return finish('A shared future is a big question. Let us spend more time together.');
        const gain = ({ compliment: 7, outing: 11, commitment: 9 })[topic] / (1 + (pair.today - 1) * .45);
        pair.affection = clamp(pair.affection + gain, 0, 100); if (pair.status !== 'married') pair.status = 'courting';
        r.trust = clamp(r.trust + 1.5, -30, 100);
        return finish(({ compliment: 'Your kindness is welcome. They return your interest.', outing: 'A quiet walk sounds lovely. Shared time brings you closer.', commitment: 'We talk about the life we might choose together.' })[topic], 'positive');
    }
    preferenceText(c) { const p = this.preferences(c); return `I am open to partners who are ${p.sexes.join(' or ')}. ${p.independence > .5 ? 'I choose affection over family expectations.' : 'Family expectations matter to me.'} ${p.reputation > .75 ? 'A considerate public reputation matters too.' : 'I want to build trust at our own pace.'}`; }
    endMarriage(m, reason) { m.endedAt = this.world.elapsed; m.reason = reason; const a = this.character(m.ids[0]), b = this.character(m.ids[1]); if (a && b) this.pair(a, b).status = reason === 'death' ? 'widowed' : 'separated'; this.syncBonds(); }
    syncBonds() {
        for (const c of this.actors()) c.actual.bonds = { partnerIds: [], marriageIds: [] };
        for (const m of this.marriages) for (const id of m.ids) {
            const c = this.character(id); if (!c) continue;
            c.actual.bonds.marriageIds.push(m.id);
            if (m.endedAt === null) c.actual.bonds.partnerIds.push(m.ids.find(other => other !== id));
        }
    }
    household(c) { return this.spouse(c)?.actual.life.alive ? .88 : 1; }
    view(c) { const p = this.pair(this.world.player, c); return { affection: p.affection, status: p.status,
        preferences: p.knownBy.includes(this.world.player.id) ? this.preferenceText(c) : 'Undiscovered · discuss partnership preferences',
        spouse: this.spouse(this.world.player)?.playerKnowledge.discoveredFacts.name?.value || (this.spouse(this.world.player) ? 'Your spouse' : 'None') }; }
    exportState() { return copyJSON({ pairs: this.pairs, marriages: this.marriages }); }
    importState(data) {
        insist(plain(data) && plain(data.pairs) && Array.isArray(data.marriages) && data.marriages.length <= 1000, 'Invalid romance state.');
        const validIds = ids => Array.isArray(ids) && ids.length === 2 && ids[0] !== ids[1] && ids.every(id => this.character(id));
        for (const [key, p] of Object.entries(data.pairs)) {
            insist(plain(p) && validIds(p.ids) && key === [...p.ids].sort().join('|') && numberIn(p.affection, 0, 100) && ['none','declined','courting','married','separated','widowed'].includes(p.status), 'Invalid romantic pair.');
            insist(Array.isArray(p.knownBy) && p.knownBy.every(id => p.ids.includes(id)) && numberIn(p.lastAt, -999, this.world.elapsed + .001) && integerIn(p.day, -1, Math.floor(this.world.elapsed / C.DAY)) && integerIn(p.today, 0, 3) && plain(p.topics) && shortText(p.lastOutcome) && numberIn(p.lastBirthYear, -999, 1e9), 'Invalid courtship history.');
            insist(Object.entries(p.topics).every(([t,n]) => Object.hasOwn(ROMANCE.topics, t) && integerIn(n, 0, 3)), 'Invalid courtship topics.');
        }
        const married = new Set(), ids = new Set();
        for (const m of data.marriages) {
            insist(plain(m) && shortText(m.id, 100) && !ids.has(m.id) && validIds(m.ids) && numberIn(m.at, 0, this.world.elapsed + .001) && (m.endedAt === null || numberIn(m.endedAt, m.at, this.world.elapsed + .001)) && [null,'death','separation'].includes(m.reason) && (m.endedAt===null)===(m.reason===null), 'Invalid marriage record.'); ids.add(m.id);
            const pair = data.pairs[[...m.ids].sort().join('|')]; insist(pair, 'Marriage has no relationship.');
            if (m.endedAt === null) { insist(pair.status === 'married' && m.ids.every(id => !married.has(id) && this.character(id).actual.life.alive && this.character(id).actual.life.ageYears>=18) && !this.isCloseKin(this.character(m.ids[0]),this.character(m.ids[1])), 'Conflicting marriage.'); m.ids.forEach(id => married.add(id)); }
        }
        for (const p of Object.values(data.pairs)) if (p.status === 'married') insist(data.marriages.some(m => m.endedAt === null && [...m.ids].sort().join('|') === [...p.ids].sort().join('|')), 'Missing active marriage.');
        this.pairs = copyJSON(data.pairs); this.marriages = copyJSON(data.marriages); this.syncBonds();
    }
}
