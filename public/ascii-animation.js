const labCanvas = document.querySelector("#ascii-stage");
let canvas = labCanvas;
let ctx = canvas?.getContext("2d");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const colors = { ink: "#181a1f", soft: "#4f535b", faint: "#858882", accent: "#243bb9", signal: "#1f706b" };
const modes = {
  engine: { title: "Research crystallization", copy: "Fragments of evidence gather, align, and materialize as a paper.", code: "Evidence → claim → manuscript" },
  discussant: { title: "Discussant dialogue", copy: "An author puts forward a paper. Review identifies a discussant; the audience arrives and evaluation becomes shared dialogue.", code: "Blind review → illumination<br>→ public dialogue" },
};

let mode = "engine";
let cell = 20;
let speed = 1;
let density = 1;
let paused = false;
let seed = Math.random() * 1000;
let last = performance.now();
let elapsed = 0;
let width = 0;
let height = 0;
let sceneAlpha = 1;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const fract = (n) => n - Math.floor(n);
const hash = (x, y = 0) => fract(Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const wave = (t, offset = 0) => (Math.sin(t + offset) + 1) / 2;

function glyph(char, x, y, color = colors.ink, alpha = 1, align = "center") {
  if (x < -cell || x > width + cell || y < -cell || y > height + cell) return;
  ctx.globalAlpha = clamp(alpha, 0, 1) * sceneAlpha;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(char, x, y);
}

function label(text, x, y, color = colors.soft, alpha = 1, align = "center") {
  ctx.save();
  ctx.font = `500 ${Math.max(9, cell * .68)}px "IBM Plex Mono", monospace`;
  glyph(text.toUpperCase(), x, y, color, alpha, align);
  ctx.restore();
}

function asciiLine(x1, y1, x2, y2, char = "·", color = colors.faint, alpha = 1, phase = 0) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const count = Math.max(1, Math.floor(dist / cell));
  for (let i = 0; i <= count; i += 1) {
    const p = i / count;
    if (hash(i + phase * 11, count) > density + .2) continue;
    glyph(char, x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, color, alpha);
  }
}

function particlePath(points, progress, char = "●", color = colors.accent, trail = 5, alpha = 1) {
  const segments = points.length - 1;
  for (let j = trail; j >= 0; j -= 1) {
    let p = (progress - j * .018 + 1) % 1;
    const f = p * segments;
    const index = Math.min(segments - 1, Math.floor(f));
    p = f - index;
    const a = points[index];
    const b = points[index + 1];
    glyph(j ? "·" : char, a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, color, alpha * (j ? (trail - j + 1) / (trail + 2) : 1));
  }
}

