const LS_KEY = "buchKapitelCounter_v6";
const TOUR_FLAG = LS_KEY + "_tourDone";
const DEFAULTS = { minTotal: 1100, maxTotal: 1500 };
const el = (id) => document.getElementById(id);

function countWithoutNewlines(str) {
  return (str || "").replace(/\r?\n/g, "").length;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function formatDT(d = new Date()) {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function rectsOverlap(a, b, pad = 0) {
  return !(
    a.right < b.left + pad ||
    a.left > b.right - pad ||
    a.bottom < b.top + pad ||
    a.top > b.bottom - pad
  );
}

const textEl = el("text");
const chaptersEl = el("chapters");
const currentEl = el("currentChapter");
const prevChapterBtn = el("prevChapter");
const nextChapterBtn = el("nextChapter");
const chaptersTotalDisplay = el("chaptersTotalDisplay");
const minTotalEl = el("minTotal");
const maxTotalEl = el("maxTotal");

// NEU: Rahmendaten-Referenzen
const rahmendatenEl = el("rahmendaten");
const rahmendatenCountEl = el("rahmendatenCount");

const autosaveToggleEl = el("autosaveToggle");
const intervalEl = el("interval");
const saveInfoEl = el("saveInfo");
const saveBtn = el("save");
const exportBtn = el("export");
const importBtn = el("importBtn");
const importFileEl = el("importFile");
const clearBtn = el("clear");

const hudEl = el("hud");
const hudContentEl = el("hudContent");
const toggleHudBtn = el("toggleHud");
const hudCompactBtn = el("hudCompactBtn");
const hudHideBtn = el("hudHideBtn");
const hudHelpBtn = el("hudHelpBtn");
const toggleCompactBtn = el("toggleCompact");

const lsExportBtn = el("lsExport");
const lsImportBtn = el("lsImportBtn");
const lsImportFile = el("lsImportFile");

const tourEl = el("tour");
const tourSpot = el("tourSpot");
const tourBox = el("tourBox");
const tourText = el("tourText");
const tourPrev = el("tourPrev");
const tourNext = el("tourNext");
const tourSkip = el("tourSkip");
const tourProgress = el("tourProgress");

const state = {
  minTotal: DEFAULTS.minTotal,
  maxTotal: DEFAULTS.maxTotal,
  lastSavedTs: null,
  hudVisible: true,
  compact: false,
  // NEU
  rahmendatenCount: 0,
};
let autosaveTimer = null;

function getEffectiveTotals() {
  const baseMin = Math.min(state.minTotal, state.maxTotal);
  const baseMax = Math.max(state.minTotal, state.maxTotal);
  const rd = Math.max(0, state.rahmendatenCount || 0);
  const effMin = Math.max(0, baseMin - rd);
  const effMax = Math.max(0, baseMax - rd);
  return { effMin, effMax };
}

function renderHUDContent() {
  const chapters = clamp(parseInt(chaptersEl.value || "1", 10), 1, 1e6);
  const current = clamp(parseInt(currentEl.value || "1", 10), 1, chapters);
  const text = textEl.value || "";
  const count = countWithoutNewlines(text);
  const rahmenCount = Math.max(0, state.rahmendatenCount || 0);
  const { effMin, effMax } = getEffectiveTotals();

  const minAllowed = Math.floor((current / chapters) * effMin);
  const maxAllowed = Math.floor((current / chapters) * effMax);

  let deltaTxt = "";
  let deltaClass = "delta-ok";
  if (count > maxAllowed) {
    const over = count - maxAllowed;
    deltaTxt = `Über Maximum: +${over.toLocaleString("de-DE")} Zeichen`;
    deltaClass = "delta-bad";
  } else if (count < minAllowed) {
    const need = minAllowed - count;
    deltaTxt = `Unter Minimum: noch ${need.toLocaleString(
      "de-DE"
    )} Zeichen bis Minimum`;
    deltaClass = "delta-warn";
  } else {
    const remain = maxAllowed - count;
    deltaTxt = `Verbleibend bis Maximum: ${remain.toLocaleString(
      "de-DE"
    )} Zeichen`;
    deltaClass = "delta-ok";
  }

  const pctNow = maxAllowed > 0 ? Math.min(count / maxAllowed, 1) * 100 : 0;
  const bandStartPct =
    maxAllowed > 0
      ? Math.max(0, Math.min(100, (minAllowed / maxAllowed) * 100))
      : 0;
  const bandWidthPct = maxAllowed > 0 ? Math.max(0, 100 - bandStartPct) : 0;

  const tipCount =
    "Leerzeichen & Tabulatoren zählen. Enter/Zeilenumbrüche zählen nicht.";
  const tipSollKap = `Linear: Bis Kapitel sind k/N vom Gesamtsoll erlaubt.`;
  const tipMini =
    "Balken = Fortschritt gegen Soll-Max. Grün-Gelb-Band = 'OK'-Bereich ab Soll-Min.";
  const tipRahmen =
    "Rahmendaten sind global und werden vom Gesamtzeichenbudget abgezogen (nicht kapitelgebunden).";

  if (state.compact) {
    hudContentEl.innerHTML = `
          <div class="line">
            <span class="label">Ist <span class="tip" tabindex="0" role="button" aria-expanded="false" data-tip="${tipCount}">i</span></span>
            <span class="val">${count.toLocaleString("de-DE")}</span>
          </div>
          <div class="line">
            <span class="label">Rahmendaten <span class="tip" tabindex="0" role="button" aria-expanded="false" data-tip="${tipRahmen}">i</span></span>
            <span class="val">${rahmenCount.toLocaleString("de-DE")}</span>
          </div>
          <div class="mini" title="${tipMini}">
            <div class="band" style="left:${bandStartPct}%; width:${bandWidthPct}%"></div>
            <div class="b ${
              count > maxAllowed ? "over" : ""
            }" style="width:${pctNow}%"></div>
          </div>
          <div class="line">
            <span class="label">Delta</span>
            <span class="${deltaClass}">${deltaTxt}</span>
          </div>
        `;
  } else {
    hudContentEl.innerHTML = `
          <div class="line">
            <span class="label">Ist (ohne Enter) <span class="tip" tabindex="0" role="button" aria-expanded="false" data-tip="${tipCount}">i</span></span>
            <span class="val">${count.toLocaleString("de-DE")}</span>
          </div>

          <div class="line">
            <span class="label">Rahmendaten <span class="tip" tabindex="0" role="button" aria-expanded="false" data-tip="${tipRahmen}">i</span></span>
            <span class="val">${rahmenCount.toLocaleString("de-DE")}</span>
          </div>

          <div class="line chapline">
            <span class="label">Kapitel</span>
            <span class="ctrl">
              <button id="hudPrev" class="mini-btn" title="Kapitel zurück">‹</button>
              <span class="val">${current} / ${chapters}</span>
              <button id="hudNext" class="mini-btn" title="Kapitel vor">›</button>
            </span>
          </div>

          <div class="line soll">
            <span class="label">Soll bis Kapitel <span class="tip" tabindex="0" role="button" aria-expanded="false" data-tip="${tipSollKap}">i</span></span>
            <span class="val">${minAllowed.toLocaleString(
              "de-DE"
            )} – ${maxAllowed.toLocaleString("de-DE")}</span>
          </div>

          <div class="mini" title="${tipMini}">
            <div class="band" style="left:${bandStartPct}%; width:${bandWidthPct}%"></div>
            <div class="b ${
              count > maxAllowed ? "over" : ""
            }" style="width:${pctNow}%"></div>
          </div>

          <div class="line">
            <span class="label">Delta</span>
            <span class="${deltaClass}">${deltaTxt}</span>
          </div>
        `;
  }

  const hudPrev = document.getElementById("hudPrev");
  const hudNext = document.getElementById("hudNext");
  if (hudPrev)
    hudPrev.addEventListener("click", () => {
      stepChapter(-1);
    });
  if (hudNext)
    hudNext.addEventListener("click", () => {
      stepChapter(+1);
    });

  hudEl.querySelectorAll(".tip").forEach((t) => {
    t.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        const expanded = t.getAttribute("aria-expanded") === "true";
        hudEl
          .querySelectorAll(".tip[aria-expanded='true']")
          .forEach((o) => o.setAttribute("aria-expanded", "false"));
        t.setAttribute("aria-expanded", expanded ? "false" : "true");
      },
      { once: true }
    );
  });
}

