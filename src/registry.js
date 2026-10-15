// Authoritative private records, keyed by persistent identity. Never expose this
// collection to presentation code: observers consume social/family DTOs instead.
// Death removes an actor from the living projection, never from genealogy.
class CharacterRegistry {
    constructor() { this.byId = new Map(); this.currentId = null; }
    get(id) { return this.byId.get(id) || null; }
    add(character) {
        insist(character && typeof character.id === 'string' && !this.byId.has(character.id), 'Duplicate or missing character ID.');
        this.byId.set(character.id, character);
        return character;
    }
    all() {
        const current = this.get(this.currentId);
        return current ? [current, ...[...this.byId.values()].filter(c => c.id !== this.currentId)] : [...this.byId.values()];
    }
    living() { return this.all().filter(c => c.actual.life.alive); }
    npcs() { return this.living().filter(c => c.id !== this.currentId); }
    select(id) {
        insist(this.get(id), 'Current player is missing.');
        // Preserve released NPC/save order when the old player joins the society.
        const previous = this.get(this.currentId);
        if (previous && previous.id !== id) { this.byId.delete(previous.id); this.byId.set(previous.id, previous); }
        this.currentId = id;
    }
    replace(records, currentId) {
        const candidate = new CharacterRegistry();
        for (const c of records) candidate.add(c);
        candidate.select(currentId);
        this.byId = candidate.byId; this.currentId = candidate.currentId;
    }
}