function paper(x, y, w, h, progress = 1, alpha = 1, options = {}) {
  const { dense = false, showLabel = true, structured = false } = options;
  const left = x - w / 2;
  const top = y - h / 2;
  const right = x + w / 2;
  const bottom = y + h / 2;
  if (!structured) {
    asciiLine(left, top, right, top, "─", colors.accent, alpha);
    asciiLine(right, top, right, bottom, "│", colors.accent, alpha);
    asciiLine(right, bottom, left, bottom, "─", colors.accent, alpha);
    asciiLine(left, bottom, left, top, "│", colors.accent, alpha);
    glyph("┌", left, top, colors.accent, alpha); glyph("┐", right, top, colors.accent, alpha);
    glyph("┘", right, bottom, colors.accent, alpha); glyph("└", left, bottom, colors.accent, alpha);
  }
  if (structured) {
    const pc = Math.min(cell * .8, (w - 12) / 12);
    ctx.save();
    ctx.font = `500 ${pc}px "IBM Plex Mono", monospace`;
    const charWidth = ctx.measureText("M").width;
    const frameBars = Math.max(14, Math.floor(w / charWidth) - 2);
    const frameTop = `┌${"─".repeat(frameBars)}┐`;
    const frameBottom = `└${"─".repeat(frameBars)}┘`;
    const frameWidth = ctx.measureText(frameTop).width;
    const frameLeft = x - frameWidth / 2 + charWidth / 2;
    const frameRight = x + frameWidth / 2 - charWidth / 2;
    glyph(frameTop, x, top, colors.accent, alpha);
    glyph(frameBottom, x, bottom, colors.accent, alpha);
    const frameRows = Math.max(5, Math.floor(h / (pc * 1.08)) - 1);
    for (let row = 1; row <= frameRows; row += 1) {
      const frameY = top + row * h / (frameRows + 1);
      glyph("│", frameLeft, frameY, colors.accent, alpha);
      glyph("│", frameRight, frameY, colors.accent, alpha);
    }
    const contentLeft = frameLeft + charWidth * 1.45;
    const contentChars = Math.max(14, frameBars - 2);
    const full = (character = "─") => character.repeat(contentChars);
    const short = (ratio, character = "─") => character.repeat(Math.max(2, Math.floor(contentChars * ratio)));
    const figureInside = contentChars - 2;
    const figureRow = (content) => `│${content.padEnd(figureInside).slice(0, figureInside)}│`;
    const lossGrid = Array.from({ length: 4 }, () => Array(figureInside).fill(" "));
    [
      [.3, 0], [.39, 0], [.47, 0], [.56, 0], [.62, 1], [.69, 0],
      [.74, 1], [.81, 0], [.85, 2], [.9, 1], [.95, 2],
    ].forEach(([position, row]) => { lossGrid[row][Math.min(figureInside - 1, Math.floor(position * figureInside))] = "·"; });
    const steps = [0, Math.floor(figureInside * .24), Math.floor(figureInside * .53), Math.floor(figureInside * .78), figureInside - 1];
    for (let row = 0; row < 4; row += 1) {
      const start = steps[row];
      const end = steps[row + 1];
      lossGrid[row][start] = row === 0 ? "◆" : "╰";
      for (let column = start + 1; column < end; column += 1) lossGrid[row][column] = "─";
      lossGrid[row][end] = row === 3 ? "◆" : "╮";
    }
    const bestLossRows = lossGrid.map((row) => row.join(""));
    const revealRow = (text, row, yPosition, color = colors.soft, weight = 1) => {
      const reveal = clamp(progress * 17 - row, 0, 1);
      if (!reveal) return;
      const visible = text.slice(0, Math.ceil(text.length * reveal));
      glyph(visible, contentLeft, top + h * yPosition, color, alpha * (.75 + reveal * .25) * weight, "left");
    };
    revealRow(short(.92, "━"), 0, .105, colors.ink);
    revealRow(short(.64, "━"), 1, .152, colors.ink);
    revealRow("• · • · •", 2, .205, colors.accent, .9);
    revealRow(short(.96), 3, .265);
    revealRow(short(.83), 4, .305);
    revealRow(short(.91), 5, .345);
    [
      `┌${"─".repeat(figureInside)}┐`,
      ...bestLossRows.map(figureRow),
      `└${"─".repeat(figureInside)}┘`,
    ].forEach((line, index) => revealRow(line, 6 + index, .405 + index * .052, index === 0 || index === 5 ? colors.soft : colors.accent));
    revealRow(short(.46, "·"), 12, .735, colors.faint);
    revealRow(short(.95), 13, .795);
    revealRow(short(.78), 14, .84);
    revealRow(short(.9), 15, .885);
    revealRow(full("━"), 16, .94, colors.ink);
    ctx.restore();
    return;
  }
  if (showLabel) label("PAPER", x, top + cell * 1.5, colors.accent, alpha);
  const lineStart = dense ? 1.45 : 3;
  const lineStep = dense ? 1.05 : 1.15;
  const usableHeight = h - cell * (dense ? 2.25 : 3);
  const lineCount = Math.max(2, Math.floor(usableHeight / (cell * lineStep)));
  for (let i = 0; i < lineCount; i += 1) {
    const reveal = clamp(progress * lineCount - i, 0, 1);
    if (!reveal) continue;
    const widthFactor = dense ? .8 + hash(i, 4) * .17 : .62 + hash(i, 4) * .33;
    const chars = Math.floor((w / cell - 2.6) * reveal * widthFactor);
    glyph("─".repeat(Math.max(1, chars)), left + cell * 1.25, top + cell * (lineStart + i * lineStep), i === 0 ? colors.ink : colors.soft, alpha * (.72 + reveal * .25), "left");
  }
}