function updateUI() {
  const chapters = clamp(parseInt(chaptersEl.value || "1", 10), 1, 1e6);
  chaptersEl.value = chapters;
  chaptersTotalDisplay.textContent = String(chapters);

  let current = parseInt(currentEl.value || "1", 10);
  current = clamp(current, 1, chapters);
  currentEl.value = current;

  prevChapterBtn.disabled = current <= 1;
  nextChapterBtn.disabled = current >= chapters;

  renderHUDContent();
  autoPlaceHUD();
}

function saveNow(note = "") {
  const data = {
    text: textEl.value || "",
    rahmendaten: rahmendatenEl?.value || "",
    chapters: parseInt(chaptersEl.value || "1", 10),
    current: parseInt(currentEl.value || "1", 10),
    minTotal: state.minTotal,
    maxTotal: state.maxTotal,
    autosave: autosaveToggleEl.value,
    intervalSec: Math.max(2, parseInt(intervalEl.value || "5", 10)),
    compact: !!state.compact,
    ts: Date.now(),
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    state.lastSavedTs = data.ts;
    saveInfoEl.textContent = `Gespeichert: ${formatDT(new Date(data.ts))}${
      note ? " • " + note : ""
    }`;
  } catch (e) {
    saveInfoEl.textContent = "Konnte nicht lokal speichern.";
  }
  updateUI();
}

