/* Magic Express — match-3 engine (DOM-independent).
   Produces animation "steps" that the renderer plays back. */
(function () {
  'use strict';
  var R = window.MEDATA.rng;

  function Cell() {
    return { t: -1, sp: null, ice: 0, chain: 0, amber: 0, honey: 0, lug: false, blk: null, dark: false, lit: false, aurora: false, rail: false, hole: false, belt: 0, portal: 0 };
  }

  function Board(cfg, opts) {
    opts = opts || {};
    this.cfg = cfg;
    this.cols = cfg.cols; this.rows = cfg.rows;
    this.rnd = R(cfg.seed + (opts.salt || 0));
    this.grid = [];
    this.goals = JSON.parse(JSON.stringify(cfg.goals));
    this.moves = cfg.moves + (opts.extraMoves || 0);
    this.movesTotal = this.moves;
    this.charge = opts.startCharge || 0;      // whistle gauge 0..100
    this.charges = opts.startCharges || 0;    // ready whistle charges
    this.cascadeMax = 0;
    this.specialsMade = 0;
    this.coinsEarned = 0;
    this.whistleUses = 0;
    this.clearedCounts = {};
    this.boss = cfg.boss || 0;
    this.bossTimer = this.boss === 8 ? 90 : 0;
    this.moveCount = 0;
    this.over = false;
    this.win = false;
    this.steps = [];
    this.build();
  }

  /* ---------------- build ---------------- */
  Board.prototype.build = function () {
    var c, r, i;
    for (r = 0; r < this.rows; r++) { this.grid.push([]); for (c = 0; c < this.cols; c++) this.grid[r].push(Cell()); }
    if (this.cfg.mask) {
      for (r = 0; r < this.rows; r++) for (c = 0; c < this.cols; c++) {
        if (this.cfg.mask[r] && this.cfg.mask[r][c] === '0') this.grid[r][c].hole = true;
      }
    }
    /* blockers from cfg */
    var placed = 0;
    (this.cfg.blockers || []).forEach(function (b) {
      var n = b.n;
      if (b.kind === 'dark') { this.darkAll(); return; }
      if (b.kind === 'timer') { return; }
      var tries = 0;
      while (n > 0 && tries < 400) {
        tries++;
        r = Math.floor(this.rnd() * this.rows); c = Math.floor(this.rnd() * this.cols);
        var cell = this.grid[r][c];
        if (cell.hole) continue;
        if (b.kind === 'ice') {
          if (cell.hole) if (cell.t === -1 && !cell.blk && cell.ice === 0) { cell.ice = b.hp; n--; }
          else if (cell.ice === 0 && !cell.blk) { cell.ice = b.hp; n--; }
        } else if (b.kind === 'chain') {
          if (!cell.blk && cell.chain === 0) { cell.chain = b.hp; n--; }
        } else if (b.kind === 'amber') {
          if (!cell.blk && cell.amber === 0) { cell.amber = b.hp; n--; }
        } else if (b.kind === 'honey') {
          if (!cell.blk && cell.honey === 0) { cell.honey = b.hp; n--; }
        } else { /* crate, stone, coal, crow, vine occupy cell */
          if (cell.t === -1 && !cell.blk && cell.ice === 0) { cell.blk = { k: b.kind, hp: b.hp }; n--; }
        }
      }
    }, this);
    /* luggage pieces at top */
    var lug = this.cfg.lugCount || 0;
    for (i = 0; i < lug; i++) {
      c = Math.floor(this.rnd() * this.cols);
      var rr2 = i % 2;
      var cc = this.grid[rr2][c];
      if (!cc.blk && cc.t === -1 && !cc.hole) { cc.t = this.rt(); cc.lug = true; }
    }
    /* aurora cells region 6 */
    if (this.cfg.reg === 6 || this.boss === 6) {
      for (r = 0; r < this.rows; r++) for (c = 0; c < this.cols; c++) if (this.rnd() < 0.16) this.grid[r][c].aurora = true;
    }
    /* rail columns region 4 */
    if (this.cfg.reg === 4) {
      for (r = 0; r < this.rows; r++) { this.grid[r][1].rail = true; this.grid[r][5].rail = true; }
    }
    /* conveyors & portals */
    (this.cfg.belts || []).forEach(function (bl) {
      var cl = this.grid[bl.r] && this.grid[bl.r][bl.c];
      if (cl && !cl.hole) cl.belt = bl.dir + 1;
    }, this);
    if (this.cfg.portals) {
      var pa = this.at(this.cfg.portals.a.r, this.cfg.portals.a.c);
      var pb = this.at(this.cfg.portals.b.r, this.cfg.portals.b.c);
      if (pa && !pa.hole && pb && !pb.hole) { pa.portal = 1; pb.portal = 2; }
    }
    /* fill pieces avoiding initial matches */
    for (r = 0; r < this.rows; r++) for (c = 0; c < this.cols; c++) {
      var cl = this.grid[r][c];
      if (cl.t === -1 && !cl.blk && !cl.hole) cl.t = this.safeType(r, c);
    }
    var att = 0;
    while (!this.hasMoves() && att++ < 30) this.shuffle(true);
  };
  Board.prototype.rt = function () { return Math.floor(this.rnd() * this.cfg.colors); };
  Board.prototype.darkAll = function () {
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) this.grid[r][c].dark = true;
    this.light(3, 3, 2);
  };
  Board.prototype.light = function (r, c, rad) {
    for (var y = Math.max(0, r - rad); y <= Math.min(this.rows - 1, r + rad); y++)
      for (var x = Math.max(0, c - rad); x <= Math.min(this.cols - 1, c + rad); x++) this.grid[y][x].lit = true;
  };
  Board.prototype.safeType = function (r, c) {
    for (var tries = 0; tries < 20; tries++) {
      var t = this.rt(), bad = false;
      if (c >= 2 && this.grid[r][c - 1].t === t && this.grid[r][c - 2].t === t) bad = true;
      if (r >= 2 && this.grid[r - 1][c].t === t && this.grid[r - 2][c].t === t) bad = true;
      if (!bad) return t;
    }
    return this.rt();
  };

  Board.prototype.snap = function () {
    return this.grid.map(function (row) {
      return row.map(function (cl) {
        return { t: cl.t, sp: cl.sp, ice: cl.ice, chain: cl.chain, amber: cl.amber, honey: cl.honey,
          lug: cl.lug, blk: cl.blk ? { k: cl.blk.k, hp: cl.blk.hp } : null, dark: cl.dark, lit: cl.lit,
          aurora: cl.aurora, rail: cl.rail, hole: cl.hole, belt: cl.belt, portal: cl.portal };
      });
    });
  };
  Board.prototype.addStep = function (obj) { obj.snap = this.snap(); this.steps.push(obj); return obj; };

  /* ---------------- helpers ---------------- */
  Board.prototype.at = function (r, c) { return (r < 0 || c < 0 || r >= this.rows || c >= this.cols) ? null : this.grid[r][c]; };
  Board.prototype.swappable = function (r, c) {
    var cl = this.at(r, c);
    if (!cl || cl.blk || cl.t < 0 || cl.chain || cl.amber || cl.lug || cl.hole) return false;
    if (this.boss === 6 && !cl.lit) return false;
    return true;
  };
  Board.prototype.matchable = function (cl) { return cl && cl.t >= 0 && !cl.blk && !cl.chain && !cl.amber && !cl.hole; };

  Board.prototype.findRuns = function () {
    var runs = [], r, c, cl;
    for (r = 0; r < this.rows; r++) {
      c = 0;
      while (c < this.cols) {
        cl = this.grid[r][c];
        if (!this.matchable(cl) || (this.boss === 6 && !cl.lit)) { c++; continue; }
        var len = 1;
        while (c + len < this.cols && this.matchable(this.grid[r][c + len]) && this.grid[r][c + len].t === cl.t && !(this.boss === 6 && !this.grid[r][c + len].lit)) len++;
        if (len >= 3) runs.push({ dir: 'h', r: r, c: c, n: len, t: cl.t });
        c += len;
      }
    }
    for (c = 0; c < this.cols; c++) {
      r = 0;
      while (r < this.rows) {
        cl = this.grid[r][c];
        if (!this.matchable(cl) || (this.boss === 6 && !cl.lit)) { r++; continue; }
        var len2 = 1;
        while (r + len2 < this.rows && this.matchable(this.grid[r + len2][c]) && this.grid[r + len2][c].t === cl.t && !(this.boss === 6 && !this.grid[r + len2].lit)) len2++;
        if (len2 >= 3) runs.push({ dir: 'v', r: r, c: c, n: len2, t: cl.t });
        r += len2;
      }
    }
    return runs;
  };

  Board.prototype.hasMoves = function () {
    var r, c;
    for (r = 0; r < this.rows; r++) for (c = 0; c < this.cols; c++) {
      var cl = this.grid[r][c];
      if (cl.sp === 'orb' && this.swappable(r, c)) return true;
      if (this.swappable(r, c) && this.swappable(r, c + 1)) { if (this.swapMakes(r, c, r, c + 1)) return true; }
      if (this.swappable(r, c) && this.swappable(r + 1, c)) { if (this.swapMakes(r, c, r + 1, c)) return true; }
    }
    return false;
  };
  Board.prototype.swapMakes = function (r1, c1, r2, c2) {
    var a = this.grid[r1][c1], b = this.grid[r2][c2];
    if (a.sp === 'orb' || b.sp === 'orb') return true;   /* orb activates on any swap */
    if (a.sp || b.sp) { /* line/bomb only swap when they form a match, exactly like trySwap */ }
    var tmp = a.t; a.t = b.t; b.t = tmp;
    var ok = this.runsAt(r1, c1) || this.runsAt(r2, c2);
    b.t = a.t; a.t = tmp;
    return ok;
  };
  Board.prototype.runsAt = function (r, c) {
    var cl = this.grid[r][c];
    if (!this.matchable(cl)) return false;
    var n = 1, i;
    for (i = c - 1; i >= 0 && this.grid[r][i].t === cl.t && this.matchable(this.grid[r][i]); i--) n++;
    for (i = c + 1; i < this.cols && this.grid[r][i].t === cl.t && this.matchable(this.grid[r][i]); i++) n++;
    if (n >= 3) return true;
    n = 1;
    for (i = r - 1; i >= 0 && this.grid[i][c].t === cl.t && this.matchable(this.grid[i][c]); i--) n++;
    for (i = r + 1; i < this.rows && this.grid[i][c].t === cl.t && this.matchable(this.grid[i][c]); i++) n++;
    return n >= 3;
  };

  Board.prototype.shuffle = function (silent) {
    var self2 = this;
    var cells = [], r, c;
    for (r = 0; r < this.rows; r++) for (c = 0; c < this.cols; c++) {
      var cl = this.grid[r][c];
      if (cl.t >= 0 && !cl.blk && !cl.chain && !cl.amber && !cl.lug && !cl.hole) cells.push(cl);
    }
    for (var tries = 0; tries < 80; tries++) {
      var cells2 = cells.filter(function (x) { return !x.chain && !x.amber && (self2.boss !== 6 || x.lit); });
      if (cells2.length < 8) cells2 = cells;
      var types = cells2.map(function (x) { return x.t; });
      for (var i = types.length - 1; i > 0; i--) { var j = Math.floor(this.rnd() * (i + 1)); var tt = types[i]; types[i] = types[j]; types[j] = tt; }
      cells2.forEach(function (x, k) { x.t = types[k]; });
      /* break accidental matches */
      var runs = this.findRuns();
      if (runs.length === 0 && this.hasMoves()) break;
      if (tries === 79) { /* force: guaranteed potential move, 4 orientations */
        var ORS = [
          function (r2, c2) { return { q: [[r2, c2], [r2, c2 + 1], [r2, c2 + 2], [r2 + 1, c2 + 1]], x: [0, 2, 3] }; },
          function (r2, c2) { return { q: [[r2, c2], [r2, c2 + 1], [r2, c2 + 2], [r2 - 1, c2 + 1]], x: [0, 2, 3] }; },
          function (r2, c2) { return { q: [[r2, c2], [r2 + 1, c2], [r2 + 2, c2], [r2 + 1, c2 + 1]], x: [0, 2, 3] }; },
          function (r2, c2) { return { q: [[r2, c2], [r2 + 1, c2], [r2 + 2, c2], [r2 + 1, c2 - 1]], x: [0, 2, 3] }; }
        ];
        outer:
        for (var o = 0; o < 4; o++) for (var r2 = 1; r2 < this.rows - 2; r2++) for (var c2 = 1; c2 < this.cols - 2; c2++) {
          var spec = ORS[o](r2, c2);
          var okq = spec.q.every(function (rc3) {
            if (rc3[0] < 0 || rc3[0] >= self2.rows || rc3[1] < 0 || rc3[1] >= self2.cols) return false;
            var cl3 = self2.grid[rc3[0]][rc3[1]];
            return !cl3.blk && !cl3.lug && !cl3.hole && !cl3.chain && !cl3.amber && cl3.t >= 0 && (self2.boss !== 6 || cl3.lit);
          });
          if (okq) {
            var X = this.rt(), Y = (X + 1) % this.cfg.colors;
            for (var k4 = 0; k4 < 4; k4++) this.grid[spec.q[k4][0]][spec.q[k4][1]].t = spec.x.indexOf(k4) >= 0 ? X : Y;
            break outer;
          }
        }
      }
    }
    if (!silent) this.addStep({ type: 'shuffle' });
  };

  /* ---------------- swap & resolve ---------------- */
  Board.prototype.trySwap = function (r1, c1, r2, c2) {
    if (this.over) return { ok: false };
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return { ok: false };
    if (!this.swappable(r1, c1) || !this.swappable(r2, c2)) return { ok: false };
    var a = this.grid[r1][c1], b = this.grid[r2][c2];
    this.steps = [];
    var tmp = a.t; a.t = b.t; b.t = tmp;
    var sp = a.sp; a.sp = b.sp; b.sp = sp;
    var lul = a.lug; a.lug = b.lug; b.lug = lul;   /* luggage never swappable, kept for safety */
    this.addStep({ type: 'swap', a: { r: r1, c: c1 }, b: { r: r2, c: c2 } });
    var runs = this.findRuns();
    var orbSwap = (a.sp === 'orb' || b.sp === 'orb');
    if (runs.length === 0 && !orbSwap) {
      var t2 = a.t; a.t = b.t; b.t = t2;
      var sp2 = a.sp; a.sp = b.sp; b.sp = sp2;
      this.addStep({ type: 'swapback', a: { r: r1, c: c1 }, b: { r: r2, c: c2 } });
      return { ok: false, steps: this.steps };
    }
    this.moves--;
    this.moveCount++;
    if (orbSwap) {
      if (a.sp === 'orb') this.fireOrb(r1, c1, b.t >= 0 ? b.t : this.rt());
      if (b.sp === 'orb') this.fireOrb(r2, c2, a.t >= 0 ? a.t : this.rt());
    }
    this.resolve();
    this.endOfMove();
    return { ok: true, steps: this.steps };
  };

  /* collect cleared cells for one cascade wave */
  Board.prototype.resolve = function () {
    var cascade = 0;
    while (true) {
      var runs = this.findRuns();
      if (!runs.length) break;
      cascade++;
      this.cascadeMax = Math.max(this.cascadeMax, cascade);
      var clear = {};   // "r,c" -> true
      var specials = [];
      var self = this;
      /* mark run cells; detect intersections for bomb */
      var inH = {}, inV = {};
      runs.forEach(function (run) {
        for (var i = 0; i < run.n; i++) {
          var key = (run.dir === 'h' ? run.r : run.r + i) + ',' + (run.dir === 'h' ? run.c + i : run.c);
          clear[key] = true;
          if (run.dir === 'h') inH[key] = run; else inV[key] = run;
        }
      });
      /* specials creation */
      runs.forEach(function (run) {
        if (run.n >= 5) specials.push({ r: run.dir === 'h' ? run.r : run.r + 2, c: run.dir === 'h' ? run.c + 2 : run.c, kind: 'orb' });
        else if (run.n === 4) specials.push({ r: run.dir === 'h' ? run.r : run.r + 1, c: run.dir === 'h' ? run.c + 1 : run.c, kind: run.dir === 'h' ? 'lineH' : 'lineV' });
      });
      for (var key2 in clear) { if (inH[key2] && inV[key2]) specials.push({ r: +key2.split(',')[0], c: +key2.split(',')[1], kind: 'bomb' }); }
      /* chain-trigger specials caught in clear */
      var queue = [];
      for (var k in clear) {
        var pp = k.split(','), cl = this.grid[+pp[0]][+pp[1]];
        if (cl.sp) queue.push({ r: +pp[0], c: +pp[1], kind: cl.sp });
      }
      while (queue.length) {
        var q = queue.pop();
        this.specialCells(q.r, q.c, q.kind).forEach(function (rc) {
          var kk = rc.r + ',' + rc.c;
          if (!clear[kk]) {
            clear[kk] = true;
            var cc = self.grid[rc.r][rc.c];
            if (cc.sp) queue.push({ r: rc.r, c: rc.c, kind: cc.sp });
          }
        });
        specials.push({ r: q.r, c: q.c, kind: q.kind, fired: true });
      }
      /* apply damage */
      var cellsList = Object.keys(clear).map(function (k3) { var q3 = k3.split(','); return { r: +q3[0], c: +q3[1] }; });
      this.applyClear(cellsList, cascade, specials);
      /* gravity + refill */
      this.addStep(this.gravityStep());
      if (this.checkWin()) break;
    }
    if (cascade >= 2) this.addStep({ type: 'cascade', n: cascade });
    /* charge whistle */
    if (cascade > 0) {
      this.charge = Math.min(100, this.charge + 6 * cascade + 2 * cascade);
      if (this.charge >= 100) { this.charges++; this.charge = 0; this.addStep({ type: 'whistleReady' }); }
    }
    if (!this.over && !this.hasMoves()) { this.shuffle(); this.addStep({ type: 'nomoves' }); }
  };

  Board.prototype.specialCells = function (r, c, kind) {
    var out = [], i;
    var self = this;
    function ok(rc) { var cl = self.at(rc.r, rc.c); return cl && !cl.hole; }
    if (kind === 'lineH') { for (i = 0; i < this.cols; i++) out.push({ r: r, c: i }); }
    else if (kind === 'lineV') { for (i = 0; i < this.rows; i++) out.push({ r: i, c: c }); }
    else if (kind === 'bomb') {
      for (i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) if (this.at(r + i, c + j)) out.push({ r: r + i, c: c + j });
    } else if (kind === 'whistle') {
      for (i = 0; i < this.cols; i++) out.push({ r: r, c: i });
      for (i = 0; i < this.rows; i++) out.push({ r: i, c: c });
    }
    return out.filter(ok);
  };

  Board.prototype.fireOrb = function (r, c, targetT) {
    var self = this, cells = [];
    for (var y = 0; y < this.rows; y++) for (var x = 0; x < this.cols; x++) if (this.grid[y][x].t === targetT) cells.push({ r: y, c: x });
    cells.push({ r: r, c: c });
    this.addStep({ type: 'specialFire', kind: 'orb', cells: cells });
    this.applyClear(cells, 1, []);
    this.addStep(this.gravityStep());
  };

  Board.prototype.applyClear = function (cells, cascade, specials) {
    var self = this;
    this.chainDmg = []; this.amberDmg = [];
    var dmg = {};       // neighbor block damage
    var clearedInfo = [];
    var specAt = {};
    specials.forEach(function (s) { specAt[s.r + ',' + s.c] = s; });
    cells.forEach(function (rc) {
      var cl = self.grid[rc.r][rc.c];
      if (!cl) return;
      var info = { r: rc.r, c: rc.c, t: cl.t, lug: cl.lug, sp: cl.sp };
      /* overlays on cleared cell */
      if (cl.ice > 0) { cl.ice--; self.goalHit('ice', 1); info.ice = cl.ice; }
      if (cl.honey > 0) { cl.honey--; self.goalHit('honey', 1); }
      if (cl.chain > 0) { /* chained piece isn't matchable; only special-hit breaks */ cl.chain--; self.goalHit('chain', 1); }
      if (cl.amber > 0) { cl.amber--; self.goalHit('amber', 1); }
      if (cl.blk) { cl.blk.hp--; if (cl.blk.hp <= 0) { self.goalHit(cl.blk.k, 1); cl.blk = null; } }
      /* piece removed? */
      var removed = cl.t >= 0 && !cl.chain && !cl.amber || cl.sp || true;
      if (cl.t >= 0) {
        self.goalHit('t:' + cl.t, 1);
        self.clearedCounts[cl.t] = (self.clearedCounts[cl.t] || 0) + 1;
        if (cl.rail) self.coinsEarned += 1;
      }
      if (cl.lug) { /* luggage destroyed by special: counts as delivered only at bottom; here just removed */ }
      /* sp fired */
      if (cl.sp && !specAt[rc.r + ',' + rc.c]) { /* chained trigger handled by queue */ }
      cl.t = -1; cl.sp = null; cl.lug = false;
      clearedInfo.push(info);
      /* neighbor damage */
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nr = rc.r + d[0], nc = rc.c + d[1];
        var nb = self.at(nr, nc);
        if (!nb) return;
        if (nb.blk) {
          var kk = nr + ',' + nc;
          dmg[kk] = (dmg[kk] || 0) + 1;
        }
        /* chains & amber loosen from adjacent matches */
        if (nb.chain > 0) { nb.chain--; self.chainDmg = self.chainDmg || []; self.chainDmg.push({ r: nr, c: nc, v: nb.chain }); }
        if (nb.amber > 0) { nb.amber--; self.goalHit('amber', 1); self.amberDmg = self.amberDmg || []; self.amberDmg.push({ r: nr, c: nc, v: nb.amber }); }
      });
    });
    /* specials to spawn (on now-empty cells) */
    specials.forEach(function (s) {
      if (s.fired) return;
      var cl2 = self.grid[s.r][s.c];
      cl2.t = -1; cl2.sp = s.kind; cl2.chain = 0; cl2.amber = 0;
      self.specialsMade++;
    });
    /* apply neighbor block damage */
    var dmgList = [];
    for (var k in dmg) {
      var pp = k.split(','), nb2 = this.grid[+pp[0]][+pp[1]];
      nb2.blk.hp -= dmg[k];
      if (nb2.blk.hp <= 0) { this.goalHit(nb2.blk.k, 1); if (nb2.blk.k === 'crow') { nb2.blk = null; } else { nb2.blk = null; } }
      dmgList.push({ r: +pp[0], c: +pp[1], hp: nb2.blk ? nb2.blk.hp : 0, dead: !nb2.blk });
    }
    this.addStep({ type: 'match', cells: clearedInfo, cascade: cascade, specials: specials, dmg: dmgList });
    if (this.boss === 6) cells.forEach(function (rc2) { self.light(rc2.r, rc2.c, 1); });
  };

  Board.prototype.gravityStep = function () {
    var moves = [], spawn = [], r, c;
    for (c = 0; c < this.cols; c++) {
      var changed = true, guard = 0;
      while (changed && guard++ < 12) {
        changed = false;
        var write = this.rows - 1;
        for (r = this.rows - 1; r >= 0; r--) {
          var cl = this.grid[r][c];
          if (cl.hole) continue;                            /* holes: pieces fall through */
          if (cl.blk) { write = r - 1; continue; }          /* blocks don't fall */
          if (cl.t >= 0 || cl.sp) {
            if (write !== r) {
              var dst = this.grid[write][c];
              dst.t = cl.t; dst.sp = cl.sp; dst.lug = cl.lug; dst.aurora = cl.aurora;
              cl.t = -1; cl.sp = null; cl.lug = false;
              moves.push({ c: c, from: r, to: write, lug: dst.lug });
              changed = true;
              /* luggage delivered? */
              if (dst.lug && write === this.rows - 1) {
                this.goalHit('lug', 1);
                dst.t = -1; dst.lug = false; dst.sp = null;
                moves[moves.length - 1].deliver = true;
                changed = true;
              }
            }
            write--;
          }
        }
      }
      /* refill any empty non-block cell (contiguous top after compaction) */
      for (r = this.rows - 1; r >= 0; r--) {
        var cl2 = this.grid[r][c];
        if (cl2.blk || cl2.hole) continue;
        if (cl2.t < 0 && !cl2.sp) {
          cl2.t = this.rt(); cl2.sp = null;
          if (this.cfg.reg === 6 || this.boss === 6) cl2.aurora = this.rnd() < 0.10;
          spawn.push({ c: c, r: r, t: cl2.t });
        }
      }
    }
    return { type: 'fall', moves: moves, spawn: spawn };
  };

  Board.prototype.endOfMove = function () {
    /* aurora recolor */
    if (this.cfg.reg === 6 || this.boss === 6) {
      for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) {
        var cl = this.grid[r][c];
        if (cl.aurora && cl.t >= 0 && !cl.blk && !cl.hole) cl.t = this.rt();
      }
      this.addStep({ type: 'aurora' });
    }
    this.beltShift(); this.portalFlow(); this.honeySpread();
    if (!this.over && this.findRuns().length) this.resolve();   /* mechanics-born matches resolve immediately */
    /* boss mechanics per move */
    if (this.boss === 2 && this.moveCount % 3 === 0) this.bossSteal();
    if (this.boss === 4 && this.moveCount % 3 === 0) this.bossRocks();
    if (this.boss === 7) this.bossVines();
    if (!this.over && !this.hasMoves()) { this.shuffle(); this.addStep({ type: 'nomoves' }); }
    this.checkWin();
    if (!this.over && this.moves <= 0) { this.over = true; this.win = false; this.addStep({ type: 'lose' }); }
  };

  Board.prototype.bossSteal = function () {
    var cands = [];
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) {
      var cl = this.grid[r][c];
      if (cl.t >= 0 && !cl.blk && !cl.lug && !cl.sp) cands.push({ r: r, c: c });
    }
    if (!cands.length) return;
    var p = cands[Math.floor(this.rnd() * cands.length)];
    this.grid[p.r][p.c].t = -1; this.grid[p.r][p.c].blk = { k: 'crow', hp: 1 };
    this.addStep({ type: 'bossSteal', r: p.r, c: p.c });
  };
  Board.prototype.bossRocks = function () {
    var c = Math.floor(this.rnd() * this.cols);
    for (var r = 0; r < this.rows; r++) {
      var cl = this.grid[r][c];
      if (!cl.blk && cl.t === -1) { cl.blk = { k: 'stone', hp: 2 }; this.addStep({ type: 'bossRock', r: r, c: c }); return; }
    }
  };
  Board.prototype.bossVines = function () {
    var n = 2;
    for (var t = 0; t < 30 && n > 0; t++) {
      var r = Math.floor(this.rnd() * this.rows), c = Math.floor(this.rnd() * this.cols);
      var cl = this.grid[r][c];
      if (cl.t === -1 && !cl.blk && cl.ice === 0) { cl.blk = { k: 'vine', hp: 1 }; n--; this.addStep({ type: 'bossVine', r: r, c: c }); }
    }
  };

  Board.prototype.beltShift = function () {
    if (this.moveCount % 2 !== 0) return;
    var moves = [], moved = {}, self = this;
    (this.cfg.belts || []).forEach(function (bl) {
      var dc = bl.dir === 0 ? 1 : -1;
      var a = self.at(bl.r, bl.c), b2 = self.at(bl.r, bl.c + dc);
      var ka = bl.r + ',' + bl.c, kb = bl.r + ',' + (bl.c + dc);
      if (!a || !b2 || a.hole || b2.hole || a.blk || b2.blk || moved[ka] || moved[kb]) return;
      var aHas = (a.t >= 0 || a.sp) && !a.lug, bHas = (b2.t >= 0 || b2.sp) && !b2.lug;
      if (aHas && bHas) {
        var t = a.t, sp = a.sp; a.t = b2.t; a.sp = b2.sp; b2.t = t; b2.sp = sp;
        moved[ka] = moved[kb] = 1; moves.push({ r: bl.r, c: bl.c, c2: bl.c + dc });
        self.statsBelts = (self.statsBelts || 0) + 1;
      }
    });
    if (moves.length) this.addStep({ type: 'belt', moves: moves });
  };
  Board.prototype.portalFlow = function () {
    if (!this.cfg.portals) return;
    var self = this, moves = [];
    var pr = this.cfg.portals;
    [[pr.a, pr.b], [pr.b, pr.a]].forEach(function (pp) {
      var A = self.at(pp[0].r, pp[0].c), B = self.at(pp[1].r, pp[1].c);
      if (A && !A.hole && !A.blk && (A.t >= 0 || A.sp) && !A.lug && B && !B.hole && !B.blk && B.t === -1 && !B.sp) {
        B.t = A.t; B.sp = A.sp; A.t = -1; A.sp = null;
        moves.push({ from: pp[0], to: pp[1] });
        self.statsPortals = (self.statsPortals || 0) + 1;
      }
    });
    if (moves.length) this.addStep({ type: 'portal', moves: moves });
  };
  Board.prototype.honeySpread = function () {
    if (!this.cfg.spread || this.moveCount % this.cfg.spread !== 0) return;
    var self = this, cells = [], srcs = [];
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) if (this.grid[r][c].honey > 0) srcs.push({ r: r, c: c });
    if (srcs.length) srcs = [srcs[Math.floor(self.rnd() * srcs.length)]];
    srcs.forEach(function (sc) {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(function () { return self.rnd() - 0.5; });
      for (var i = 0; i < dirs.length; i++) {
        var nb = self.at(sc.r + dirs[i][0], sc.c + dirs[i][1]);
        if (nb && !nb.hole && !nb.blk && nb.t >= 0 && nb.honey === 0 && !nb.lug) {
          nb.honey = 1; cells.push({ r: sc.r + dirs[i][0], c: sc.c + dirs[i][1] });
          break;
        }
      }
    });
    if (cells.length) this.addStep({ type: 'spread', cells: cells });
  };
  Board.prototype.swapAny = function (r1, c1, r2, c2) {
    if (this.over) return { ok: false };
    if (!this.swappable(r1, c1) || !this.swappable(r2, c2)) return { ok: false };
    var a = this.grid[r1][c1], b = this.grid[r2][c2];
    this.steps = [];
    var t = a.t; a.t = b.t; b.t = t; var sp = a.sp; a.sp = b.sp; b.sp = sp;
    this.addStep({ type: 'swap', a: { r: r1, c: c1 }, b: { r: r2, c: c2 } });
    this.moves--; this.moveCount++;
    this.resolve(); this.endOfMove();
    return { ok: true, steps: this.steps };
  };
  Board.prototype.clearColor = function (tt) {
    if (this.over || tt == null || tt < 0) return null;
    this.steps = [];
    var cells = [], self = this;
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) {
      var cl = this.grid[r][c];
      if (cl.t === tt && !cl.hole) cells.push({ r: r, c: c });
    }
    if (!cells.length) return null;
    this.addStep({ type: 'specialFire', kind: 'orb', cells: cells });
    this.applyClear(cells, 1, []);
    this.addStep(this.gravityStep());
    this.resolve(); this.endOfMove();
    return this.steps;
  };
  Board.prototype.goalHit = function (kind, n) {
    if (!n) return;
    for (var i = 0; i < this.goals.length; i++) {
      var g = this.goals[i];
      if (g.k === 't' && kind === 't:' + g.t) g.got = Math.min(g.n, g.got + n);
      else if (g.k === kind && g.k !== 't') g.got = Math.min(g.n, g.got + n);
    }
  };
  Board.prototype.checkWin = function () {
    if (this.over) return this.win;
    var ok = this.goals.every(function (g) { return g.got >= g.n; });
    if (ok) { this.over = true; this.win = true; this.addStep({ type: 'win' }); }
    return ok;
  };

  /* ---------------- player tools ---------------- */
  Board.prototype.useWhistle = function (r, c) {
    if (this.charges <= 0 || this.over) return null;
    var tc = this.at(r, c); if (!tc || tc.hole) return null;
    this.charges--; this.whistleUses++;
    this.steps = [];
    var cells = this.specialCells(r, c, 'whistle');
    this.addStep({ type: 'whistle', r: r, c: c, cells: cells });
    var self = this;
    cells.forEach(function (rc) {
      var cl = self.grid[rc.r][rc.c];
      if (cl.blk) { cl.blk.hp -= 2; if (cl.blk.hp <= 0) { self.goalHit(cl.blk.k, 1); cl.blk = null; } }
      if (cl.ice > 0) { cl.ice--; self.goalHit('ice', 1); }
      if (cl.honey > 0) { cl.honey--; self.goalHit('honey', 1); }
      if (cl.chain > 0) cl.chain--;
      if (cl.amber > 0) { cl.amber--; if (cl.amber === 0) self.goalHit('amber', 1); }
      if (cl.t >= 0) self.goalHit('t:' + cl.t, 1);
      cl.t = -1; cl.sp = null; cl.lug = false;
    });
    this.addStep(this.gravityStep());
    this.resolve();
    this.endOfMove();
    return this.steps;
  };
  Board.prototype.useHammer = function (r, c) {
    var cl = this.at(r, c);
    if (!cl || this.over || cl.hole) return null;
    this.steps = [];
    if (cl.blk) { cl.blk.hp -= 3; if (cl.blk.hp <= 0) { this.goalHit(cl.blk.k, 1); cl.blk = null; } }
    if (cl.ice > 0) { cl.ice--; this.goalHit('ice', 1); }
    if (cl.honey > 0) { cl.honey--; this.goalHit('honey', 1); }
    cl.chain = 0; cl.amber = 0;
    if (cl.t >= 0) { this.goalHit('t:' + cl.t, 1); cl.t = -1; cl.sp = null; cl.lug = false; }
    this.addStep({ type: 'hammer', r: r, c: c });
    this.addStep(this.gravityStep());
    this.resolve();
    this.endOfMove();
    return this.steps;
  };
  Board.prototype.doShuffle = function () { this.steps = []; this.shuffle(); return this.steps; };
  Board.prototype.addMoves = function (n) { this.moves += n; this.movesTotal += n; if (this.over && !this.win) { this.over = false; } };

  window.MEBoard = Board;
})();