function person(symbol, x, y, color, alpha = 1, scale = 1) {
  ctx.save();
  ctx.font = `500 ${cell * 1.08 * scale}px "IBM Plex Mono", monospace`;
  glyph(symbol, x, y, color, alpha);
  ctx.restore();
}

function wordBadge(text, x, y, color, alpha = 1, scale = 1, double = false) {
  ctx.save();
  ctx.font = `500 ${cell * .82 * scale}px "IBM Plex Mono", monospace`;
  glyph(double ? `[[ ${text} ]]` : `[ ${text} ]`, x, y, color, alpha);
  ctx.restore();
}

function asciiBlock(lines, x, y, color, alpha = 1, scale = .78) {
  ctx.save();
  ctx.font = `500 ${cell * scale}px "IBM Plex Mono", monospace`;
  const spacing = cell * scale * 1.18;
  lines.forEach((line, index) => glyph(line, x, y + (index - (lines.length - 1) / 2) * spacing, color, alpha));
  ctx.restore();
}

function drawAsciiHypothesis(x, y, alpha, t) {
  const tips = [
    [x - cell * 3.1, y - cell * 2], [x, y - cell * 3], [x + cell * 3.2, y - cell * 1.6],
    [x - cell * 2.5, y + cell * 2.2], [x + cell * 2.7, y + cell * 2.3],
  ];
  tips.forEach((tip, index) => {
    asciiLine(x, y, tip[0], tip[1], "·", colors.soft, alpha * .8, index + 70);
    glyph(index === 2 ? "((◆))" : index % 2 ? "◇" : "○", tip[0], tip[1], index === 2 ? colors.accent : colors.soft, alpha * (index === 2 ? .95 : .75));
  });
  glyph("◆", x, y, colors.accent, alpha * (.8 + wave(t * 1.5) * .2));
}

function drawAsciiExperiment(x, y, alpha, t) {
  const active = Math.floor(t * 2.5) % 15;
  const rows = Array.from({ length: 3 }, (_, row) => {
    const cells = Array.from({ length: 5 }, (_, col) => row * 5 + col === active ? "◆" : "·");
    return `│ ${cells.join(" ")} │`;
  });
  asciiBlock(["┌───────────┐", ...rows, "└───────────┘"], x, y, colors.soft, alpha, .72);
  const scanY = y - cell * 1.1 + ((t * .38) % 1) * cell * 2.2;
  glyph("···········", x, scanY, colors.accent, alpha * .75);
}

function drawAsciiPlot(x, y, alpha, t) {
  const lift = Math.round(wave(t * .8) * 2);
  const lines = [
    "│        ·◆", "│      ·─╯ ", lift > 0 ? "│   ·──╯   " : "│    ·─╯   ",
    "│ ·─╯      ", "└──────────",
  ];
  asciiBlock(lines, x, y, colors.accent, alpha, .76);
}

function drawAsciiIteration(x, y, alpha, t) {
  asciiBlock(["╭────────╮", "│   □    │", "│       ○│", "│  ◇     │", "╰──────↻─╯"], x, y, colors.soft, alpha, .74);
  const loop = [
    [x, y - cell * 1.45], [x + cell * 3.2, y], [x, y + cell * 1.45],
    [x - cell * 3.2, y], [x, y - cell * 1.45],
  ];
  particlePath(loop, (t * .09) % 1, "◆", colors.accent, 4, alpha);
}