function scheduleAutosave() {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
  const enabled = autosaveToggleEl.value === "on";
  const sec = Math.max(2, parseInt(intervalEl.value || "5", 10));
  if (enabled) {
    autosaveTimer = setInterval(() => saveNow("Autosave"), sec * 1000);
  }
}

function loadFromStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      const d = JSON.parse(raw);
      if (Number.isFinite(d.chapters)) chaptersEl.value = d.chapters;
      if (Number.isFinite(d.current)) currentEl.value = d.current;
      if (Number.isFinite(d.minTotal)) {
        state.minTotal = Math.max(0, d.minTotal);
        minTotalEl.value = state.minTotal;
      } else {
        state.minTotal = DEFAULTS.minTotal;
        minTotalEl.value = DEFAULTS.minTotal;
      }
      if (Number.isFinite(d.maxTotal)) {
        state.maxTotal = Math.max(0, d.maxTotal);
        maxTotalEl.value = state.maxTotal;
      } else {
        state.maxTotal = DEFAULTS.maxTotal;
        maxTotalEl.value = DEFAULTS.maxTotal;
      }
      if (typeof d.text === "string") textEl.value = d.text;

      // NEU: Rahmendaten laden und zählen
      if (typeof d.rahmendaten === "string") {
        if (rahmendatenEl) rahmendatenEl.value = d.rahmendaten;
        state.rahmendatenCount = countWithoutNewlines(d.rahmendaten);
        if (rahmendatenCountEl)
          rahmendatenCountEl.textContent =
            state.rahmendatenCount.toLocaleString("de-DE");
      } else {
        state.rahmendatenCount = 0;
        if (rahmendatenCountEl) rahmendatenCountEl.textContent = "0";
      }

      if (d.autosave === "on" || d.autosave === "off")
        autosaveToggleEl.value = d.autosave;
      if (Number.isFinite(d.intervalSec))
        intervalEl.value = Math.max(2, d.intervalSec);
      if (typeof d.compact === "boolean") state.compact = d.compact;
      if (Number.isFinite(d.ts)) {
        state.lastSavedTs = d.ts;
        saveInfoEl.textContent = `Zuletzt gespeichert: ${formatDT(
          new Date(d.ts)
        )}`;
      }
    } catch {
      state.minTotal = DEFAULTS.minTotal;
      minTotalEl.value = DEFAULTS.minTotal;
      state.maxTotal = DEFAULTS.maxTotal;
      maxTotalEl.value = DEFAULTS.maxTotal;
      state.rahmendatenCount = 0;
      if (rahmendatenCountEl) rahmendatenCountEl.textContent = "0";
    }
  } else {
    state.minTotal = DEFAULTS.minTotal;
    minTotalEl.value = DEFAULTS.minTotal;
    state.maxTotal = DEFAULTS.maxTotal;
    maxTotalEl.value = DEFAULTS.maxTotal;
    state.rahmendatenCount = 0;
    if (rahmendatenCountEl) rahmendatenCountEl.textContent = "0";
  }
  hudEl.classList.toggle("compact", state.compact);
  updateUI();
  scheduleAutosave();
}

