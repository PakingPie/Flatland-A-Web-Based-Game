class Input {
    constructor(game) {
        this.game = game;
        this.keys = new Set();
        this.touch = { x: 0, y: 0 };
        this.hold = { gather: false, sprint: false };
        this.gatherTarget = null;
        this.mouse = { x: 0, y: 0, inside: false };
        this.joyPointer = null;
        window.addEventListener('keydown', e => this.keyDown(e));
        window.addEventListener('keyup', e => this.keys.delete(e.code));
        window.addEventListener('blur', () => { this.clear(); game.pause('Paused because you switched away from the game.'); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) {
            this.clear();
            game.pause('Paused while this page is hidden.');
        } });
        game.canvas.addEventListener('pointermove', e => { const r = game.canvas.getBoundingClientRect(); this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top, inside: e.pointerType !== 'touch' }; });
        game.canvas.addEventListener('pointerleave', () => { this.mouse.inside = false; });
        game.canvas.addEventListener('pointerdown', () => game.canvas.focus({ preventScroll: true }));
        document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch')
            document.body.classList.add('touch'); }, { passive: true });
        if (matchMedia('(pointer:coarse)').matches)
            document.body.classList.add('touch');
        this.bindContextAction();
        this.bindHold('sprintBtn', 'sprint');
        const joy = $('joystick');
        joy.addEventListener('pointerdown', e => { if (this.joyPointer !== null || game.state !== 'running')
            return; this.joyPointer = e.pointerId; joy.setPointerCapture(e.pointerId); this.updateStick(e); e.preventDefault(); });
        joy.addEventListener('pointermove', e => { if (e.pointerId === this.joyPointer)
            this.updateStick(e); });
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
            joy.addEventListener(event, e => { if (e.pointerId === this.joyPointer) {
                this.joyPointer = null;
                this.touch = { x: 0, y: 0 };
                $('stick').style.transform = '';
            } });
    }
    bindContextAction() {
        const b = $('interactBtn');
        const activate = held => {
            if (this.game.state !== 'running' || b.disabled) return;
            const action = this.game.contextAction;
            if (action?.kind === 'gather') {
                if (held) { this.gatherTarget = action.target; this.hold.gather = true; }
                this.game.gather(action.target);
            } else if (action?.kind === 'talk' && this.game.world.social.nearby(action.target)) {
                this.game.socialUI.open(action.target.id);
            }
        };
        b.addEventListener('pointerdown', e => {
            if (b.disabled || this.game.state !== 'running' || e.button !== 0) return;
            b.setPointerCapture(e.pointerId); activate(true); e.preventDefault();
        });
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
            b.addEventListener(event, () => { this.hold.gather = false; this.gatherTarget = null; });
        b.addEventListener('click', e => {
            if (e.detail === 0) activate(false);
            if (!this.game.socialUI.isOpen) this.game.canvas.focus({ preventScroll: true });
        });
    }
    bindHold(id, key, onStart) {
        const b = $(id);
        b.addEventListener('pointerdown', e => { if (this.game.state !== 'running' || b.disabled)
            return; this.hold[key] = true; b.setPointerCapture(e.pointerId); if (onStart)
            onStart(); e.preventDefault(); });
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
            b.addEventListener(event, () => { this.hold[key] = false; });
        b.addEventListener('click', e => { if (e.detail === 0) {
            if (onStart)
                onStart();
            else
                this.hold[key] = !this.hold[key];
        } this.game.canvas.focus({ preventScroll: true }); });
    }
    updateStick(e) {
        const r = $('joystick').getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = hypot(dx, dy), scale = d > 37 ? 37 / d : 1;
        const x = dx * scale, y = dy * scale;
        this.touch = { x: x / 37, y: y / 37 };
        if (d < 7)
            this.touch = { x: 0, y: 0 };
        $('stick').style.transform = `translate(${x}px,${y}px)`;
    }
    clear() { this.keys.clear(); this.hold.gather = this.hold.sprint = false; this.gatherTarget = null; this.touch = { x: 0, y: 0 }; this.joyPointer = null; this.mouse.inside = false; $('stick').style.transform = ''; }
    keyDown(e) {
        if (e.code === 'Tab' && (this.game.state !== 'running' || this.game.socialUI?.isOpen)) {
            const dialog = this.game.socialUI?.isOpen ? $('citizenPanel') : document.querySelector('.overlay:not([hidden])');
            const controls = dialog ? [...dialog.querySelectorAll('button:not(:disabled),input,select:not(:disabled),summary')].filter(el => !el.hidden && el.getClientRects().length) : [];
            if (controls.length) {
                const first = controls[0], last = controls[controls.length - 1];
                if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
            }
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey)
            return;
        if(e.code==='F8') { e.preventDefault(); if(!e.repeat) this.game.inspector.toggle(); return; }
        if(this.game.inspector?.isOpen) {
            if(e.code==='Escape') { e.preventDefault(); this.game.inspector.close(); }
            return;
        }
        const editing = e.target instanceof HTMLElement && (e.target.matches('input,textarea,select') || e.target.isContentEditable);
        if (editing) {
            if (e.code === 'Enter' && this.game.state === 'menu') {
                e.preventDefault();
                this.game.requestNew($('seedInput').value);
            }
            return;
        }
        if (e.target instanceof HTMLButtonElement && (e.code === 'Space' || e.code === 'Enter'))
            return;
        const relevant = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyR', 'Space', 'Escape', 'KeyP', 'KeyH', 'KeyT', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Enter'];
        if (!relevant.includes(e.code))
            return;
        e.preventDefault();
        if (e.repeat)
            return;
        if (this.game.state === 'running' && this.game.socialUI?.isOpen) {
            if (e.code === 'Escape' || e.code === 'KeyT') { this.game.socialUI.close(); return; }
            if (/^Digit[1-7]$/.test(e.code)) { $('bubbleOptions').querySelectorAll('button')[Number(e.code.slice(-1))-1]?.click(); return; }
            if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.code)) this.game.socialUI.close(false);
        }
        if (e.code === 'Escape' && this.game.socialUI?.controller?.pending) { this.game.socialUI.controller.cancel(); return; }
        if (e.code === 'KeyT' && this.game.state === 'running') { this.game.socialUI.openNearest(); return; }
        if (e.code === 'Escape' && this.game.state === 'family') { this.game.familyUI.close(); return; }
        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (this.game.state === 'running')
                this.game.pause();
            else if (this.game.state === 'paused')
                this.game.resume();
            else if (this.game.state === 'help')
                this.game.closeHelp();
            return;
        }
        if (e.code === 'KeyH') {
            if (this.game.state === 'help')
                this.game.closeHelp();
            else if (['running', 'paused'].includes(this.game.state))
                this.game.showHelp();
            return;
        }
        if (e.code === 'Enter') {
            if (this.game.state === 'menu')
                this.game.requestNew($('seedInput').value);
            else if (this.game.state === 'dead')
                this.game.requestNew(this.game.world.seed);
            return;
        }
        if (this.game.state !== 'running')
            return;
        this.keys.add(e.code);
        if (e.code === 'KeyF')
            this.game.consume('food');
        if (e.code === 'KeyR')
            this.game.consume('water');
        if (e.code === 'Space')
            this.game.toggleRest();
        if (e.code === 'KeyE')
            this.game.gather();
    }
    movement() {
        let x = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) + this.touch.x;
        let y = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) + this.touch.y;
        const d = hypot(x, y);
        if (d > 1) {
            x /= d;
            y /= d;
        }
        return { x, y, magnitude: Math.min(d, 1) };
    }
    get sprint() { return this.hold.sprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
    get gather() { return this.hold.gather || this.keys.has('KeyE'); }
}
// ─────────────────────────────────────────────────────────────────────────────
// 05. Rendering. Static geometry is culled; no full-world high-DPI texture is held.
// UI updates at 8 Hz, map at 4 Hz, simulation at 60 Hz. Background tabs are paused.
// ─────────────────────────────────────────────────────────────────────────────