function drawEngine(t) {
  const cx = width * .5;
  const cy = height * .44;
  const cycle = (t * .065) % 1;
  const fadeIn = clamp((cycle - .015) / .055, 0, 1);
  const fadeOut = 1 - clamp((cycle - .9) / .07, 0, 1);
  sceneAlpha = fadeIn * fadeIn * (3 - 2 * fadeIn) * fadeOut * fadeOut * (3 - 2 * fadeOut);
  const pw = Math.min(168, width * (width < 520 ? .42 : .23));
  const ph = pw * 1.34;
  const rx = Math.min(width * .3, 280);
  const ry = Math.min(height * .29, 190);
  const fade = 1 - clamp((cycle - .92) / .08, 0, 1);
  const particles = Math.floor(82 * density);
  for (let i = 0; i < particles; i += 1) {
    const angle = hash(i, 8) * Math.PI * 2 + t * (i % 2 ? .04 : -.028);
    const r = rx * (.38 + hash(i, 9) * 1.05);
    const sourceX = cx + Math.cos(angle) * r;
    const sourceY = cy + Math.sin(angle) * r * .62;
    const edge = i % 5;
    let targetX;
    let targetY;
    if (edge === 0) {
      targetX = cx - pw / 2 + hash(i, 12) * pw;
      targetY = cy + (hash(i, 13) > .5 ? -ph / 2 : ph / 2);
    } else if (edge === 1) {
      targetX = cx + (hash(i, 14) > .5 ? -pw / 2 : pw / 2);
      targetY = cy - ph / 2 + hash(i, 15) * ph;
    } else {
      targetX = cx - pw * .34 + hash(i, 16) * pw * (.42 + hash(i, 17) * .3);
      targetY = cy - ph * .27 + (i % 8) * ph * .075;
    }
    const gather = clamp((cycle - .12 - hash(i, 18) * .17) / .64, 0, 1);
    const eased = gather * gather * (3 - 2 * gather);
    const x = sourceX + (targetX - sourceX) * eased;
    const y = sourceY + (targetY - sourceY) * eased;
    const char = ["·", ":", "+", "?", "0", "1", "×", "∴"][i % 8];
    const particleFade = 1 - clamp((cycle - .74 - hash(i, 20) * .05) / .12, 0, 1);
    glyph(char, x, y, eased > .75 ? colors.accent : colors.soft, (.42 + hash(i, 19) * .5) * fade * particleFade);
  }

  const formed = clamp((cycle - .48) / .18, 0, 1) * fade;
  paper(cx, cy, pw, ph, clamp((cycle - .43) / .34, 0, 1), formed, { showLabel: false, structured: true });
}

function drawTree(t) {
  const x0 = width * .13;
  const y0 = height * .44;
  const depth = width < 700 ? 3 : 4;
  const maxX = width * .72;
  const branches = [];
  function grow(x, y, level, id) {
    if (level > depth) return;
    const spread = height * .18 / (level + .35);
    const nx = x0 + (maxX - x0) * (level / (depth + 1));
    for (const dir of [-1, 1]) {
      const ny = y + dir * spread * (.6 + hash(id, level) * .55);
      const life = hash(id * 3 + dir, level);
      branches.push({ x, y, nx, ny, level, life, id: id * 2 + (dir > 0 ? 1 : 0) });
      if (life > .22 || level < 2) grow(nx, ny, level + 1, id * 2 + (dir > 0 ? 1 : 0));
    }
  }
  grow(x0, y0, 1, 1);
  const reveal = (t * .13) % 1.35;
  glyph("◎", x0, y0, colors.accent, 1);
  label("candidate idea", x0, y0 + cell * 2, colors.soft, .8);
  for (const b of branches) {
    const local = clamp(reveal * (depth + 1) - b.level + 1, 0, 1);
    if (!local) continue;
    const dead = b.life < .3;
    asciiLine(b.x, b.y, b.x + (b.nx - b.x) * local, b.y + (b.ny - b.y) * local, dead ? "×" : "·", dead ? colors.faint : colors.soft, dead ? .25 : .72, b.id);
    if (local === 1) glyph(dead ? "×" : b.life > .77 ? "◆" : "○", b.nx, b.ny, b.life > .77 ? colors.accent : colors.soft, dead ? .35 : .9);
  }
  const winnerY = branches.filter((b) => b.level === depth).sort((a, b) => b.life - a.life)[0]?.ny || y0;
  asciiLine(maxX - cell, winnerY, width * .82, y0, ">", colors.accent, .7);
  paper(width * .86, y0, Math.min(120, width * .16), Math.min(164, height * .28), clamp(reveal - .75, 0, 1), clamp((reveal - .62) * 3, 0, 1));
  label("retain / recombine", width * .58, height * .18, colors.accent, wave(t * .5) * .35 + .45);
}