function exportTxt() {
  const content = textEl.value || "";
  const count = countWithoutNewlines(content);
  const filename = `buch_${count}_zeichen_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-")}.txt`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

function clearAll() {
  if (!confirm("Wirklich alles löschen? (Text & Einstellungen)")) return;
  textEl.value = "";
  if (rahmendatenEl) rahmendatenEl.value = "";
  state.rahmendatenCount = 0;
  if (rahmendatenCountEl) rahmendatenCountEl.textContent = "0";

  chaptersEl.value = 30;
  currentEl.value = 1;
  state.minTotal = DEFAULTS.minTotal;
  state.maxTotal = DEFAULTS.maxTotal;
  minTotalEl.value = DEFAULTS.minTotal;
  maxTotalEl.value = DEFAULTS.maxTotal;
  autosaveToggleEl.value = "on";
  intervalEl.value = 5;
  state.lastSavedTs = null;
  state.compact = false;
  localStorage.removeItem(LS_KEY);
  saveInfoEl.textContent = "";
  hudEl.classList.remove("compact");
  updateUI();
  scheduleAutosave();
}

function stepChapter(delta) {
  const chapters = clamp(parseInt(chaptersEl.value || "1", 10), 1, 1e6);
  let current = clamp(parseInt(currentEl.value || "1", 10), 1, chapters);
  current = clamp(current + delta, 1, chapters);
  currentEl.value = current;
  updateUI();
  saveNow();
}

function candidateRects(width, height) {
  const right = 16;
  const topMargin = 12 + (window.visualViewport?.offsetTop || 0);
  const bottomMargin =
    16 +
    (window.visualViewport
      ? window.innerHeight -
        (window.visualViewport.height + window.visualViewport.offsetTop)
      : 0);
  const topRect = {
    left: window.innerWidth - right - width,
    top: topMargin,
    right: window.innerWidth - right,
    bottom: topMargin + height,
  };
  const bottomRect = {
    left: window.innerWidth - right - width,
    top: window.innerHeight - bottomMargin - height,
    right: window.innerWidth - right,
    bottom: window.innerHeight - bottomMargin,
  };
  return { topRect, bottomRect };
}
function autoPlaceHUD() {
  if (!state.hudVisible) return;
  const width = hudEl.offsetWidth;
  const height = hudEl.offsetHeight;
  const { topRect, bottomRect } = candidateRects(width, height);
  const taRect = textEl.getBoundingClientRect();
  const bottomOverlap = rectsOverlap(bottomRect, taRect, 8);
  const topOverlap = rectsOverlap(topRect, taRect, 8);
  if (bottomOverlap && !topOverlap) {
    hudEl.style.top = `${topRect.top}px`;
    hudEl.style.bottom = "auto";
  } else {
    hudEl.style.bottom = `${window.innerHeight - bottomRect.bottom}px`;
    hudEl.style.top = "auto";
  }

  const vv = window.visualViewport;
  const kbLikely = vv
    ? vv.height < window.innerHeight * 0.7
    : window.innerHeight < 500;
  if (kbLikely && rectsOverlap(hudEl.getBoundingClientRect(), taRect, 0)) {
    hudEl.style.opacity = "0";
    hudEl.style.pointerEvents = "none";
  } else {
    hudEl.style.opacity = "1";
    hudEl.style.pointerEvents = "auto";
  }
}

const TOUR_STEPS = [
  {
    sel: "#chapters",
    text: "Stelle hier die Anzahl deiner Kapitel ein.",
  },
  {
    sel: "#chapterControls",
    text: "Wechsle das Kapitel mit den Pfeilen oder gib die Nummer direkt ein.",
  },
  {
    sel: "#minTotal",
    text: "Setze das gewünschte Gesamt-Minimum an Zeichen für dein Buch.",
  },
  {
    sel: "#maxTotal",
    text: "Und hier das Gesamt-Maximum, das du nicht überschreiten möchtest.",
  },
  {
    sel: "#hud",
    text: "Im HUD siehst du live Ist/Soll, Fortschrittsbalken und Delta – dein Kompass beim Schreiben.",
  },
  {
    sel: "#lsExport",
    text: "Sichere deinen Stand als LocalStorage-Backup (JSON), um ihn später wieder zu laden.",
  },
  {
    sel: "#lsImportBtn",
    text: "Hier kannst du ein Backup laden. Achtung: Überschreibt deinen aktuellen Stand!",
  },
];
let tourIndex = 0;

function ensureHUDVisibleForTour() {
  if (!state.hudVisible) {
    setHudVisible(true);
  }
}

function positionSpotAndBox(target) {
  const pad = 8;
  const r = target.getBoundingClientRect();
  const spotLeft = Math.max(8, r.left - pad + window.scrollX);
  const spotTop = Math.max(8, r.top - pad + window.scrollY);
  const spotWidth = r.width + pad * 2;
  const spotHeight = r.height + pad * 2;

  tourSpot.style.left = `${spotLeft}px`;
  tourSpot.style.top = `${spotTop}px`;
  tourSpot.style.width = `${spotWidth}px`;
  tourSpot.style.height = `${spotHeight}px`;

  const viewportH = window.innerHeight;
  const belowY = r.bottom + 12 + window.scrollY;
  const aboveY = r.top - 12 - tourBox.offsetHeight + window.scrollY;
  const rightX = Math.min(
    window.scrollX + window.innerWidth - tourBox.offsetWidth - 12,
    r.right + 12 + window.scrollX
  );
  let boxTop, boxLeft;

  if (r.bottom + 12 + tourBox.offsetHeight < viewportH) {
    boxTop = belowY;
    boxLeft = Math.min(
      Math.max(12 + window.scrollX, r.left + window.scrollX),
      window.scrollX + window.innerWidth - tourBox.offsetWidth - 12
    );
  } else if (r.top - 12 - tourBox.offsetHeight > 0) {
    boxTop = aboveY;
    boxLeft = Math.min(
      Math.max(12 + window.scrollX, r.left + window.scrollX),
      window.scrollX + window.innerWidth - tourBox.offsetWidth - 12
    );
  } else {
    boxTop = Math.max(12 + window.scrollY, r.top + window.scrollY);
    boxLeft = rightX;
  }
  tourBox.style.top = `${boxTop}px`;
  tourBox.style.left = `${boxLeft}px`;
}

function goTour(i) {
  tourIndex = clamp(i, 0, TOUR_STEPS.length - 1);
  const step = TOUR_STEPS[tourIndex];
  const target = document.querySelector(step.sel);
  if (!target) {
    if (tourIndex < TOUR_STEPS.length - 1) return goTour(tourIndex + 1);
    endTour(true);
    return;
  }
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  setTimeout(() => {
    tourText.textContent = step.text;
    tourProgress.textContent = `Schritt ${tourIndex + 1} / ${
      TOUR_STEPS.length
    }`;
    positionSpotAndBox(target);
    tourPrev.disabled = tourIndex === 0;
    tourNext.textContent =
      tourIndex === TOUR_STEPS.length - 1 ? "Fertig" : "Weiter";
  }, 200);
}

function startTour(auto = false) {
  ensureHUDVisibleForTour();
  tourEl.classList.add("active");
  tourEl.style.display = "block";
  goTour(0);
  if (auto) localStorage.setItem(TOUR_FLAG, "in_progress");
}
function endTour(markDone = false) {
  tourEl.classList.remove("active");
  tourEl.style.display = "none";
  if (markDone) localStorage.setItem(TOUR_FLAG, "1");
}

textEl.addEventListener("input", () => {
  updateUI();
});
textEl.addEventListener("scroll", () => {
  const nearBottom =
    textEl.scrollTop + textEl.clientHeight >= textEl.scrollHeight - 50;
  hudEl.style.opacity = nearBottom ? "0" : "1";
  hudEl.style.pointerEvents = nearBottom ? "none" : "auto";
});

// NEU: Listener für Rahmendaten
if (rahmendatenEl) {
  rahmendatenEl.addEventListener("input", () => updateRahmendatenCount());
}

chaptersEl.addEventListener("input", () => {
  updateUI();
  saveNow();
});
currentEl.addEventListener("input", () => {
  updateUI();
  saveNow();
});
prevChapterBtn.addEventListener("click", () => stepChapter(-1));
nextChapterBtn.addEventListener("click", () => stepChapter(+1));

minTotalEl.addEventListener("input", () => {
  const v = parseInt(minTotalEl.value, 10);
  if (Number.isFinite(v)) state.minTotal = Math.max(0, v);
  updateUI();
  saveNow();
});
maxTotalEl.addEventListener("input", () => {
  const v = parseInt(maxTotalEl.value, 10);
  if (Number.isFinite(v)) state.maxTotal = Math.max(0, v);
  updateUI();
  saveNow();
});
minTotalEl.addEventListener("blur", () => {
  const v = parseInt(minTotalEl.value, 10);
  if (!Number.isFinite(v)) minTotalEl.value = state.minTotal;
});
maxTotalEl.addEventListener("blur", () => {
  const v = parseInt(maxTotalEl.value, 10);
  if (!Number.isFinite(v)) maxTotalEl.value = state.maxTotal;
});

autosaveToggleEl.addEventListener("change", () => {
  scheduleAutosave();
  saveNow();
});
intervalEl.addEventListener("input", () => {
  scheduleAutosave();
  saveNow();
});

saveBtn.addEventListener("click", () => saveNow());
exportBtn.addEventListener("click", exportTxt);
importBtn.addEventListener("click", () => importFileEl.click());
importFileEl.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  textEl.value = text;
  updateUI();
  saveNow("Import");
  importFileEl.value = "";
});
clearBtn.addEventListener("click", clearAll);

