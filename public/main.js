/* =========================================================================
   Workshop for Autonomous Machine Learning Research
   Quiet motion: staggered hero reveal, light scroll reveals, active-nav
   tracking. Degrades gracefully if the CDN import fails or JS is off, and
   fully respects prefers-reduced-motion.
   ========================================================================= */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Signal that JS is live so CSS can hide reveal targets before animating.
// If anything below throws, the .js class is removed and content stays visible.
document.documentElement.classList.add("js");

// Fallback that just reveals everything without motion.
function revealAllStatic() {
  document
    .querySelectorAll("[data-reveal], [data-scroll]")
    .forEach((el) => el.classList.add("is-revealed"));
}

// Reveal only the below-fold blocks (used when the motion CDN is unavailable
// or too slow; the hero has already been revealed by revealHero()).
function revealScrollStatic() {
  document
    .querySelectorAll("[data-scroll]")
    .forEach((el) => el.classList.add("is-revealed"));
}

// Staggered hero reveal. Owned entirely by the CSS .is-revealed transition
// (we only stagger via inline transition-delay), so it needs no motion library
// and must never wait on the CDN import — above-the-fold content stays visible
// even if jsdelivr is slow or hangs.
function revealHero() {
  const heroItems = Array.from(document.querySelectorAll("[data-reveal]"));
  heroItems.forEach((el, i) => {
    el.style.transitionDelay = `${i * 0.09}s`;
  });
  // Next frame so the initial (hidden) state is committed before revealing.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      heroItems.forEach((el) => el.classList.add("is-revealed"));
    });
  });
}

// Active-nav tracking works regardless of the motion library.
function setupNavTracking() {
  const links = new Map();
  document.querySelectorAll(".nav-index").forEach((a) => {
    const id = a.getAttribute("href")?.replace("#", "");
    if (id) links.set(id, a);
  });
  if (!("IntersectionObserver" in window) || links.size === 0) return;

  // Sections we observe; practical folds into Format, contact into Submit.
  const observed = ["about", "call", "format", "practical", "people", "submit", "contact"];

  const nearestLink = (id) => {
    if (links.has(id)) return links.get(id);
    if (id === "practical") return links.get("format");
    if (id === "contact") return links.get("submit");
    return null;
  };

  // Track every observed section's current intersection state, then pick the
  // topmost intersecting one each callback so boundaries don't flip to the
  // wrong nav item (last-wins would otherwise misfire when scrolling up).
  const state = new Map();

  const applyActive = () => {
    let winner = null;
    let winnerTop = Infinity;
    state.forEach((entry, id) => {
      if (!entry.isIntersecting) return;
      const top = entry.boundingClientRect.top;
      if (top < winnerTop) {
        winnerTop = top;
        winner = id;
      }
    });
    const link = winner ? nearestLink(winner) : null;
    links.forEach((l) => l.classList.remove("is-active"));
    if (link) link.classList.add("is-active");
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => state.set(entry.target.id, entry));
      applyActive();
    },
    { rootMargin: "0px 0px -60% 0px", threshold: 0 }
  );

  observed.forEach((id) => {
    const section = document.getElementById(id);
    if (section) io.observe(section);
  });
}

// Progressive committee photos: try to load /people/<slug>.jpg; on success
// swap the initials placeholder for the photo, on failure leave the initials.
function initAvatars() {
  document.querySelectorAll(".avatar[data-photo]").forEach((el) => {
    const src = el.getAttribute("data-photo");
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      el.style.backgroundImage = `url("${src}")`;
      el.classList.add("has-photo");
    };
    img.src = src;
  });
}