function drawDesk(t) {
  const zones = [width * .2, width * .5, width * .8];
  const cy = height * .42;
  asciiLine(width * .08, cy + height * .2, width * .92, cy + height * .2, "·", colors.faint, .7);
  label("01 / read", zones[0], height * .16, colors.soft);
  label("02 / test", zones[1], height * .16, colors.soft);
  label("03 / write", zones[2], height * .16, colors.soft);
  for (let i = 0; i < 22; i += 1) {
    const row = i % 7;
    const col = Math.floor(i / 7);
    const x = zones[0] - cell * 5 + col * cell * 3.6 + Math.sin(t * .25 + i) * cell * .3;
    const y = cy - cell * 5 + row * cell * 1.45;
    glyph(["[12]", "∑", "et al.", "→", "§", "[07]", "∴"][i % 7], x, y, i % 5 === 0 ? colors.accent : colors.soft, .25 + hash(i) * .55);
  }
  const scanY = cy - cell * 5 + ((t * .55) % 10) * cell;
  glyph("├─────────┤", zones[0], scanY, colors.accent, .8);
  const matrix = ["0 1 1 0 1", "1 1 0 1 0", "0 1 1 1 0", "1 0 1 1 1", "0 1 0 1 1"];
  matrix.forEach((line, i) => glyph(line, zones[1], cy - cell * 3 + i * cell * 1.45, i === Math.floor((t * .7) % 5) ? colors.accent : colors.soft, .75));
  glyph(`[ run ${(Math.floor(t * 3) % 999).toString().padStart(3, "0")} ]`, zones[1], cy + cell * 5.2, colors.signal, .9);
  paper(zones[2], cy, Math.min(142, width * .2), Math.min(190, height * .34), (t * .12) % 1, 1);
  for (let i = 0; i < 3; i += 1) {
    const p = (t * .1 + i / 3) % 1;
    particlePath([[zones[0] + cell * 4, cy], [zones[1], cy], [zones[2] - cell * 5, cy]], p, i === 1 ? "∴" : "·", i === 1 ? colors.accent : colors.soft, 3);
  }
}

