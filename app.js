(() => {
  "use strict";

  const LOGO_EXTS = ["webp","png"];
  const JERSEY_EXTS = ["avif", "png"];

  const SHOW_TEAM_LABELS = true;

  const withExts = (base, exts) => exts.map(e => `${base}.${e}`);
  const logoSrcs = base => withExts(`images/logos/${base}`, LOGO_EXTS);

  const DEFAULT_JERSEYS = ["home", "away", "alternate"];
  const STORAGE_KEY = "nflJerseyBracket.v1";

  const t = (id, name, abbr, color, jerseys = DEFAULT_JERSEYS) =>
    ({ id, name, abbr, color, jerseys });

  const DIVISIONS = [
    { id: "afc-north", conf: "AFC", name: "AFC North", teams: [
      t("ravens", "Baltimore Ravens", "BAL", "#241773",["home", "away", "alternate black","alternate purple"]),
      t("bengals", "Cincinnati Bengals", "CIN", "#fb4f14",["home", "away", "alternate"]),
      t("browns", "Cleveland Browns", "CLE", "#311d00",["home", "away", "alternate","throwback"]),
      t("steelers", "Pittsburgh Steelers", "PIT", "#ffb612",["home", "away", "alternate","throwback"]),
    ]},
    { id: "afc-east", conf: "AFC", name: "AFC East", teams: [
      t("bills", "Buffalo Bills", "BUF", "#00338d",["home", "away", "alternate red","alternate gray","rivalry"]),
      t("dolphins", "Miami Dolphins", "MIA", "#008e97",["home", "away", "rivalry","throwback aqua","throwback white"]),
      t("patriots", "New England Patriots", "NE", "#002244",["home", "away", "rivalry","throwback"]),
      t("jets", "New York Jets", "NYJ", "#125740",["home", "away", "alternate","rivalry","throwback"]),
    ]},
    { id: "afc-west", conf: "AFC", name: "AFC West", teams: [
      t("broncos", "Denver Broncos", "DEN", "#fb4f14",["home", "away", "alternate","throwback"]),
      t("chiefs", "Kansas City Chiefs", "KC", "#e31837",["home", "away"]),
      t("raiders", "Las Vegas Raiders", "LV", "#a5acaf",["home", "away", "alternate"]),
      t("chargers", "Los Angeles Chargers", "LAC", "#0080c6",["home", "away", "alternate yellow","alternate navy"]),
    ]},
    { id: "afc-south", conf: "AFC", name: "AFC South", teams: [
      t("texans", "Houston Texans", "HOU", "#03202f",["home", "away", "alternate black","alternate red","rivalry"]),
      t("colts", "Indianapolis Colts", "IND", "#002c5f",["home", "away", "alternate","rivalry","throwback"]),
      t("jaguars", "Jacksonville Jaguars", "JAX", "#006778",["home", "away", "alternate","rivalry","throwback"]),
      t("titans", "Tennessee Titans", "TEN", "#4b92db",["home", "away", "rivalry"]),
    ]},
    { id: "nfc-north", conf: "NFC", name: "NFC North", teams: [
      t("bears", "Chicago Bears", "CHI", "#0b162a",["home", "away", "alternate","rivalry"]),
      t("lions", "Detroit Lions", "DET", "#0076b6",["home", "away", "alternate","rivalry","throwback"]),
      t("packers", "Green Bay Packers", "GB", "#203731",["home", "away", "rivalry","throwback"]),
      t("vikings", "Minnesota Vikings", "MIN", "#4f2683",["home", "away", "alternate","rivalry","throwback"]),
    ]},
    { id: "nfc-east", conf: "NFC", name: "NFC East", teams: [
      t("cowboys", "Dallas Cowboys", "DAL", "#003594",["home", "away", "alternate","throwback"]),
      t("giants", "New York Giants", "NYG", "#0b2265",["home", "away", "alternate red","alternate blue","throwback"]),
      t("eagles", "Philadelphia Eagles", "PHI", "#004c54",["home", "away", "alternate","throwback"]),
      t("commanders", "Washington Commanders", "WAS", "#5a1414",["home", "away", "alternate"]),
    ]},
    { id: "nfc-west", conf: "NFC", name: "NFC West", teams: [
      t("cardinals", "Arizona Cardinals", "ARI", "#97233f",["home", "away", "alternate","rivalry"]),
      t("rams", "Los Angeles Rams", "LAR", "#003594",["home", "away", "alternate white", "alternate yellow","rivalry"]),
      t("49ers", "San Francisco 49ers", "SF", "#aa0000",["home", "away", "alternate red","alternate white","rivalry"]),
      t("seahawks", "Seattle Seahawks", "SEA", "#002244",["home", "away", "alternate","rivalry","throwback"]),
    ]},
    { id: "nfc-south", conf: "NFC", name: "NFC South", teams: [
      t("falcons", "Atlanta Falcons", "ATL", "#a71930",["home", "away", "throwback"]),
      t("panthers", "Carolina Panthers", "CAR", "#0085ca",["home", "away", "alternate"]),
      t("saints", "New Orleans Saints", "NO", "#d3bc8d",["home", "away", "alternate gold","alternate white"]),
      t("buccaneers", "Tampa Bay Buccaneers", "TB", "#d50a0a",["home", "away", "throwback creamsicle","throwback white"]),
    ]},
  ];

  const CONF_COLOR = { AFC: "#c8102e", NFC: "#013369" };

  const TEAM = {};
  const DIV = {};
  DIVISIONS.forEach(d => {
    DIV[d.id] = d;
    d.teams.forEach(tm => { TEAM[tm.id] = tm; });
  });
  const ALL_TEAMS = DIVISIONS.flatMap(d => d.teams);

  const state = {
    team: {},        // teamId     -> jersey name
    division: {},    // divisionId -> teamId
    conf: {},        // "AFC"|"NFC" -> teamId
    superbowl: null, // teamId
    toilet: null,    // teamId
  };

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) Object.assign(state, saved);
    } catch (e) { /* ignore */ }
  }

  // Drop any pick that no longer makes sense after something below it changed.
  function cleanup() {
    DIVISIONS.forEach(d => {
      const w = state.division[d.id];
      if (w && !d.teams.some(tm => tm.id === w)) delete state.division[d.id];
    });
    ["AFC", "NFC"].forEach(c => {
      const valid = DIVISIONS.filter(d => d.conf === c).map(d => state.division[d.id]);
      if (state.conf[c] && !valid.includes(state.conf[c])) delete state.conf[c];
    });
    if (state.superbowl && !["AFC", "NFC"].some(c => state.conf[c] === state.superbowl)) {
      state.superbowl = null;
    }
    if (state.toilet) {
      const tm = TEAM[state.toilet.team];
      if (!tm || !tm.jerseys.includes(state.toilet.jersey) || state.team[tm.id] === state.toilet.jersey) {
        state.toilet = null;
      }
    }
  }

  function commit() { cleanup(); save(); render(); }

  const pretty = s => s.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  function isLight(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }

  function placeholder(line1, line2, color) {
    const fg = isLight(color) ? "#111" : "#fff";
    const second = line2
      ? `<text x="100" y="140" font-family="Arial,sans-serif" font-size="26" text-anchor="middle" fill="${fg}">${line2}</text>`
      : "";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
      `<rect width="200" height="200" rx="16" fill="${color}"/>` +
      `<text x="100" y="${line2 ? 98 : 112}" font-family="Arial,sans-serif" font-size="46" font-weight="700" text-anchor="middle" fill="${fg}">${line1}</text>` +
      second + `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  const logoAsset = tm => ({
    srcs: logoSrcs(tm.id),
    fallback: placeholder(tm.abbr, "logo", tm.color),
    label: tm.name,
  });

  const jerseyAsset = (tm, j) => ({
    srcs: withExts(`images/jerseys/${tm.id}/${j}`, JERSEY_EXTS),
    fallback: placeholder(tm.abbr, pretty(j), tm.color),
    label: `${tm.name} – ${pretty(j)}`,
  });

  const resolved = new Map();


  function makeImg(asset) {
    const img = new Image();
    const key = asset.srcs.join("|");
    const queue = [...asset.srcs, asset.fallback];
    img.alt = asset.label;
    img.draggable = false;
    img.addEventListener("load", () => { resolved.set(key, img.src); });
    img.addEventListener("error", () => {
      if (queue.length) img.src = queue.shift();
    });
    img.src = resolved.get(key) || queue.shift();
    return img;
  }

  function validPick(tm) {
    const j = state.team[tm.id];
    return j && tm.jerseys.includes(j) ? j : null;
  }

  function teamDisplay(tm) {
    const j = validPick(tm);
    return j ? jerseyAsset(tm, j) : logoAsset(tm);
  }

  function describeSlot(kind, key) {
    if (kind === "team") {
      const tm = TEAM[key];
      return { asset: teamDisplay(tm), picked: !!validPick(tm) };
    }
    if (kind === "division") {
      const d = DIV[key];
      const w = state.division[key];
      if (w) return { asset: teamDisplay(TEAM[w]), picked: true };
      return {
        asset: {
          srcs: logoSrcs(d.id),
          fallback: placeholder(d.conf, d.name.split(" ")[1], CONF_COLOR[d.conf]),
          label: d.name,
        },
        picked: false,
      };
    }
    if (kind === "conf") {
      const w = state.conf[key];
      if (w) return { asset: teamDisplay(TEAM[w]), picked: true };
      return {
        asset: {
          srcs: logoSrcs(`${key.toLowerCase()}-championship`),
          fallback: placeholder(key, "Champ", CONF_COLOR[key]),
          label: `${key} Championship`,
        },
        picked: false,
      };
    }

    const superBowlLogo = { srcs: logoSrcs("super-bowl"), fallback: placeholder("Super", "Bowl", "#b8860b"), label: "Super Bowl" };
    const toiletLogo = { srcs: logoSrcs("toilet-bowl"), fallback: placeholder("Toilet", "Bowl", "#777777"), label: "Toilet Bowl (worst jersey)" };

    if (kind === "superbowl") {
      if (state.superbowl) {
        return { asset: teamDisplay(TEAM[state.superbowl]), backdrop: superBowlLogo, picked: true };
      }
      return { asset: superBowlLogo, picked: false };
    }

    if (state.toilet) {
      return {
        asset: jerseyAsset(TEAM[state.toilet.team], state.toilet.jersey),
        backdrop: toiletLogo,
        picked: true,
      };
    }
    return { asset: toiletLogo, picked: false };
  }

  const slots = [];

  const el = (tag, cls) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };

  function addLabel(slot, text) {
    const l = el("span", "label");
    l.textContent = text;
    slot.appendChild(l);
  }

  function slotEl(kind, key, cls = "") {
    const b = el("button", `slot ${kind} ${cls}`.trim());
    b.type = "button";
    b.dataset.kind = kind;
    b.dataset.key = key;
    b.addEventListener("click", e => {
      e.stopPropagation();
      if (anchor === b && !popup.hidden) closePopup();
      else openFor(b);
    });
    slots.push(b);
    return b;
  }

  function buildHalf(conf) {
    const half = el("section", `half ${conf.toLowerCase()}`);
    const divs = el("div", "divisions");

    DIVISIONS.filter(d => d.conf === conf).forEach(d => {
      const row = el("div", "division");
      row.appendChild(slotEl("division", d.id, "light"));
      const grid = el("div", "teams");
      d.teams.forEach(tm => grid.appendChild(slotEl("team", tm.id)));
      row.appendChild(grid);
      divs.appendChild(row);
    });

    const champ = el("div", "champ");
    const wrap = el("div", "champ-wrap");
    const champLabel = el("div", "champ-label");
    champLabel.textContent = `${conf} Championship`;
    wrap.append(slotEl("conf", conf, "bare"), champLabel);
    champ.appendChild(wrap);
    half.append(divs, champ);
    return half;
  }

  function render() {
    slots.forEach(b => {
      const { asset, backdrop, picked } = describeSlot(b.dataset.kind, b.dataset.key);
      const sig = asset.srcs.join("|") + (backdrop ? "+" + backdrop.srcs.join("|") : "");
      if (b.dataset.sig !== sig) {
        b.dataset.sig = sig;
        if (backdrop) {
          const back = makeImg(backdrop);
          back.className = "backdrop";
          const front = makeImg(asset);
          front.className = "front";
          b.replaceChildren(back, front);
        } else {
          b.replaceChildren(makeImg(asset));
        }
        if (b.dataset.kind === "team") {
          const tm = TEAM[b.dataset.key];
          const j = validPick(tm);
          const tag = el("span", "tag");
          tag.textContent = j ? pretty(j) : tm.name;
          b.appendChild(tag);
          if (SHOW_TEAM_LABELS) addLabel(b, tm.name);
        } else if (b.dataset.kind === "division") {
          addLabel(b, DIV[b.dataset.key].name);
        }
      }
      b.classList.toggle("picked", picked);
      b.classList.toggle("layered", !!backdrop);
      b.title = asset.label;
      b.setAttribute("aria-label", asset.label);
    });
  }

  const popup = document.getElementById("popup");
  let anchor = null;

  function closePopup() {
    popup.hidden = true;
    popup.replaceChildren();
    anchor = null;
  }

  function positionPopup(slot) {
    const r = slot.getBoundingClientRect();
    const pw = popup.offsetWidth, ph = popup.offsetHeight, m = 8;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(m, Math.min(left, window.innerWidth - pw - m));
    let top = r.bottom + m;
    if (top + ph > window.innerHeight - m) top = Math.max(m, r.top - ph - m);
    popup.style.left = left + "px";
    popup.style.top = top + "px";
  }

  function showPopup(slot, { title, items, empty, onClear }) {
    popup.replaceChildren();

    const head = el("div", "popup-head");
    const h = el("span");
    h.textContent = title;
    head.appendChild(h);
    if (onClear) {
      const c = el("button");
      c.type = "button";
      c.textContent = "Clear";
      c.addEventListener("click", () => { onClear(); commit(); closePopup(); });
      head.appendChild(c);
    }
    popup.appendChild(head);

    if (!items.length) {
      const p = el("div", "popup-empty");
      p.textContent = empty;
      popup.appendChild(p);
    } else {
      const grid = el("div", "popup-grid");
      grid.style.setProperty("--cols", Math.min(items.length, items.length > 8 ? 6 : 4));
      items.forEach(item => {
        const b = el("button", "choice");
        b.type = "button";
        const cap = el("span");
        cap.textContent = item.caption;
        b.append(makeImg(item.asset), cap);
        b.addEventListener("click", () => { item.onPick(); commit(); closePopup(); });
        grid.appendChild(b);
      });
      popup.appendChild(grid);
    }

    popup.hidden = false;
    anchor = slot;
    positionPopup(slot);
  }

  function openFor(slot) {
    const { kind, key } = slot.dataset;

    const teamItems = ids => ids.map(id => ({
      asset: teamDisplay(TEAM[id]),
      caption: TEAM[id].name,
      onPick: null,
    }));

    if (kind === "team") {
      const tm = TEAM[key];
      showPopup(slot, {
        title: `${tm.name}`,
        items: tm.jerseys.map(j => ({
          asset: jerseyAsset(tm, j),
          caption: pretty(j),
          onPick: () => { state.team[tm.id] = j; },
        })),
        onClear: state.team[tm.id] ? () => { delete state.team[tm.id]; } : null,
      });
      return;
    }

    if (kind === "toilet") {
      const items = [];
      ALL_TEAMS.forEach(tm => tm.jerseys.forEach(j => {
        if (state.team[tm.id] === j) return;
        items.push({
          asset: jerseyAsset(tm, j),
          caption: `${tm.name} – ${pretty(j)}`,
          onPick: () => { state.toilet = { team: tm.id, jersey: j }; },
        });
      }));
      showPopup(slot, {
        title: "Toilet Bowl – worst jersey (jerseys you didn't pick as a favourite)",
        items,
        empty: "Every jersey has been picked as a favourite.",
        onClear: state.toilet ? () => { state.toilet = null; } : null,
      });
      return;
    }

    let title, ids, empty, get, set, clear;

    if (kind === "division") {
      const d = DIV[key];
      title = `${d.name} winner`;
      ids = d.teams.map(tm => tm.id);
      get = () => state.division[d.id];
      set = id => { state.division[d.id] = id; };
      clear = () => { delete state.division[d.id]; };
    } else if (kind === "conf") {
      title = `${key} champion`;
      ids = DIVISIONS.filter(d => d.conf === key).map(d => state.division[d.id]).filter(Boolean);
      empty = "Pick your division winners first.";
      get = () => state.conf[key];
      set = id => { state.conf[key] = id; };
      clear = () => { delete state.conf[key]; };
    } else if (kind === "superbowl") {
      title = "Super Bowl champion";
      ids = ["NFC", "AFC"].map(c => state.conf[c]).filter(Boolean);
      empty = "Pick both conference champions first.";
      get = () => state.superbowl;
      set = id => { state.superbowl = id; };
      clear = () => { state.superbowl = null; };
    } else {
      return;
    }

    const items = teamItems(ids).map((it, i) => ({ ...it, onPick: () => set(ids[i]) }));
    showPopup(slot, { title, items, empty, onClear: get() ? clear : null });
  }

  document.addEventListener("click", e => {
    if (!popup.hidden && !popup.contains(e.target)) closePopup();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePopup(); });
  window.addEventListener("resize", closePopup);


  document.body.classList.toggle("show-team-labels", SHOW_TEAM_LABELS);

  const halves = document.getElementById("halves");
  halves.append(buildHalf("NFC"), buildHalf("AFC"));
  document.getElementById("center-top").appendChild(slotEl("superbowl", "superbowl", "bare"));
  document.getElementById("center-bottom").appendChild(slotEl("toilet", "toilet", "bare"));

  document.getElementById("reset").addEventListener("click", () => {
    if (!confirm("Clear all of your picks?")) return;
    state.team = {}; state.division = {}; state.conf = {};
    state.superbowl = null; state.toilet = null;
    commit();
  });

  const WATERMARK_TEXT = "github.com/nmcfrlne/";
  const EXPORT_SCALE = 2;              // 2 = double resolution (sharper image)
  const EXPORT_FILENAME = "nfl-jersey-bracket.png";

  const stageEl = document.querySelector(".stage");
  const watermark = el("div", "watermark");
  watermark.textContent = WATERMARK_TEXT;
  stageEl.appendChild(watermark);

  const exportBtn = el("button");
  exportBtn.type = "button";
  exportBtn.id = "export";
  exportBtn.textContent = "Export image";
  document.getElementById("reset").after(exportBtn);

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Same as CSS linear-gradient(<deg>, ...) for a box.
  function cssGradient(ctx, x, y, w, h, deg) {
    const a = deg * Math.PI / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const len = Math.abs(w * dx) + Math.abs(h * dy);
    const cx = x + w / 2, cy = y + h / 2;
    return ctx.createLinearGradient(
      cx - dx * len / 2, cy - dy * len / 2,
      cx + dx * len / 2, cy + dy * len / 2);
  }

  function drawContain(ctx, img, r) {
    if (!img.complete || !img.naturalWidth) return;
    const k = Math.min(r.w / img.naturalWidth, r.h / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.drawImage(img, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
    return text + "…";
  }

  function exportImage() {
    closePopup();
    const sr = stageEl.getBoundingClientRect();
    const S = EXPORT_SCALE;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sr.width * S);
    canvas.height = Math.round(sr.height * S);
    const ctx = canvas.getContext("2d");
    ctx.scale(S, S);

    const box = e => {
      const r = e.getBoundingClientRect();
      return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
    };

    const bg = ctx.createLinearGradient(0, 0, sr.width, 0);
    bg.addColorStop(0, "#001b36");
    bg.addColorStop(0.3, "#001b36");
    bg.addColorStop(0.7, "#8a0b24");
    bg.addColorStop(1, "#8a0b24");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, sr.width, sr.height);

    slots.forEach(slot => {
      const r = box(slot);
      const picked = slot.classList.contains("picked");
      const layered = slot.classList.contains("layered");
      const bare = slot.classList.contains("bare");

      if (!layered && !(bare && !picked)) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.4)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        roundRectPath(ctx, r.x, r.y, r.w, r.h, 14);
        if (picked) {
          ctx.fillStyle = "#141414";
        } else {
          const g = cssGradient(ctx, r.x, r.y, r.w, r.h, 145);
          g.addColorStop(0, "rgba(255,255,255,.13)");
          g.addColorStop(1, "rgba(0,0,0,.30)");
          ctx.fillStyle = g;
        }
        ctx.fill();
        ctx.restore();
        roundRectPath(ctx, r.x + .5, r.y + .5, r.w - 1, r.h - 1, 14);
        ctx.lineWidth = 1;
        ctx.strokeStyle = picked ? "#ffd54a"
          : slot.classList.contains("light") ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.16)";
        ctx.stroke();
      }

      ctx.save();
      if (!layered) { roundRectPath(ctx, r.x, r.y, r.w, r.h, 14); ctx.clip(); }
      slot.querySelectorAll("img").forEach(img => {
        ctx.save();
        if (img.classList.contains("front")) {
          ctx.shadowColor = "rgba(0,0,0,.45)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;
        }
        drawContain(ctx, img, box(img));
        ctx.restore();
      });

      slot.querySelectorAll(".label").forEach(lab => {
        const lr = box(lab);
        const cs = getComputedStyle(lab);
        const g = ctx.createLinearGradient(0, lr.y, 0, lr.y + lr.h);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,0,0,.85)");
        ctx.fillStyle = g;
        ctx.fillRect(lr.x, lr.y, lr.w, lr.h);
        ctx.fillStyle = "#fff";
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fs = parseFloat(cs.fontSize);
        const pb = parseFloat(cs.paddingBottom);
        ctx.fillText(fitText(ctx, lab.textContent, lr.w - 12), lr.x + lr.w / 2, lr.y + lr.h - pb - fs * 0.6);
      });
      ctx.restore();
    });

    document.querySelectorAll(".champ-label").forEach(p => {
      const pr = box(p);
      const cs = getComputedStyle(p);
      ctx.fillStyle = "rgba(0,0,0,.4)";
      roundRectPath(ctx, pr.x, pr.y, pr.w, pr.h, pr.h / 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.textContent, pr.x + pr.w / 2, pr.y + pr.h / 2 + 0.5);
    });

    // watermark
    const wr = box(watermark);
    const wcs = getComputedStyle(watermark);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = `${wcs.fontWeight} ${wcs.fontSize} ${wcs.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(watermark.textContent, wr.x + wr.w / 2, wr.y + wr.h / 2);

    try {
      canvas.toBlob(blob => {
        if (!blob) { alert("Sorry, the image could not be created."); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = EXPORT_FILENAME;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } catch (err) {
      alert("The browser blocked the export because the images were loaded from local files. " +
            "Open the page through a web server (or GitHub Pages) and try again.");
    }
  }

  exportBtn.addEventListener("click", exportImage);

  load();
  cleanup();
  render();
})();