function setHudVisible(v) {
  state.hudVisible = !!v;
  hudEl.style.display = state.hudVisible ? "block" : "none";
  toggleHudBtn.textContent = state.hudVisible
    ? "HUD ausblenden"
    : "HUD einblenden";
  toggleHudBtn.setAttribute(
    "aria-expanded",
    state.hudVisible ? "true" : "false"
  );
  if (state.hudVisible) autoPlaceHUD();
}
toggleHudBtn.addEventListener("click", () => setHudVisible(!state.hudVisible));
hudHideBtn.addEventListener("click", () => setHudVisible(false));
// document.addEventListener("keydown", (e) => {
//   if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey && !e.altKey) {
//     e.preventDefault(); setHudVisible(!state.hudVisible);
//   }
// });

function setCompact(v) {
  state.compact = !!v;
  hudEl.classList.toggle("compact", state.compact);
  hudCompactBtn.classList.toggle("toggled", state.compact);
  toggleCompactBtn.classList.toggle("toggled", state.compact);
  updateUI();
  saveNow();
}
hudCompactBtn.addEventListener("click", () => setCompact(!state.compact));
toggleCompactBtn.addEventListener("click", () => setCompact(!state.compact));

function handleResizeReposition() {
  if (!tourEl.classList.contains("active")) return;
  const step = TOUR_STEPS[tourIndex];
  const target = document.querySelector(step.sel);
  if (target) positionSpotAndBox(target);
}
window.addEventListener("resize", () => {
  autoPlaceHUD();
  handleResizeReposition();
});
window.addEventListener("scroll", handleResizeReposition);