function drawDiscussant(t) {
  const duration = 27.1;
  const time = t % duration;
  const progress = (start, end) => {
    const n = clamp((time - start) / (end - start), 0, 1);
    return n * n * (3 - 2 * n);
  };
  sceneAlpha = progress(.22, .95) * (1 - progress(26.35, 26.9));
  const cx = width * .5;
  const cy = height * .36;
  const authorBase = { x: width * .08, y: cy };
  const reviewerX = width * .92 - cell * 1.25;
  const reviewers = [
    { x: reviewerX, y: cy - cell * 5.8 },
    { x: reviewerX, y: cy },
    { x: reviewerX, y: cy + cell * 5.8 },
  ];
  const submitted = progress(1.1, 3.4);
  const review = progress(3.5, 4.4) * (1 - progress(8.1, 9.1));
  const selected = progress(7.1, 9.3);
  const conversation = progress(9.8, 11.45);
  const audienceReveal = progress(10.7, 11.8);
  const openFloor = progress(20.7, 21.55);
  const paperY = cy - conversation * height * .19;
  const paperScale = 1 - conversation * .25;
  const basePaperWidth = Math.min(136, width * .18);
  const pw = basePaperWidth * paperScale;
  const ph = pw * 1.34;
  const authorTargetX = cx - cell * 7.2;
  const discussantTargetX = cx + cell * 7.2;
  const speakerTargetY = paperY + ph / 2 + cell * 3.15;
  const author = {
    x: authorBase.x + (authorTargetX - authorBase.x) * conversation,
    y: cy + (speakerTargetY - cy) * conversation,
  };
  const authorPaperX = authorBase.x + basePaperWidth / 2 + cell * 4.4;
  const paperX = authorPaperX + (cx - authorPaperX) * submitted;
  const discussantReviewX = reviewers[1].x - selected * cell * 2.8;
  const discussant = {
    x: discussantReviewX + (discussantTargetX - discussantReviewX) * conversation,
    y: reviewers[1].y + (speakerTargetY - reviewers[1].y) * conversation,
  };
  const phases = {
    author: {
      label: "01 / AUTHOR SUMMARY", start: 12.5, interval: 1.08,
      lines: [
        { speaker: "AUTH", tag: "AUTHOR", text: "We gave the agent a harness, tools, and a fixed compute budget." },
        { speaker: "AUTH", tag: "", text: "It proposed hypotheses, modified code, and evaluated each run." },
        { speaker: "AUTH", tag: "", text: "The trace records every failure, retry, and human intervention." },
        { speaker: "AUTH", tag: "", text: "The resulting claim is the paper's primary contribution." },
      ],
    },
    discussant: {
      label: "02 / DISCUSSANT REPLY", start: 17.8, interval: .98,
      lines: [
        { speaker: "DISC", tag: "DISCUSSANT", text: "The research result and system design must be read together." },
        { speaker: "DISC", tag: "", text: "The strongest evidence is the sequence of failed and successful runs." },
        { speaker: "DISC", tag: "", text: "The open question is what the harness made possible." },
      ],
    },
    open: {
      label: "03 / OPEN FLOOR", start: 21.15, interval: .88,
      lines: [
        { speaker: "AUD", tag: "AUD 03", text: "Which decisions were genuinely autonomous?", audience: 2 },
        { speaker: "AUTH", tag: "AUTHOR", text: "The trace separates agent choices from human interventions." },
        { speaker: "AUD", tag: "AUD 07", text: "Would another harness recover the same result?", audience: 6 },
        { speaker: "DISC", tag: "DISCUSSANT", text: "That is the key test of generality." },
        { speaker: "AUD", tag: "AUD 01", text: "How were failed experiments preserved?", audience: 0 },
        { speaker: "AUD", tag: "AUD 05", text: "A replay could separate discovery from scaffolding.", audience: 4 },
      ],
    },
  };
  const phase = time >= phases.open.start ? phases.open : time >= phases.discussant.start ? phases.discussant : phases.author;
  const timeline = Object.values(phases).flatMap((item) => item.lines.map((line, index) => ({ ...line, start: item.start + index * item.interval })));
  let currentUtterance = -1;
  timeline.forEach((line, index) => { if (time >= line.start) currentUtterance = index; });
  const activeLine = currentUtterance >= 0 ? timeline[currentUtterance] : null;
  const activeSpeaker = activeLine?.speaker || "";
  const transcriptReveal = progress(phases.author.start - .7, phases.author.start + .3);

  wordBadge("AUTHOR", author.x, author.y, colors.signal, .95, 1, activeSpeaker === "AUTH");

  reviewers.forEach((reviewer, index) => {
    const chosen = index === 1;
    const x = chosen ? discussant.x : reviewer.x;
    const y = chosen ? discussant.y : reviewer.y;
    if (chosen) {
      wordBadge("REVIEWER 02", x, y, colors.soft, (1 - selected) ** 1.6, 1);
      wordBadge("DISCUSSANT", x, y, colors.accent, selected ** 1.6, 1, activeSpeaker === "DISC");
    } else {
      wordBadge(`REVIEWER 0${index + 1}`, x, y, colors.soft, 1 - selected, 1);
    }
  });

  paper(paperX, paperY, pw, ph, 1, .98, { showLabel: false, structured: true });

  const annotationFade = review * (1 - conversation);
  [
    { word: "LIMITATION", y: -.26, start: 4.0, color: colors.ink },
    { word: "SUPPORT", y: 0, start: 4.7, color: colors.signal },
    { word: "QUESTION", y: .26, start: 5.4, color: colors.accent },
  ].forEach((annotation) => {
    const appear = progress(annotation.start, annotation.start + .65) * annotationFade;
    wordBadge(annotation.word, paperX + pw / 2 + cell * 4, paperY + ph * annotation.y, annotation.color, appear, .72);
  });

  if (selected > .08) {
    const frameAlpha = selected * (1 - conversation);
    const frameW = pw + cell * 1.5;
    const frameH = ph + cell * 1.15;
    ctx.save();
    ctx.font = `500 ${cell * .7}px "IBM Plex Mono", monospace`;
    const charWidth = ctx.measureText("M").width;
    const bars = Math.max(4, Math.floor(frameW / charWidth) - 2);
    const top = `╔${"═".repeat(bars)}╗`;
    const actualW = ctx.measureText(top).width;
    const left = cx - actualW / 2;
    const right = cx + actualW / 2;
    glyph(top, cx, paperY - frameH / 2, colors.accent, frameAlpha);
    glyph(`╚${"═".repeat(bars)}╝`, cx, paperY + frameH / 2, colors.accent, frameAlpha);
    const verticals = Math.max(2, Math.floor(frameH / (cell * .7)) - 1);
    for (let i = 1; i <= verticals; i += 1) {
      const y = paperY - frameH / 2 + i * frameH / (verticals + 1);
      glyph("║", left, y, colors.accent, frameAlpha);
      glyph("║", right, y, colors.accent, frameAlpha);
    }
    ctx.restore();
  }

  const audience = [];
  const audienceY = height * .69;
  const audienceCount = width < 700 ? 7 : 9;
  for (let i = 0; i < audienceCount; i += 1) {
    const p = audienceCount === 1 ? .5 : i / (audienceCount - 1);
    const x = width * .1 + p * width * .8;
    const y = audienceY + Math.sin(p * Math.PI) * cell * 1.7;
    audience.push({ x, y });
    const speaking = activeSpeaker === "AUD" && activeLine?.audience === i;
    wordBadge(String(i + 1).padStart(2, "0"), x, y, i % 4 === 0 ? colors.ink : colors.soft, audienceReveal * (.76 + hash(i, 44) * .22), .8, speaking);
  }
  if (audienceReveal > .05) label(openFloor > .5 ? "audience / open floor" : "audience", cx, audienceY + cell * 4.5, colors.soft, audienceReveal * .85);

  if (transcriptReveal > 0) {
    const transcriptWidth = Math.min(width * .84, 660);
    const transcriptLeft = cx - transcriptWidth / 2;
    const transcriptTop = speakerTargetY + cell * 3.25;
    ctx.save();
    ctx.font = `500 ${cell * .72}px "IBM Plex Mono", monospace`;
    const charWidth = ctx.measureText("M").width;
    const ruleChars = Math.max(8, Math.floor(transcriptWidth / charWidth));
    label(phase.label, transcriptLeft, transcriptTop - cell * 1.4, phase === phases.author ? colors.signal : phase === phases.discussant ? colors.accent : colors.soft, .9 * transcriptReveal, "left");
    glyph("·".repeat(ruleChars), transcriptLeft, transcriptTop - cell * .55, colors.faint, .7 * transcriptReveal, "left");
    if (currentUtterance >= 0) {
      const visibleRows = 4;
      const lineGap = cell * 1.55;
      const baseScroll = Math.max(0, currentUtterance - visibleRows);
      const entering = currentUtterance >= visibleRows ? progress(activeLine.start, activeLine.start + .5) : 0;
      const scroll = baseScroll + entering;
      const first = Math.max(0, Math.floor(scroll) - 1);
      for (let index = first; index <= currentUtterance; index += 1) {
        const utterance = timeline[index];
        const row = index - scroll;
        if (row < -1.05 || row > visibleRows + .05) continue;
        const local = clamp((time - utterance.start) / .68, 0, 1);
        const lineFade = local * local * (3 - 2 * local);
        const prefix = utterance.tag ? `[${utterance.tag}]` : "";
        const prefixColumn = ctx.measureText("[DISCUSSANT]  ").width;
        const maxTextChars = Math.max(8, Math.floor((transcriptWidth - prefixColumn) / charWidth));
        const text = utterance.text.slice(0, Math.ceil(Math.min(maxTextChars, utterance.text.length) * local));
        const y = transcriptTop + row * lineGap;
        const edgeFade = clamp(row + 1, 0, 1) * clamp(visibleRows + .1 - row, 0, 1);
        const lineAlpha = edgeFade * (index === currentUtterance ? 1 : .68) * transcriptReveal * lineFade;
        if (prefix) glyph(prefix, transcriptLeft, y, utterance.speaker === "AUTH" ? colors.signal : utterance.speaker === "DISC" ? colors.accent : colors.ink, lineAlpha, "left");
        glyph(text, transcriptLeft + prefixColumn, y, colors.ink, lineAlpha, "left");
      }
    }
    ctx.restore();
  }
}

