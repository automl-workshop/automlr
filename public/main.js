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

async function init() {
  setupNavTracking();
  initAvatars();

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
