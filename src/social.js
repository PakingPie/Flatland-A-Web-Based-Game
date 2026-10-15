// Phase 2A: lightweight social simulation. Society assigns rank; rank is never
// a multiplier for intelligence, virtue, metabolism, mobility or hereditary fitness.
const SOCIAL = Object.freeze({ reach: 108, cooldown: 3, dailyLimit: 6, historyLimit: 24,
    stages: ['Stranger', 'Acquaintance', 'Familiar', 'Trusted', 'Deeply trusted'],
    topics: { introduce: 'Introduce yourself', chat: 'Casual conversation', occupation: 'Ask about work',
        district: 'Discuss local society', interests: 'Ask about interests', family: 'Ask about family', rumor: 'Exchange a rumor' },
    factLabels: { name: 'Name', occupation: 'Occupation', reputation: 'Public reputation', interests: 'Interests',
        dislikes: 'Dislikes', personality: 'Your impression', family: 'Family background', ambition: 'Ambition',
        concern: 'Private concern', privateHistory: 'Sensitive history', publicRelationships: 'Public relationships' } });
function apparentStanding(c) {
    const form = c.body.visibleType;
    if (c.body.form === 'line') return { tier: 0, label: 'Restricted civic status · line-form woman' };
    return ({ 'Irregular triangle': { tier: 0, label: 'Outcast' }, 'Isosceles triangle': { tier: 1, label: 'Soldier / laboring class' },
        'Equilateral triangle': { tier: 2, label: 'Respectable working class' }, Square: { tier: 3, label: 'Gentleman class' },
        Pentagon: { tier: 4, label: 'Professional class' }, Hexagon: { tier: 5, label: 'Prestigious citizen' },
        Octagon: { tier: 6, label: 'High society' }, 'Near-circle': { tier: 7, label: 'Governing elite' } })[form] || { tier: 6, label: 'Prestigious polygon' };
}
function emptyRelationship() {
    return { familiarity: 0, trust: 0, lastAt: -999, day: -1, today: 0, topics: {}, history: [] };
}
function populateSocialIdentity(world, c, index) {
    // A separate per-identity stream does not perturb terrain, survival or AI RNG.
    const rng = new RNG(`${world.seed}:identity:${c.id}`), standing = apparentStanding(c);
    const first = ['Mara', 'Edwin', 'Alma', 'Silas', 'Iris', 'Oren', 'Ada', 'Felix', 'Nora', 'Lucan', 'Vera', 'Asa', 'Celia', 'Theo', 'Elin', 'Rowan'];
    const last = ['Vale', 'Reed', 'Hollow', 'Finch', 'Dale', 'Ash', 'Wren', 'Pike', 'Fern', 'Moss', 'Rill', 'Quill', 'Hale', 'Brook', 'Flint', 'Grey'];
    const offset = hash(world.seed + ':names') % 16;
    const name = `${first[(index + offset) % 16]} ${last[(Math.floor(index / 16) + offset) % 16]}`;
    const jobs = [['Forager', 'Day laborer', 'Salvager'], ['Road laborer', 'Drill instructor', 'Porter'], ['Baker', 'Mason', 'Weaver'],
        ['Estate steward', 'Merchant', 'Gentleman farmer'], ['Surveyor', 'Physician', 'Advocate'], ['Architect', 'Senior clerk', 'Tutor'],
        ['Magistrate', 'Guild patron', 'Scholar'], ['Council authority', 'High registrar', 'Civic overseer']];
    const occupation = rng.pick(c.body.form === 'line' ? ['Copyist', 'Herbalist', 'Weaver', 'Water steward', 'Cartographer'] : jobs[standing.tier]);
    const personality = { warmth: rng.next(), candor: rng.next(), reserve: rng.next(), curiosity: rng.next(), prejudice: rng.next() };
    if (index === 0) Object.assign(personality, { warmth: .85, candor: .9, reserve: .2, prejudice: .08 });
    const interests = ['orchard walks', 'music', 'gardening', 'old maps', 'star stories', 'quiet reading', 'stonework', 'cooking', 'rainy afternoons', 'local history'];
    const likes = rng.pick(interests), dislikes = rng.pick(['crowds', 'loud arguments', 'wasted food', 'idle gossip', 'being hurried', 'rigid ceremony']);
    const origins = ['the western orchards', 'the lower commons', 'the eastern workshops', 'the old river settlement'];
    const background = { origin: rng.pick(origins), knowsFamily: rng.next() > .23, discloseSensitive: rng.next() > .48,
        family: rng.pick(['My mother kept the communal stores. Our names rarely appeared in official records.',
            'My parents moved here for work. The family register did not travel with them.',
            'A grandparent taught me to read. That is the family inheritance I value most.',
            'My family repaired roads. Our history is mostly stories told at the table.']),
        ambition: rng.pick(['I hope to open a little garden everyone may enter.', 'I want a quieter home, not a higher title.', 'I would like my work to be remembered.', 'I hope to see the world beyond these wards.']),
        concern: rng.pick(['I worry about having enough water through a dry season.', 'I am afraid my neighbors value my outline more than my company.', 'I do not always know whom I can trust.']),
        sensitive: rng.pick(['There is a rumor of irregularity in my family. I have never seen proof.', 'The official register leaves someone out of my family story. I am not ready to name them.', 'My public account of our family is simpler than the truth. Even I do not know all of it.']) };
    c.actual.identity.name = name;
    c.actual.profile = { occupation, personality, preferences: { likes, dislikes }, disposition: rng.range(-3, 5), background };
    // Relationship membership and biological lineage remain distinct extension points.
    c.actual.bonds = { partnerIds: [], marriageIds: [] };
    c.actual.lineage.ancestryKnownToSelf = background.knowsFamily;
    c.publicIdentity = { displayName: name,
        claimedOccupation: personality.candor < .28 ? rng.pick(['Traveling surveyor', 'Independent scholar', 'Assistant registrar']) : occupation,
        standing, reputation: rng.int(-20, 80), claims: [] };
    c.publicIdentity.claims.push({ key: 'occupation', value: c.publicIdentity.claimedOccupation });
    c.playerKnowledge.relationship = emptyRelationship();
}
class SocialSystem {
    constructor(world) {
        this.world = world;
        this.rng = new RNG(world.seed + ':conversations');
        this.reputation = { score: 0, events: [] };
        world.npcs.forEach((c, i) => populateSocialIdentity(world, c, i));
        world.player.actual.identity.name = 'You';
        world.player.actual.bonds = { partnerIds: [], marriageIds: [] };
        world.player.playerKnowledge.relationship = emptyRelationship();
        world.player.publicIdentity.standing = apparentStanding(world.player);
    }
    citizen(id) { return this.world.npcs.find(c => c.id === id) || null; }
    nearby(c) {
        const p = this.world.player;
        return !!c && c.actual.life.alive && dist2(p.x, p.y, c.x, c.y) <= SOCIAL.reach ** 2 && this.world.segmentClear(p.x, p.y, c.x, c.y, 3);
    }
    nearest() {
        let result = null, best = Infinity;
        for (const c of this.world.npcs) {
            const d = dist2(c.x, c.y, this.world.player.x, this.world.player.y);
            if (d < best && this.nearby(c)) { result = c; best = d; }
        }
        return result;
    }
    stage(c) {
        const k = c.playerKnowledge, r = k.relationship;
        if (!k.discoveredFacts.name) return 0;
        if (r.familiarity >= 76 && r.trust >= 60) return 4;
        if (r.familiarity >= 48 && r.trust >= 30) return 3;
        if (r.familiarity >= 24 && r.trust >= 12) return 2;
        return 1;
    }
    learn(c, key, value, kind = 'claim', sourceId = c.id) {
        c.playerKnowledge.discoveredFacts[key] = { value, kind, sourceId, at: this.world.elapsed };
    }
    reputationEvent(delta, reason, witnessId) {
        this.reputation.score = clamp(this.reputation.score + delta, -100, 100);
        this.reputation.events.push({ delta, reason, witnessId, at: this.world.elapsed });
        this.reputation.events = this.reputation.events.slice(-48);
    }
    reputationLabel() { return this.reputation.score >= 8 ? 'Considerate locally' : this.reputation.score <= -5 ? 'A difficult reputation' : 'Little known locally'; }
    attitude(c) {
        const p = c.actual.profile, r = c.playerKnowledge.relationship, rank = c.publicIdentity.standing.tier;
        const outsider = apparentStanding(this.world.player).tier === 0;
        const bias = outsider ? p.personality.prejudice * (4 + rank * 2.1) : 0;
        return p.personality.warmth * 14 + p.disposition + r.trust * .24 + this.reputation.score * .12 - bias;
    }
    response(c, topic, text, familiarity = 0, trust = 0, reputation = 0, outcome = 'neutral') {
        const r = c.playerKnowledge.relationship;
        const beforeF = r.familiarity, beforeT = r.trust;
        r.familiarity = clamp(r.familiarity + familiarity, 0, 100);
        r.trust = clamp(r.trust + trust, -30, 100);
        r.history.push({ topic, outcome, at: this.world.elapsed, familiarity: r.familiarity - beforeF, trust: r.trust - beforeT });
        r.history = r.history.slice(-SOCIAL.historyLimit);
        if (reputation) this.reputationEvent(reputation, topic + ':' + outcome, c.id);
        if (this.stage(c) >= 2 && !c.playerKnowledge.discoveredFacts.personality) {
            const p = c.actual.profile.personality;
            this.learn(c, 'personality', p.warmth > .65 ? 'Seems warm in your conversations.' : p.reserve > .65 ? 'Seems guarded about personal matters.' : p.curiosity > .65 ? 'Seems curious about life beyond the district.' : 'Seems measured in conversation.', 'observation', 'player');
        }
        return { ok: outcome === 'positive', text, outcome, changes: { familiarity: r.familiarity - beforeF, trust: r.trust - beforeT, reputation } };
    }
    interact(id, topic) {
        const c = this.citizen(id);
        if (!c || !Object.hasOwn(SOCIAL.topics, topic)) return { ok: false, text: 'That conversation is unavailable.', outcome: 'unavailable' };
        if (!this.nearby(c)) return { ok: false, text: 'Come closer, with a clear path between you, to speak.', outcome: 'out-of-range' };
        const k = c.playerKnowledge, r = k.relationship, p = c.actual.profile, time = this.world.elapsed;
        if (time - r.lastAt < SOCIAL.cooldown) return { ok: false, text: 'Give the conversation a moment. Repeated clicks do not build trust.', outcome: 'cooldown' };
        r.lastAt = time;
        const day = Math.floor(time / C.DAY);
        if (r.day !== day) { r.day = day; r.today = 0; r.topics = {}; }
        if (r.today >= SOCIAL.dailyLimit) return { ok: false, text: '“Let us leave something to talk about tomorrow.” Daily conversation energy is spent.', outcome: 'daily-limit' };
        const previous = r.topics[topic] || 0, factor = 1 / (1 + r.today * .22);
        r.today++; r.topics[topic] = previous + 1;
        if (previous > 0 || (topic === 'introduce' && k.discoveredFacts.name)) {
            return this.response(c, topic, '“We have been over that. A little space would be welcome.” Try a different subject or return another day.', 0, previous > 0 ? -1 : 0, 0, previous > 0 ? 'negative' : 'neutral');
        }
        if (topic !== 'introduce' && !k.discoveredFacts.name) {
            return this.response(c, topic, topic === 'family' ? '“My family? You have not even introduced yourself.”' : '“Perhaps we should introduce ourselves first.”', -1, topic === 'family' ? -5 : -1, topic === 'family' ? -.5 : 0, 'negative');
        }
        if (c.vitals.hunger < 17 || c.vitals.thirst < 17) return this.response(c, topic, '“I need to find supplies before we can talk. Another time.”', 0, 0, 0, 'refused');
        const attitude = this.attitude(c), stage = this.stage(c);
        const refusal = clamp((2 - attitude) / 25, 0, .65);
        if (topic !== 'family' && this.rng.next() < refusal) {
            const prejudiced = p.personality.prejudice > .55;
            return this.response(c, topic, prejudiced ? '“An irregular outline, asking for my time? Not today.” Their prejudice says nothing about your worth.' : '“I am not in a talking mood. Please excuse me.”', -1, -2, 0, 'refused');
        }
        const warmth = .65 + p.personality.warmth * .65, trustGain = factor * warmth;
        switch (topic) {
            case 'introduce': {
                this.learn(c, 'name', c.publicIdentity.displayName);
                const reputation = c.publicIdentity.reputation > 45 ? 'They describe themselves as well regarded.' : c.publicIdentity.reputation < 0 ? 'They say people sometimes mistrust them.' : 'They say they keep a modest public profile.';
                this.learn(c, 'reputation', reputation);
                const greeting = p.personality.warmth > .65 ? '“A new face. I am glad you stopped.' : p.personality.reserve > .6 ? '“Very well. We can exchange names.' : '“Good day.';
                return this.response(c, topic, `${greeting} You may call me ${c.publicIdentity.displayName}.” ${reputation} Names and reputations here are self-reported.`, 9 * factor, 4 * trustGain, .25, 'positive');
            }
            case 'chat': {
                const lines = p.personality.warmth > .6 ? ['“It is good to have company on an ordinary day.”', '“A kind conversation is worth more than a perfect outline.”'] : p.personality.reserve > .6 ? ['“The days pass. The roads still need walking.”', '“I prefer small conversations to grand declarations.”'] : ['“There is more to a district than its official map.”', '“People hurry so much they forget to notice one another.”'];
                return this.response(c, topic, this.rng.pick(lines) + (stage >= 2 ? ' They seem more at ease with a familiar face.' : ''), 6 * factor, 4 * trustGain, .3, 'positive');
            }
            case 'occupation':
                this.learn(c, 'occupation', c.publicIdentity.claimedOccupation);
                return this.response(c, topic, `“I work as ${/^[aeiou]/i.test(c.publicIdentity.claimedOccupation) ? 'an' : 'a'} ${c.publicIdentity.claimedOccupation.toLowerCase()}.” This is their account, not independent verification.`, 4 * factor, 2 * trustGain, 0, 'positive');
            case 'district': {
                const district = this.world.districtAt(c.x, c.y).toLowerCase();
                let opinion = p.personality.prejudice > .7 ? '“The order of shapes keeps society in its proper places.” You need not share that belief.' : p.personality.warmth > .55 ? '“The officials count sides. I would rather count the people who help one another.”' : '“An outline can open a door here. It cannot carry water for you.”';
                if (c.body.form === 'line') opinion = '“They see a line and decide how much of my life I may lead. They know very little about me.”';
                return this.response(c, topic, `Here in ${district}: ${opinion}`, 5 * factor, 3 * trustGain, .25, 'positive');
            }
            case 'interests':
                if (r.familiarity < 13 || (p.personality.reserve > .78 && stage < 2)) return this.response(c, topic, '“We barely know one another. Let us keep to ordinary conversation for now.”', 1, -1, 0, 'refused');
                this.learn(c, 'interests', p.preferences.likes);
                if (stage >= 2) this.learn(c, 'dislikes', p.preferences.dislikes);
                return this.response(c, topic, `“I enjoy ${p.preferences.likes}.${stage >= 2 ? ` I could do without ${p.preferences.dislikes}.` : ''}”`, 5 * factor, 3 * trustGain, .1, 'positive');
            case 'family':
                if (stage < 3) return this.response(c, topic, '“That is personal. Please do not mistake a few conversations for permission.” Family questions need an established, trusted relationship.', -2, -5, -.6, 'negative');
                if (p.personality.reserve > .82) return this.response(c, topic, '“I trust you in many things. My family history is still mine to keep.” Trust does not unlock every secret.', 0, 0, 0, 'refused');
                this.learn(c, 'family', p.background.knowsFamily ? `I was raised near ${p.background.origin}. ${p.background.family}` : 'I do not know my ancestry. The surviving records tell me very little.');
                this.learn(c, 'ambition', p.background.ambition);
                if (stage >= 4) {
                    this.learn(c, 'concern', p.background.concern);
                    if (p.background.discloseSensitive) this.learn(c, 'privateHistory', p.background.sensitive);
                }
                return this.response(c, topic, `“${k.discoveredFacts.family.value} ${p.background.ambition}”${stage >= 4 ? ' They share a private concern; anything else remains their choice.' : ''} Family stories are claims, not genetic evidence.`, 4 * factor, 4 * trustGain, .15, 'positive');
            case 'rumor': {
                if (r.trust < 3 || p.preferences.dislikes === 'idle gossip') return this.response(c, topic, '“I would rather not pass stories along just now.”', 0, 0, 0, 'refused');
                const others = this.world.npcs.filter(other => other.id !== c.id);
                const subject = this.rng.pick(others), accurate = this.rng.next() > .35;
                const value = accurate ? subject.actual.profile.preferences.likes : 'collecting ceremonial seals';
                const text = `${subject.publicIdentity.displayName} is said to enjoy ${value}.`;
                k.rumors.push({ id: `rumor-${c.id}-${r.history.length}-${Math.floor(time * 60)}`, subjectId: subject.id, sourceId: c.id,
                    sourceName: k.discoveredFacts.name.value, text, at: time, status: 'unverified' });
                k.rumors = k.rumors.slice(-12);
                return this.response(c, topic, `“I heard that ${text} Do not take my word for it.” Recorded as an unverified rumor, never as a confirmed fact.`, 3 * factor, 2 * trustGain, 0, 'positive');
            }
        }
    }
    // The only social DTO consumed by UI. It includes observations and the player's
    // notebook, never profile truth, hidden genomes, private ancestry or truth flags.
    view(c) {
        const observed = observeCitizen(c), k = c.playerKnowledge, stage = this.stage(c);
        const facts = Object.entries(SOCIAL.factLabels).map(([key, label]) => ({ key, label, ...(k.discoveredFacts[key] ? copyJSON(k.discoveredFacts[key]) : { locked: true }) }));
        return { id: c.id, name: k.discoveredFacts.name?.value || 'Unknown citizen', observed, facts,
            relationship: { familiarity: k.relationship.familiarity, trust: k.relationship.trust, stage, label: SOCIAL.stages[stage] },
            rumors: copyJSON(k.rumors), inRange: this.nearby(c), cooldown: Math.max(0, SOCIAL.cooldown - (this.world.elapsed - k.relationship.lastAt)),
            remaining: k.relationship.day === Math.floor(this.world.elapsed / C.DAY) ? Math.max(0, SOCIAL.dailyLimit - k.relationship.today) : SOCIAL.dailyLimit,
            introduced: !!k.discoveredFacts.name };
    }
    exportState() { return { version: 1, rngState: this.rng.state, reputation: copyJSON(this.reputation) }; }
    importState(data, envelopeVersion) {
        if (data === null && envelopeVersion === 1) {
            // Phase 1.1 had no social discoveries; preserve its simulation, add fresh identities.
            for (const c of [this.world.player, ...this.world.npcs]) c.playerKnowledge.relationship = { ...emptyRelationship(), ...c.playerKnowledge.relationship };
            return;
        }
        insist(plain(data) && data.version === 1 && integerIn(data.rngState, 0, 4294967295), 'Invalid society state.');
        const rep = data.reputation;
        insist(plain(rep) && numberIn(rep.score, -100, 100) && Array.isArray(rep.events) && rep.events.length <= 48, 'Invalid reputation.');
        insist(rep.events.every(e => plain(e) && numberIn(e.delta, -100, 100) && shortText(e.reason, 100) && this.citizen(e.witnessId) && numberIn(e.at, 0, this.world.elapsed + .001)), 'Invalid reputation history.');
        this.rng.state = data.rngState; this.reputation = copyJSON(rep);
    }
    static validateKnowledge(k, elapsed, world) {
        for (const [key, f] of Object.entries(k.discoveredFacts)) {
            insist(Object.hasOwn(SOCIAL.factLabels, key) && plain(f) && shortText(f.value, 1000) && ['claim', 'observation', 'confirmed'].includes(f.kind) && (f.sourceId === 'player' || world.npcs.some(c => c.id === f.sourceId)) && numberIn(f.at, 0, elapsed + .001), 'Invalid discovered fact.');
        }
        insist(k.rumors.length <= 12 && k.rumors.every(r => plain(r) && shortText(r.id, 100) && shortText(r.sourceName, 100) && shortText(r.text, 600) && world.npcs.some(c => c.id === r.subjectId) && world.npcs.some(c => c.id === r.sourceId) && r.status === 'unverified' && numberIn(r.at, 0, elapsed + .001)), 'Invalid rumor record.');
        const r = k.relationship;
        if (r.lastAt === undefined) { insist(!Object.keys(k.discoveredFacts).length && !k.rumors.length && r.familiarity === 0 && r.trust === 0, 'Invalid legacy relationship.'); return; }
        insist(numberIn(r.lastAt, -999, elapsed + .001) && integerIn(r.day, -1, Math.floor(elapsed / C.DAY)) && integerIn(r.today, 0, SOCIAL.dailyLimit) && plain(r.topics) && Array.isArray(r.history) && r.history.length <= SOCIAL.historyLimit, 'Invalid relationship timing/history.');
        insist(Object.entries(r.topics).every(([key, value]) => Object.hasOwn(SOCIAL.topics, key) && integerIn(value, 0, SOCIAL.dailyLimit)), 'Invalid conversation counters.');
        insist(r.history.every(h => plain(h) && Object.hasOwn(SOCIAL.topics, h.topic) && ['positive', 'negative', 'neutral', 'refused'].includes(h.outcome) && numberIn(h.at, 0, elapsed + .001) && numberIn(h.familiarity, -100, 100) && numberIn(h.trust, -100, 100)), 'Invalid interaction history.');
    }
}