function drawLab(now) {
  const dt = Math.min(40, now - last);
  last = now;
  if (!paused) elapsed += dt * speed * (reduceMotion ? .08 : 1);
  const t = elapsed / 1000;
  ctx.clearRect(0, 0, width, height);
  ctx.font = `400 ${cell * .78}px "IBM Plex Mono", monospace`;
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 1;
  ({ engine: drawEngine, discussant: drawDiscussant })[mode](t);
  ctx.globalAlpha = 1;
  requestAnimationFrame(drawLab);
}

function setMode(next) {
  mode = next;
  elapsed = 0;
  document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
  document.querySelector("#caption-title").textContent = modes[mode].title;
  document.querySelector("#caption-copy").textContent = modes[mode].copy;
  document.querySelector("#caption-code").innerHTML = modes[mode].code;
}

class SiteAnimation {
  constructor(element, animationMode) {
    this.canvas = element;
    this.ctx = element.getContext("2d");
    this.mode = animationMode;
    this.elapsed = reduceMotion ? (animationMode === "engine" ? 10.6 : 26.2) * 1000 : 0;
    this.last = performance.now();
    this.paused = reduceMotion;
    this.visible = true;
    this.seed = animationMode === "engine" ? 317.4 : 811.2;
    this.raf = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(element);
    this.bindControls();
    this.resize();
    if (!reduceMotion) this.raf = requestAnimationFrame((now) => this.tick(now));
    else this.paint();
  }

