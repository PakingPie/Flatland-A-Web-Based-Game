class Navigation {
    constructor(world) {
        this.world = world;
        this.cols = C.W / C.CELL;
        this.rows = C.H / C.CELL;
        this.open = new Uint8Array(this.cols * this.rows);
        this.free = [];
        for (let y = 0; y < this.rows; y++)
            for (let x = 0; x < this.cols; x++) {
                const i = y * this.cols + x;
                if (world.circleClear((x + .5) * C.CELL, (y + .5) * C.CELL, C.NAV_RADIUS)) {
                    this.open[i] = 1;
                    this.free.push(i);
                }
            }
        // Keep procedural citizens/resources in the player's connected component.
        this.reachable = new Uint8Array(this.open.length);
        const origin = this.index(1728, 1280);
        const start = this.nearestOpen(origin);
        const q = [start];
        this.reachable[start] = 1;
        for (let h = 0; h < q.length; h++)
            for (const n of this.neighbors(q[h]))
                if (!this.reachable[n.i]) {
                    this.reachable[n.i] = 1;
                    q.push(n.i);
                }
        this.free = q;
    }
    index(x, y) { return clamp(Math.floor(y / C.CELL), 0, this.rows - 1) * this.cols + clamp(Math.floor(x / C.CELL), 0, this.cols - 1); }
    point(i) { return { x: (i % this.cols + .5) * C.CELL, y: (Math.floor(i / this.cols) + .5) * C.CELL }; }
    nearestOpen(i) { if (this.open[i])
        return i; const x = i % this.cols, y = Math.floor(i / this.cols); for (let r = 1; r < 9; r++)
        for (let dy = -r; dy <= r; dy++)
            for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.open[ny * this.cols + nx])
                    return ny * this.cols + nx;
            } return this.free[0] ?? 0; }
    neighbors(i) {
        const x = i % this.cols, y = Math.floor(i / this.cols), out = [];
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy)
                    continue;
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows)
                    continue;
                const ni = ny * this.cols + nx;
                if (!this.open[ni])
                    continue;
                if (dx && dy && (!this.open[y * this.cols + nx] || !this.open[ny * this.cols + x]))
                    continue;
                // A circle can intrude into an edge between two otherwise clear cell centers.
                const a = this.point(i), b = this.point(ni);
                if (!this.world.segmentClear(a.x, a.y, b.x, b.y, C.NAV_RADIUS))
                    continue;
                out.push({ i: ni, cost: dx && dy ? Math.SQRT2 : 1 });
            }
        return out;
    }
    path(ax, ay, bx, by) {
        if (this.world.segmentClear(ax, ay, bx, by, C.NAV_RADIUS))
            return [{ x: bx, y: by }];
        const start = this.nearestOpen(this.index(ax, ay)), end = this.nearestOpen(this.index(bx, by));
        if (!this.reachable[end])
            return null;
        const N = this.open.length, g = new Float64Array(N), parent = new Int32Array(N), closed = new Uint8Array(N);
        g.fill(Infinity);
        parent.fill(-1);
        const ex = end % this.cols, ey = Math.floor(end / this.cols);
        const heuristic = i => { const dx = Math.abs(i % this.cols - ex), dy = Math.abs(Math.floor(i / this.cols) - ey); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
        const heap = new MinHeap();
        g[start] = 0;
        heap.push({ i: start, f: heuristic(start) });
        let found = false;
        while (heap.length) {
            const { i } = heap.pop();
            if (closed[i])
                continue;
            if (i === end) {
                found = true;
                break;
            }
            closed[i] = 1;
            for (const n of this.neighbors(i)) {
                if (closed[n.i])
                    continue;
                const cost = g[i] + n.cost;
                if (cost < g[n.i]) {
                    g[n.i] = cost;
                    parent[n.i] = i;
                    heap.push({ i: n.i, f: cost + heuristic(n.i) });
                }
            }
        }
        if (!found)
            return null;
        const raw = [];
        for (let i = end; i !== -1; i = parent[i]) {
            raw.push(this.point(i));
            if (i === start)
                break;
        }
        raw.reverse();
        // Starting and final connectors must also be collision-free.
        if (!this.world.segmentClear(ax, ay, raw[0].x, raw[0].y, C.NAV_RADIUS))
            return null;
        const last = raw[raw.length - 1];
        if (this.world.segmentClear(last.x, last.y, bx, by, C.NAV_RADIUS))
            raw.push({ x: bx, y: by });
        else
            return null;
        const smooth = [];
        let anchor = { x: ax, y: ay }, j = 0;
        while (j < raw.length) {
            let k = j;
            while (k + 1 < raw.length && this.world.segmentClear(anchor.x, anchor.y, raw[k + 1].x, raw[k + 1].y, C.NAV_RADIUS))
                k++;
            smooth.push(raw[k]);
            anchor = raw[k];
            j = k + 1;
        }
        return smooth;
    }
}