// Animated neural-network lattice behind the hero: layered nodes, faint steel
// edges, and signal pulses that propagate left->right. Pauses off-screen and
// when the tab is hidden; renders a single static frame under reduced-motion.
function initHeroLattice() {
  const canvas = document.querySelector(".hero-lattice");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const STEEL = "127,161,193";
  const BRIGHT = "169,197,222";
  const layerSizes = [3, 5, 6, 5, 3];

  let W = 0, H = 0, dpr = 1;
  let nodes = [], edges = [], layerStart = [], pulses = [];
  let running = false, rafId = 0, lastT = 0, spawnAcc = 0, visible = true;

  function build() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const x0 = W * 0.5, x1 = W * 0.97, padY = H * 0.16;
    nodes = []; layerStart = [];
    layerSizes.forEach((n, li) => {
      layerStart[li] = nodes.length;
      const lx = layerSizes.length > 1 ? li / (layerSizes.length - 1) : 0;
      const x = x0 + (x1 - x0) * lx;
      for (let i = 0; i < n; i++) {
        const y = n > 1 ? padY + (H - 2 * padY) * (i / (n - 1)) : H / 2;
        nodes.push({ x, y, baseY: y, phase: Math.random() * Math.PI * 2, lit: 0 });
      }
    });
    edges = [];
    for (let li = 0; li < layerSizes.length - 1; li++) {
      for (let a = 0; a < layerSizes[li]; a++)
        for (let b = 0; b < layerSizes[li + 1]; b++)
          edges.push({ a: layerStart[li] + a, b: layerStart[li + 1] + b });
    }
  }

  function spawnPulse() {
    const path = [];
    for (let li = 0; li < layerSizes.length; li++)
      path.push(layerStart[li] + Math.floor(Math.random() * layerSizes[li]));
    pulses.push({ path, t: 0 });
  }

  function draw(time, dt, animate) {
    ctx.clearRect(0, 0, W, H);
    for (const nd of nodes) {
      nd.y = animate ? nd.baseY + Math.sin(time * 0.6 + nd.phase) * 4 : nd.baseY;
      if (nd.lit > 0) nd.lit = Math.max(0, nd.lit - dt * 1.8);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${STEEL},0.11)`;
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (animate) {
      spawnAcc += dt;
      if (spawnAcc > 0.75 && pulses.length < 6) { spawnAcc = 0; spawnPulse(); }
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p];
        pulse.t += dt * 1.4;
        const seg = Math.floor(pulse.t);
        if (seg >= pulse.path.length - 1) {
          nodes[pulse.path[pulse.path.length - 1]].lit = 1;
          pulses.splice(p, 1); continue;
        }
        const frac = pulse.t - seg;
        const a = nodes[pulse.path[seg]], b = nodes[pulse.path[seg + 1]];
        nodes[pulse.path[seg]].lit = 1;
        const px = a.x + (b.x - a.x) * frac, py = a.y + (b.y - a.y) * frac;
        ctx.strokeStyle = `rgba(${BRIGHT},0.5)`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(px, py); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(${BRIGHT},0.95)`;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const nd of nodes) {
      const lit = nd.lit;
      ctx.beginPath(); ctx.arc(nd.x, nd.y, 2.3 + lit * 1.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${lit > 0 ? BRIGHT : STEEL},${0.38 + lit * 0.6})`;
      ctx.fill();
      if (lit > 0.1) {
        ctx.beginPath(); ctx.arc(nd.x, nd.y, 5 + lit * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${BRIGHT},${lit * 0.12})`; ctx.fill();
      }
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;
    draw(now / 1000, dt, true);
    rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    if (!nodes.length) build();      // recover if the first build had no size
    if (!nodes.length) return;
    running = true; lastT = 0; rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  build();
  draw(0, 0, false);                 // paint a static frame so it's never blank
  if (reduceMotion) return;

  const hero = canvas.closest(".hero");
  if ("IntersectionObserver" in window && hero) {
    new IntersectionObserver((ents) => {
      visible = ents[0].isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(hero);
  } else {
    visible = true; start();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else if (visible) start();
  });

  // Rebuild on layout/size changes. ResizeObserver also fires once the hero is
  // first laid out, fixing the case where it had no height at initial build.
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      const was = running; if (was) stop();
      build();
      if (was || (visible && !document.hidden)) start(); else draw(0, 0, false);
    }).observe(canvas);
  } else {
    let rz;
    window.addEventListener("resize", () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        const was = running; stop(); build();
        if (was || visible) start(); else draw(0, 0, false);
      }, 160);
    });
  }
}

async function init() {
  setupNavTracking();
  initAvatars();
  initHeroLattice();

  if (reduceMotion) {
    revealAllStatic();
    return;
  }

  // Hero reveals immediately and never waits on the CDN, so above-the-fold
  // content is guaranteed visible regardless of the motion import.
  revealHero();

  // Below-fold blocks reveal on inView. Race the CDN import against a timeout
  // so a hanging (never-resolving, never-rejecting) request can't leave the
  // rest of the page invisible — fall back to revealing it statically.
  let inView;
  try {
    const mod = await Promise.race([
      import("https://cdn.jsdelivr.net/npm/motion@11/+esm"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("motion import timed out")), 3000)
      ),
    ]);
    ({ inView } = mod);
  } catch (err) {
    // CDN unreachable or too slow — reveal the below-fold blocks statically.
    revealScrollStatic();
    return;
  }

  // Motion One's inView is only the trigger; the reveal itself is owned by the
  // CSS .is-revealed transition so JS keyframes never race the stylesheet.
  document.querySelectorAll("[data-scroll]").forEach((el) => {
    inView(
      el,
      () => {
        el.classList.add("is-revealed");
      },
      { margin: "-80px" }
    );
  });
}

init().catch(() => {
  // Any unexpected failure: guarantee visible content.
  revealAllStatic();
});