  activate() {
    canvas = this.canvas;
    ctx = this.ctx;
    width = this.width;
    height = this.height;
    cell = this.mode === "engine" ? (this.width < 520 ? 14 : 20) : clamp(this.width / 48, 10, 15);
    density = 1;
    speed = 1;
    seed = this.seed;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paint();
  }

  paint() {
    if (!this.width || !this.height) return;
    this.activate();
    ctx.clearRect(0, 0, width, height);
    ctx.font = `400 ${cell * .78}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 1;
    (this.mode === "engine" ? drawEngine : drawDiscussant)(this.elapsed / 1000);
    ctx.globalAlpha = 1;
  }

  tick(now) {
    const dt = Math.min(40, now - this.last);
    this.last = now;
    if (!this.paused && this.visible) {
      this.elapsed += dt;
      this.paint();
    }
    this.raf = requestAnimationFrame((next) => this.tick(next));
  }

  bindControls() {
    if (this.mode !== "discussant") return;
    const figure = this.canvas.closest(".format-study");
    const toggle = figure?.querySelector('[data-action="toggle"]');
    const replay = figure?.querySelector('[data-action="replay"]');
    toggle?.addEventListener("click", () => {
      this.paused = !this.paused;
      toggle.textContent = this.paused ? "Play" : "Pause";
      toggle.setAttribute("aria-pressed", String(this.paused));
      this.last = performance.now();
    });
    replay?.addEventListener("click", () => {
      this.elapsed = 0;
      this.paused = false;
      if (toggle) {
        toggle.textContent = "Pause";
        toggle.setAttribute("aria-pressed", "false");
      }
      this.last = performance.now();
      this.paint();
    });
    if (reduceMotion && toggle) {
      toggle.textContent = "Play";
      toggle.setAttribute("aria-pressed", "true");
    }
  }
}

if (labCanvas) {
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  document.querySelectorAll("[data-control]").forEach((input) => {
    input.addEventListener("input", () => {
      const output = input.nextElementSibling;
      if (input.dataset.control === "cell") { cell = Number(input.value); output.value = input.value; resize(); }
      if (input.dataset.control === "speed") { speed = Number(input.value) / 100; output.value = `${speed.toFixed(1)}×`; }
      if (input.dataset.control === "density") { density = Number(input.value) / 100; output.value = `${input.value}%`; }
    });
  });
  document.querySelector("[data-action='pause']").addEventListener("click", (event) => {
    paused = !paused;
    event.currentTarget.textContent = paused ? "Play" : "Pause";
  });
  document.querySelector("[data-action='remix']").addEventListener("click", () => { seed = Math.random() * 1000; elapsed = 0; });
  new ResizeObserver(resize).observe(canvas);
  resize();
  requestAnimationFrame(drawLab);
} else {
  const hero = document.querySelector("#research-paper");
  const discussant = document.querySelector("#discussant-study");
  if (hero) new SiteAnimation(hero, "engine");
  if (discussant) new SiteAnimation(discussant, "discussant");
}