tourPrev.addEventListener("click", () => goTour(tourIndex - 1));
tourNext.addEventListener("click", () => {
  if (tourIndex >= TOUR_STEPS.length - 1) endTour(true);
  else goTour(tourIndex + 1);
});
tourSkip.addEventListener("click", () => endTour(true));
el("startTour").addEventListener("click", () => startTour(false));
hudHelpBtn.addEventListener("click", () => startTour(false));

lsExportBtn.addEventListener("click", () => {
  const data = localStorage.getItem(LS_KEY) || "{}";
  const blob = new Blob([data], {
    type: "application/json;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "zeichenzaehler_localstorage_backup.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
});
lsImportBtn.addEventListener("click", () => {
  if (
    !confirm(
      "Achtung: Der aktuelle LocalStorage-Eintrag wird überschrieben. Fortfahren?"
    )
  )
    return;
  lsImportFile.click();
});
lsImportFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.chapters || parsed.text !== undefined)
    ) {
      localStorage.setItem(LS_KEY, JSON.stringify(parsed));
    } else {
      localStorage.setItem(LS_KEY, text);
    }
    loadFromStorage();
    alert(
      "Import erfolgreich. Der vorherige LocalStorage-Eintrag wurde überschrieben."
    );
  } catch {
    alert("Fehler beim Import.");
  } finally {
    lsImportFile.value = "";
  }
});

if (window.visualViewport) {
  visualViewport.addEventListener("resize", autoPlaceHUD);
  visualViewport.addEventListener("scroll", autoPlaceHUD);
}

// NEU: Funktion zum Zählen der Rahmendaten
function updateRahmendatenCount(silent = false) {
  const val = rahmendatenEl?.value || "";
  state.rahmendatenCount = countWithoutNewlines(val);
  if (rahmendatenCountEl) {
    rahmendatenCountEl.textContent =
      state.rahmendatenCount.toLocaleString("de-DE");
  }
  updateUI();
  if (!silent) saveNow();
}

loadFromStorage();
setHudVisible(true);
autoPlaceHUD();
if (!localStorage.getItem(TOUR_FLAG)) {
  startTour(true);
}
window.addEventListener("beforeunload", () => saveNow("Auto (beim Schließen)"));
