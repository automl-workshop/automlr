(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let STEEL = [127, 161, 193];
  let BRIGHT = [198, 220, 240];
  let INK = [236, 234, 227];
  let SURFACE = [19, 19, 22];
  const DURATION = 14;

  function cssColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const hex = value.match(/^#([\da-f]{6})$/i)?.[1];
    return hex ? [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) : fallback;
  }

  function syncTheme() {
    STEEL = cssColor("--accent", STEEL);
    BRIGHT = cssColor("--accent-bright", BRIGHT);
    INK = cssColor("--ink", INK);
    SURFACE = cssColor("--surface", SURFACE);
  }

  syncTheme();
  window.addEventListener("automlr:themechange", syncTheme);

  const timeParam = new URLSearchParams(location.search).get("t");
  const frozenTime = timeParam !== null && Number.isFinite(Number(timeParam))
    ? Math.max(0, Math.min(DURATION - .01, Number(timeParam)))
    : null;

  const rgba = (rgb, alpha = 1) => `rgba(${rgb.join(",")},${alpha})`;
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const ease = (n) => {
    const t = clamp(n);
    return t * t * (3 - 2 * t);
  };
  const progress = (time, start, end) => ease((time - start) / (end - start));
  const mix = (a, b, t) => a + (b - a) * ease(t);

  function bezierPoint(curve, t) {
    const u = 1 - t;
    return {
      x: u ** 3 * curve[0].x + 3 * u ** 2 * t * curve[1].x + 3 * u * t ** 2 * curve[2].x + t ** 3 * curve[3].x,
      y: u ** 3 * curve[0].y + 3 * u ** 2 * t * curve[1].y + 3 * u * t ** 2 * curve[2].y + t ** 3 * curve[3].y
    };
  }

  function drawBezier(ctx, curve, amount, alpha, dashed = false) {
    const steps = 36;
    const end = Math.max(1, Math.floor(steps * clamp(amount)));
    ctx.save();
    ctx.strokeStyle = rgba(STEEL, alpha);
    ctx.lineWidth = 1;
    ctx.setLineDash(dashed ? [2, 7] : []);
    ctx.beginPath();
    for (let i = 0; i <= end; i++) {
      const p = bezierPoint(curve, i / steps);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawSignal(ctx, curve, position, alpha = 1, reverse = false) {
    const p = bezierPoint(curve, reverse ? 1 - position : position);
    ctx.save();
    ctx.fillStyle = rgba(BRIGHT, alpha);
    ctx.shadowColor = rgba(BRIGHT, alpha * .6);
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawHypothesis(ctx, x, y, scale, alpha, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(STEEL, .72);
    ctx.fillStyle = rgba(STEEL, .72);
    ctx.lineWidth = 1;
    const sway = Math.sin(time * 1.7) * 3 * scale;
    const tips = [
      { x: -34 * scale, y: -25 * scale + sway },
      { x: 2 * scale, y: -39 * scale - sway * .5 },
      { x: 37 * scale, y: -20 * scale + sway * .3 },
      { x: -24 * scale, y: 29 * scale - sway * .4 },
      { x: 31 * scale, y: 27 * scale + sway * .5 }
    ];
    tips.forEach((tip, i) => {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(tip.x * .5, tip.y * .2, tip.x, tip.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(tip.x, tip.y, i === 2 ? 4 * scale : 2.5 * scale, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = rgba(BRIGHT, .95);
    ctx.beginPath(); ctx.arc(0, 0, 4.5 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(BRIGHT, .28 + .18 * (.5 + .5 * Math.sin(time * 2.3)));
    ctx.beginPath(); ctx.arc(tips[2].x, tips[2].y, 9 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawExperiment(ctx, x, y, scale, alpha, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    const size = 7 * scale;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const active = (row * 5 + col + Math.floor(time * 3)) % 7 === 0;
        ctx.fillStyle = rgba(active ? BRIGHT : STEEL, active ? .92 : .24 + ((row + col) % 3) * .12);
        ctx.fillRect((col - 2) * size * 1.65 - size / 2, (row - 1.5) * size * 1.65 - size / 2, size, size);
      }
    }
    ctx.strokeStyle = rgba(STEEL, .38);
    ctx.strokeRect(-49 * scale, -36 * scale, 98 * scale, 72 * scale);
    const scan = ((time * .34) % 1) * 68 * scale - 34 * scale;
    ctx.strokeStyle = rgba(BRIGHT, .58);
    ctx.beginPath(); ctx.moveTo(-46 * scale, scan); ctx.lineTo(46 * scale, scan); ctx.stroke();
    ctx.restore();
  }

  function drawPlot(ctx, x, y, scale, alpha, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(STEEL, .48);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-48 * scale, 34 * scale); ctx.lineTo(-48 * scale, -34 * scale); ctx.moveTo(-48 * scale, 34 * scale); ctx.lineTo(50 * scale, 34 * scale); ctx.stroke();
    const lift = Math.sin(time * 1.1) * 5 * scale;
    ctx.strokeStyle = rgba(BRIGHT, .84);
    ctx.beginPath();
    ctx.moveTo(-42 * scale, 27 * scale);
    ctx.bezierCurveTo(-22 * scale, 25 * scale, -19 * scale, -7 * scale + lift, 0, 3 * scale);
    ctx.bezierCurveTo(18 * scale, 13 * scale, 25 * scale, -25 * scale - lift * .3, 45 * scale, -27 * scale);
    ctx.stroke();
    [-30, -8, 18, 39].forEach((xx, i) => {
      const yy = [20, 5, -4, -24][i] * scale + (i % 2 ? lift * .3 : 0);
      ctx.fillStyle = rgba(BRIGHT, .9);
      ctx.beginPath(); ctx.arc(xx * scale, yy, 2.4 * scale, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawIteration(ctx, x, y, scale, alpha, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;

    const radius = 34 * scale;
    const rotation = time * .72;
    const nodes = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6];

    // An incomplete circular track and arrowhead make the iterative direction
    // legible without turning the study into a labeled process diagram.
    ctx.strokeStyle = rgba(STEEL, .42);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, radius, -.38, Math.PI * 1.75); ctx.stroke();
    const arrowAngle = -.38;
    const ax = Math.cos(arrowAngle) * radius;
    const ay = Math.sin(arrowAngle) * radius;
    ctx.fillStyle = rgba(STEEL, .62);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 8 * scale, ay - 1 * scale);
    ctx.lineTo(ax - 4 * scale, ay + 7 * scale);
    ctx.closePath(); ctx.fill();

    nodes.forEach((angle, i) => {
      const nx = Math.cos(angle) * radius;
      const ny = Math.sin(angle) * radius;
      const active = Math.floor(time * 1.25) % nodes.length === i;
      ctx.strokeStyle = rgba(active ? BRIGHT : STEEL, active ? .95 : .5);
      ctx.fillStyle = rgba(active ? BRIGHT : STEEL, active ? .22 : .08);
      if (i === 0) {
        ctx.fillRect(nx - 5 * scale, ny - 5 * scale, 10 * scale, 10 * scale);
        ctx.strokeRect(nx - 5 * scale, ny - 5 * scale, 10 * scale, 10 * scale);
      } else if (i === 1) {
        ctx.beginPath(); ctx.arc(nx, ny, 5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.save(); ctx.translate(nx, ny); ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4.5 * scale, -4.5 * scale, 9 * scale, 9 * scale);
        ctx.strokeRect(-4.5 * scale, -4.5 * scale, 9 * scale, 9 * scale);
        ctx.restore();
      }
    });

    const px = Math.cos(rotation) * radius;
    const py = Math.sin(rotation) * radius;
    ctx.fillStyle = rgba(BRIGHT, .96);
    ctx.shadowColor = rgba(BRIGHT, .6);
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px, py, 2.6 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // The center changes on every pass, suggesting the state is being revised.
    const inner = .5 + .5 * Math.sin(time * 2.5);
    ctx.strokeStyle = rgba(BRIGHT, .3 + inner * .35);
    ctx.beginPath();
    ctx.moveTo(-11 * scale, -4 * scale); ctx.lineTo((3 + inner * 8) * scale, -4 * scale);
    ctx.moveTo(-11 * scale, 5 * scale); ctx.lineTo((8 - inner * 6) * scale, 5 * scale);
    ctx.stroke();
    ctx.restore();
  }

  function drawPaper(ctx, cx, cy, pw, ph, time, alpha) {
    const appear = progress(time, .2, 1.2);
    const writing = progress(time, 2.2, 7.8);
    const complete = progress(time, 6.6, 8.9);
    const pulse = .5 + .5 * Math.sin(time * 2.4);

    ctx.save();
    ctx.globalAlpha = alpha * appear;
    ctx.translate(cx, cy);

    ctx.shadowColor = rgba(STEEL, .12 + complete * .14);
    ctx.shadowBlur = 28 + complete * 18;
    ctx.fillStyle = rgba(SURFACE, .96);
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(complete > .8 ? BRIGHT : STEEL, .38 + complete * .42);
    ctx.lineWidth = 1;
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);

    // The first impulse comes from within the unfinished manuscript.
    const origin = progress(time, .75, 1.5) * (1 - progress(time, 2.1, 2.8));
    if (origin > 0) {
      ctx.fillStyle = rgba(BRIGHT, origin);
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(BRIGHT, origin * .35);
      ctx.beginPath(); ctx.arc(0, 0, 8 + pulse * 12, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 17 + pulse * 18, 0, Math.PI * 2); ctx.stroke();
    }

    const left = -pw * .34;

    // A miniature but properly structured paper: title, metadata, abstract,
    // reserved figure, caption, body, then the primary claim. No region shares
    // vertical space with another.
    const textLines = [
      { y: -.38, width: .68, start: 1.9, weight: 1.5 },
      { y: -.33, width: .46, start: 2.15, weight: 1.5 },
      { y: -.25, width: .72, start: 2.55, weight: 1 },
      { y: -.20, width: .62, start: 2.8, weight: 1 },
      { y: -.15, width: .75, start: 3.05, weight: 1 },
      { y: -.10, width: .54, start: 3.3, weight: 1 },
      { y:  .27, width: .43, start: 5.5, weight: .8 },
      { y:  .33, width: .73, start: 5.9, weight: 1 },
      { y:  .38, width: .58, start: 6.2, weight: 1 }
    ];
    textLines.forEach((line, i) => {
      const lineP = progress(time, line.start, line.start + .82);
      const revisionDip = i === 4 ? 1 - .72 * progress(time, 4.7, 5.25) * (1 - progress(time, 5.7, 6.35)) : 1;
      ctx.strokeStyle = rgba(i < 2 ? BRIGHT : STEEL, (.22 + lineP * (i < 2 ? .52 : .4)) * revisionDip);
      ctx.lineWidth = line.weight;
      const y = ph * line.y;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + pw * line.width * lineP, y); ctx.stroke();
    });
    ctx.lineWidth = 1;

    const metaP = progress(time, 2.35, 3.0);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(STEEL, .24 + metaP * .35);
      ctx.beginPath(); ctx.arc(left + i * 8, -ph * .285, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    // A figure is built from returning experimental evidence.
    const figureP = progress(time, 4.5, 7.2);
    if (figureP > 0) {
      const fx = -pw * .29, fy = -ph * .035, fw = pw * .58, fh = ph * .255;
      ctx.strokeStyle = rgba(STEEL, .2 + figureP * .35);
      ctx.strokeRect(fx, fy, fw * figureP, fh);
      ctx.save();
      ctx.beginPath(); ctx.rect(fx, fy, fw * figureP, fh); ctx.clip();
      ctx.strokeStyle = rgba(BRIGHT, .35 + figureP * .5);
      ctx.beginPath();
      ctx.moveTo(fx + 5, fy + fh - 7);
      ctx.bezierCurveTo(fx + fw * .25, fy + fh - 9, fx + fw * .34, fy + 6, fx + fw * .53, fy + fh * .52);
      ctx.bezierCurveTo(fx + fw * .72, fy + fh * .78, fx + fw * .78, fy + 5, fx + fw - 5, fy + 7);
      ctx.stroke();
      ctx.restore();
    }

    // The decisive claim becomes the paper's final stable element.
    const claimP = progress(time, 6.9, 8.5);
    if (claimP > 0) {
      const y = ph * .445;
      ctx.strokeStyle = rgba(BRIGHT, .28 + claimP * .65);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + pw * .68 * claimP, y); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // A faint rewrite sweep moves across the page while the apparatus is live.
    if (writing > 0 && complete < .9) {
      const scanY = mix(-ph * .40, ph * .45, (time * .18) % 1);
      ctx.strokeStyle = rgba(BRIGHT, .08 + pulse * .08);
      ctx.beginPath(); ctx.moveTo(-pw * .4, scanY); ctx.lineTo(pw * .4, scanY); ctx.stroke();
    }
    ctx.restore();
  }

  function drawScene(ctx, w, h, time, heroMode = false) {
    const cx = w * (heroMode ? .58 : .5);
    const cy = h * .5;
    const pw = Math.min(w < 560 ? w * .34 : w * (heroMode ? .16 : .18), heroMode ? 122 : 156);
    const ph = pw * 1.34;
    const spreadX = Math.min(w * (heroMode ? .32 : .36), pw * (heroMode ? 1.48 : 1.58));
    const spreadY = Math.min(h * (heroMode ? .28 : .30), ph * (heroMode ? .96 : 1.04));
    const satelliteScale = Math.max(.68, Math.min(1, w / 820));
    const overall = progress(time, 0, .65) * (1 - progress(time, 13.25, 13.95));
    const build = progress(time, 1.15, 2.7);
    const research = progress(time, 1.5, 2.8) * (1 - progress(time, 7.7, 9.15));

    const satellites = {
      hypothesis: { x: cx - spreadX, y: cy - spreadY },
      experiment: { x: cx - spreadX, y: cy + spreadY },
      plot: { x: cx + spreadX, y: cy - spreadY },
      iteration: { x: cx + spreadX, y: cy + spreadY }
    };
    const anchors = {
      hypothesis: { x: cx - pw * .28, y: cy - ph * .5 },
      experiment: { x: cx - pw * .5, y: cy + ph * .19 },
      plot: { x: cx + pw * .5, y: cy - ph * .18 },
      iteration: { x: cx + pw * .3, y: cy + ph * .5 }
    };
    const curves = {
      hypothesis: [anchors.hypothesis, {x:cx-pw*.5,y:cy-ph*.85}, {x:satellites.hypothesis.x+50*satelliteScale,y:satellites.hypothesis.y+24*satelliteScale}, satellites.hypothesis],
      experiment: [anchors.experiment, {x:cx-pw*.8,y:cy+ph*.32}, {x:satellites.experiment.x+54*satelliteScale,y:satellites.experiment.y-22*satelliteScale}, satellites.experiment],
      plot: [anchors.plot, {x:cx+pw*.8,y:cy-ph*.35}, {x:satellites.plot.x-50*satelliteScale,y:satellites.plot.y+20*satelliteScale}, satellites.plot],
      iteration: [anchors.iteration, {x:cx+pw*.62,y:cy+ph*.82}, {x:satellites.iteration.x-48*satelliteScale,y:satellites.iteration.y-20*satelliteScale}, satellites.iteration]
    };
    ctx.save();
    ctx.globalAlpha = overall;

    Object.values(curves).forEach((curve) => {
      drawBezier(ctx, curve, build * (1 - progress(time, 7.7, 9.15)), .12 + research * .2, true);
    });
    // The paper sends the first signals outward, then evidence travels back.
    if (research > .05) {
      Object.values(curves).forEach((curve, i) => {
        const outward = clamp(((time * .27 + i * .19) % 1));
        const inward = clamp(((time * .21 + i * .23 + .42) % 1));
        drawSignal(ctx, curve, outward, research * .5, false);
        if (time > 3.2) drawSignal(ctx, curve, inward, research * .95, true);
      });
    }

    drawHypothesis(ctx, satellites.hypothesis.x, satellites.hypothesis.y, satelliteScale, research, time);
    drawExperiment(ctx, satellites.experiment.x, satellites.experiment.y, satelliteScale, research, time);
    drawPlot(ctx, satellites.plot.x, satellites.plot.y, satelliteScale, research, time);
    drawIteration(ctx, satellites.iteration.x, satellites.iteration.y, satelliteScale, research, time);

    drawPaper(ctx, cx, cy, pw, ph, time, overall);
    ctx.restore();
  }

  class Animation {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.heroMode = canvas.classList.contains("hero-research");
      this.toggle = document.querySelector('[data-action="toggle"]');
      this.replay = document.querySelector('[data-action="replay"]');
      this.elapsed = frozenTime ?? (reduceMotion ? 12.4 : 0);
      this.paused = reduceMotion || frozenTime !== null;
      this.last = 0;
      this.raf = 0;
      this.visible = true;
      this.resize();
      this.bind();
      this.render();
      if (this.paused) this.setButton(true);
      else this.start();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width;
      this.h = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.render();
    }

    bind() {
      new ResizeObserver(() => this.resize()).observe(this.canvas);
      new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && !this.paused) this.start(); else this.stop();
      }).observe(this.canvas);

      if (this.toggle) {
        this.toggle.addEventListener("click", () => {
          this.paused = !this.paused;
          this.setButton(this.paused);
          if (this.paused) this.stop(); else this.start();
        });
      }
      if (this.replay) {
        this.replay.addEventListener("click", () => {
          this.elapsed = 0;
          this.last = 0;
          this.render();
          if (!this.paused) this.start();
        });
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.stop();
        else if (this.visible && !this.paused) this.start();
      });
    }

    setButton(paused) {
      if (!this.toggle) return;
      this.toggle.textContent = paused ? "Play" : "Pause";
      this.toggle.setAttribute("aria-pressed", String(paused));
    }

    start() {
      if (this.raf) return;
      this.last = 0;
      this.raf = requestAnimationFrame((now) => this.frame(now));
    }

    stop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.last = 0;
    }

    frame(now) {
      if (!this.raf) return;
      const dt = this.last ? Math.min((now - this.last) / 1000, .05) : 0;
      this.last = now;
      this.elapsed = (this.elapsed + dt) % DURATION;
      this.render();
      this.raf = requestAnimationFrame((next) => this.frame(next));
    }

    render() {
      if (!this.ctx || !this.w || !this.h) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      drawScene(this.ctx, this.w, this.h, this.elapsed, this.heroMode);
    }
  }

  const canvas = document.getElementById("research-paper");
  if (canvas) new Animation(canvas);
})();
