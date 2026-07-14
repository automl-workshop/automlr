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

async function init() {
  setupNavTracking();

  if (reduceMotion) {
    revealAllStatic();
    return;
  }

  let inView;
  try {
    ({ inView } = await import(
      "https://cdn.jsdelivr.net/npm/motion@11/+esm"
    ));
  } catch (err) {
    // CDN unreachable — reveal statically so the page is never blank.
    revealAllStatic();
    return;
  }

  // (1) Staggered hero reveal on load. Owned entirely by the CSS transition
  //     (adding .is-revealed) to avoid a Motion-keyframe vs CSS-transition
  //     race on opacity/transform. We only stagger via inline transition-delay.
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

  // (2) Below-fold blocks reveal on inView. Motion One's inView is only the
  //     trigger; the reveal itself is owned by the CSS .is-revealed transition
  //     so JS keyframes never race the stylesheet on opacity/transform.
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
