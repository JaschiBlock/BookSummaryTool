// Helferfunktionen
const $    = selector => document.querySelector(selector);
const $$   = selector => Array.from(document.querySelectorAll(selector));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const countWithoutNewlines = str => (str || '').replace(/\r?\n/g, '').length;
const formatDT = d => d.toLocaleString(undefined, {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});
const rectsOverlap = (a, b, pad = 0) =>
  !(a.right < b.left + pad || a.left > b.right - pad ||
    a.bottom < b.top + pad   || a.top > b.bottom - pad
  );

// State
const LS_KEY = 'buchKapitelCounter_v6';
const TOUR_FLAG = LS_KEY + '_tourDone';
const DEFAULTS = { minTotal: 1100, maxTotal: 1500 };

const state = {
  chapters: 30,
  current: 1,
  minTotal: DEFAULTS.minTotal,
  maxTotal: DEFAULTS.maxTotal,
  rahmenCount: 0,
  autosave: 'on',
  interval: 5,
  compact: false,
  lastSavedTs: null,
  hudVisible: true
};

// Elemente
const textEl             = $('#text');
const chaptersEl         = $('#chapters');
const currentEl          = $('#currentChapter');
const prevChapterBtn     = $('#prevChapter');
const nextChapterBtn     = $('#nextChapter');
const chaptersTotalDisp  = $('#chaptersTotalDisplay');
const minTotalEl         = $('#minTotal');
const maxTotalEl         = $('#maxTotal');
const rahmendatenEl      = $('#rahmendaten');
const rahmendatenCountEl = $('#rahmendatenCount');
const autosaveToggleEl   = $('#autosaveToggle');
const intervalEl         = $('#interval');
const saveInfoEl         = $('#saveInfo');
const saveBtn            = $('#save');
const exportBtn          = $('#export');
const importBtn          = $('#importBtn');
const importFileEl       = $('#importFile');
const clearBtn           = $('#clear');
const lsExportBtn        = $('#lsExport');
const lsImportBtn        = $('#lsImportBtn');
const lsImportFile       = $('#lsImportFile');
const toggleCompactBtn   = $('#toggleCompact');
const toggleHudBtn       = $('#toggleHud');
const hudEl              = $('#hud');
const hudContentEl       = $('#hudContent');
const hudCompactBtn      = $('#hudCompactBtn');
const hudHideBtn         = $('#hudHideBtn');
const hudHelpBtn         = $('#hudHelpBtn');
const tourEl             = $('#tour');
const tourSpot           = $('#tourSpot');
const tourBox            = $('#tourBox');
const tourText           = $('#tourText');
const tourPrev           = $('#tourPrev');
const tourNext           = $('#tourNext');
const tourSkip           = $('#tourSkip');
const tourProgress       = $('#tourProgress');

// Berechnung effektives Kapitelbudget
function getEffectiveTotals() {
  const baseMin = Math.min(state.minTotal, state.maxTotal);
  const baseMax = Math.max(state.minTotal, state.maxTotal);
  const effMin  = Math.max(0, baseMin  - state.rahmenCount);
  const effMax  = Math.max(0, baseMax  - state.rahmenCount);
  return { effMin, effMax };
}

function renderHUDContent() {
  const chapters = clamp(+chaptersEl.value || 1, 1, 1e6);
  const current  = clamp(+currentEl.value  || 1, 1, chapters);
  
  const rahmenCount = countWithoutNewlines(rahmendatenEl.value);
  const textCount   = countWithoutNewlines(textEl.value);
  const totalCount  = rahmenCount + textCount;

  const baseMin = Math.min(state.minTotal, state.maxTotal);
  const baseMax = Math.max(state.minTotal, state.maxTotal);
  const minAllowed = Math.floor((current / chapters) * baseMin);
  const maxAllowed = Math.floor((current / chapters) * baseMax);

  let deltaTxt, deltaClass;
  if (totalCount > maxAllowed) {
    deltaTxt   = `Über Maximum: +${(totalCount - maxAllowed).toLocaleString('de-DE')} Zeichen`;
    deltaClass = 'delta-bad';
  } else if (totalCount < minAllowed) {
    deltaTxt   = `Unter Minimum: noch ${(minAllowed - totalCount).toLocaleString('de-DE')} Zeichen`;
    deltaClass = 'delta-warn';
  } else {
    deltaTxt   = `Verbleibend bis Maximum: ${(maxAllowed - totalCount).toLocaleString('de-DE')} Zeichen`;
    deltaClass = 'delta-ok';
  }

  const pctNow     = maxAllowed > 0 ? Math.min(totalCount / maxAllowed, 1) * 100 : 0;
  const bandStart  = maxAllowed > 0 ? (minAllowed / maxAllowed) * 100 : 0;
  const bandWidth  = maxAllowed > 0 ? 100 - bandStart : 0;

  const tipCount   = 'Leerzeichen & Tabulatoren zählen. Enter nicht.';
  const tipMini    = 'Balken = Fortschritt gegen Max. Grün-Gelb-Band = OK-Bereich.';

  if (state.compact) {
    hudContentEl.innerHTML = `
      <div class="line">
        <span class="label">Istzeichen vs. Sollbereich <span class="tip" data-tip="${tipCount}"></span></span>
        <span class="val">${totalCount.toLocaleString('de-DE')} / (${minAllowed.toLocaleString('de-DE')}–${maxAllowed.toLocaleString('de-DE')})</span>
      </div>
      <div class="mini" title="${tipMini}">
        <div class="band" style="left:${bandStart}%; width:${bandWidth}%"></div>
        <div class="b ${totalCount>maxAllowed?'over':''}" style="width:${pctNow}%"></div>
      </div>
      <div class="line">
        <span class="label">Sollzeichen</span>
        <span class="${deltaClass}">${deltaTxt}</span>
      </div>
    `;
    } else {
    hudContentEl.innerHTML = `
      <div class="line">
        <span class="label">Istzeichen vs. Sollbereich <span class="tip" data-tip="${tipCount}"></span></span>
        <span class="val">${totalCount.toLocaleString('de-DE')} / (${minAllowed.toLocaleString('de-DE')}–${maxAllowed.toLocaleString('de-DE')})</span>
      </div>
      <div class="line chapline">
        <span class="label">Kapitel</span>
        <span class="ctrl">
          <button id="hudPrev" class="mini-btn">‹</button>
          <span class="val">${current} / ${chapters}</span>
          <button id="hudNext" class="mini-btn">›</button>
        </span>
      </div>
      <div class="mini" title="${tipMini}">
        <div class="band" style="left:${bandStart}%; width:${bandWidth}%"></div>
        <div class="b ${totalCount>maxAllowed?'over':''}" style="width:${pctNow}%"></div>
      </div>
      <div class="line">
        <span class="label">Delta</span>
        <span class="${deltaClass}">${deltaTxt}</span>
      </div>
      <div class="line" id="enterCounterRow">
        <span class="label">Enter‑Zähler im Feld Buch-Text</span>
        <span class="val" id="enterCount">${
          (textEl.value.match(/\n/g) || []).length
        }</span>
      </div>
    `;
  }


  $('#hudPrev')?.addEventListener('click', () => stepChapter(-1));
  $('#hudNext')?.addEventListener('click', () => stepChapter(+1));

  hudEl.querySelectorAll('.tip').forEach(t => {
    t.addEventListener('click', e => {
      e.stopPropagation();
      const expanded = t.getAttribute('aria-expanded') === 'true';
      hudEl.querySelectorAll('.tip[aria-expanded]').forEach(o => o.removeAttribute('aria-expanded'));
      expanded ? t.removeAttribute('aria-expanded') : t.setAttribute('aria-expanded', 'true');
    });
  });
}


// UI-Update
function updateUI() {
  state.chapters = clamp(+chaptersEl.value || 1, 1, 1e6);
  chaptersEl.value = state.chapters;
  chaptersTotalDisp.textContent = state.chapters;

  state.current = clamp(+currentEl.value || 1, 1, state.chapters);
  currentEl.value = state.current;

  prevChapterBtn.disabled = state.current <= 1;
  nextChapterBtn.disabled = state.current >= state.chapters;

  renderHUDContent();
  autoPlaceHUD();
}

// Speicher-Interface
function saveNow(note = '') {
  const payload = {
    chapters: state.chapters,
    current:  state.current,
    minTotal: state.minTotal,
    maxTotal: state.maxTotal,
    autosave: state.autosave,
    interval: state.interval,
    compact:  state.compact,
    rahmendaten: rahmendatenEl.value || '',
    text: textEl.value || '',
    ts: Date.now()
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    state.lastSavedTs = payload.ts;
    saveInfoEl.textContent = `Gespeichert: ${formatDT(new Date(payload.ts))}${note?' • '+note:''}`;
  } catch {
    saveInfoEl.textContent = 'Konnte nicht speichern.';
  }
  updateUI();
}

function scheduleAutosave() {
  clearInterval(state._autosaveTimer);
  if (state.autosave === 'on') {
    state._autosaveTimer = setInterval(() => saveNow('Autosave'), state.interval * 1000);
  }
}

function loadFromStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (d.chapters) chaptersEl.value = d.chapters;
    if (d.current)  currentEl.value = d.current;
    if (Number.isFinite(d.minTotal)) { state.minTotal = d.minTotal; minTotalEl.value = d.minTotal; }
    if (Number.isFinite(d.maxTotal)) { state.maxTotal = d.maxTotal; maxTotalEl.value = d.maxTotal; }
    if (d.rahmendaten) {
      rahmendatenEl.value = d.rahmendaten;
      state.rahmenCount = countWithoutNewlines(d.rahmendaten);
      rahmendatenCountEl.textContent = state.rahmenCount;
    }
    if (d.autosave) autosaveToggleEl.value = state.autosave = d.autosave;
    if (d.interval)  intervalEl.value = state.interval = d.interval;
    if (d.compact)   state.compact = d.compact;
    if (d.ts) {
      state.lastSavedTs = d.ts;
      saveInfoEl.textContent = `Zuletzt gespeichert: ${formatDT(new Date(d.ts))}`;
    }
  } catch {
    console.warn('Fehler beim Laden der Daten, reset auf Defaults');
  }
  hudEl.classList.toggle('compact', state.compact);
  updateUI();
  scheduleAutosave();
}

// Export .txt
function exportTxt() {
  const content = textEl.value;
  const count   = countWithoutNewlines(content);
  const name    = `buch_${count}_zeichen_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`;
  const blob    = new Blob([content], { type: 'text/plain' });
  const a       = document.createElement('a');
  a.href        = URL.createObjectURL(blob);
  a.download    = name;
  document.body.append(a);
  a.click();
  a.remove();
}

// Alles löschen
function clearAll() {
  if (!confirm('Wirklich alles löschen?')) return;
  localStorage.removeItem(LS_KEY);
  Object.assign(state, {
    chapters: 30,
    current: 1,
    minTotal: DEFAULTS.minTotal,
    maxTotal: DEFAULTS.maxTotal,
    rahmenCount: 0,
    autosave: 'on',
    interval: 5,
    compact: false
  });
  rahmendatenEl.value = '';
  textEl.value        = '';
  rahmendatenCountEl.textContent = '0';
  saveInfoEl.textContent         = '';
  hudEl.classList.remove('compact');
  updateUI();
  scheduleAutosave();
}

// Kapitel wechseln
function stepChapter(delta) {
  state.current = clamp(state.current + delta, 1, state.chapters);
  currentEl.value = state.current;
  saveNow();
}

// HUD Positionierung
function candidateRects(w, h) {
  const padRight = 16;
  const topOffset = (window.visualViewport?.offsetTop || 0) + 12;
  const bottomOffset = (window.innerHeight - ((window.visualViewport?.height||window.innerHeight) + (window.visualViewport?.offsetTop||0))) + 16;
  return {
    topRect:    { left: window.innerWidth - padRight - w, top: topOffset,                right: window.innerWidth - padRight, bottom: topOffset + h },
    bottomRect: { left: window.innerWidth - padRight - w, top: window.innerHeight - bottomOffset - h, right: window.innerWidth - padRight, bottom: window.innerHeight - bottomOffset }
  };
}

function autoPlaceHUD() {
  if (!state.hudVisible) return;
  const w = hudEl.offsetWidth, h = hudEl.offsetHeight;
  const { topRect, bottomRect } = candidateRects(w, h);
  const txtRect = textEl.getBoundingClientRect();
  const bottomOverlap = rectsOverlap(bottomRect, txtRect, 8);
  const topOverlap    = rectsOverlap(topRect, txtRect, 8);

  if (bottomOverlap && !topOverlap) {
    hudEl.style.top    = `${topRect.top}px`;
    hudEl.style.bottom = 'auto';
  } else {
    hudEl.style.bottom = `${window.innerHeight - bottomRect.bottom}px`;
    hudEl.style.top    = 'auto';
  }

  const kbLikely = window.visualViewport
    ? (window.visualViewport.height < window.innerHeight * 0.7)
    : (window.innerHeight < 500);

  if (kbLikely && rectsOverlap(hudEl.getBoundingClientRect(), txtRect, 0)) {
    hudEl.style.opacity = '0';
    hudEl.style.pointerEvents = 'none';
  } else {
    hudEl.style.opacity = '1';
    hudEl.style.pointerEvents = 'auto';
  }
}

// Geführte Tour
const TOUR_STEPS = [
  { sel: '#chapters',   text: 'Stelle hier die Anzahl deiner Kapitel ein.' },
  { sel: '#chapterControls', text: 'Wechsle das Kapitel mit den Pfeilen…' },
  { sel: '#minTotal',   text: 'Setze dein Gesamt-Minimum an Zeichen.' },
  { sel: '#maxTotal',   text: 'Und hier dein Gesamt-Maximum.' },
  { sel: '#hud',        text: 'Im HUD siehst du live Ist/Soll…' },
  { sel: '#lsExport',   text: 'Sichere deinen Stand als JSON-Backup.' },
  { sel: '#lsImportBtn',text: 'Lade ein Backup (überschreibt!).' }
];
let tourIndex = 0;

function positionSpotAndBox(target) {
  const pad = 8;
  const r   = target.getBoundingClientRect();
  tourSpot.style.cssText = `
    left:${r.left - pad + window.scrollX}px;
    top:${r.top - pad + window.scrollY}px;
    width:${r.width + pad*2}px;
    height:${r.height + pad*2}px;
  `;

  // Box position
  const belowY = r.bottom + 12 + window.scrollY;
  const aboveY = r.top - 12 - tourBox.offsetHeight + window.scrollY;
  const maxX   = window.scrollX + window.innerWidth - tourBox.offsetWidth - 12;
  let boxTop   = belowY;
  let boxLeft  = Math.min(Math.max(window.scrollX + 12, r.left + window.scrollX), maxX);

  if (belowY + tourBox.offsetHeight > window.innerHeight) {
    if (aboveY > 0) boxTop = aboveY;
    else            boxTop = Math.max(window.scrollY+12, r.top + window.scrollY);
  }

  tourBox.style.top  = `${boxTop}px`;
  tourBox.style.left = `${boxLeft}px`;
}

function goTour(i) {
  tourIndex = clamp(i, 0, TOUR_STEPS.length - 1);
  const step = TOUR_STEPS[tourIndex];
  const tgt  = document.querySelector(step.sel);
  if (!tgt) return endTour();
  tgt.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => {
    tourText.textContent    = step.text;
    tourProgress.textContent= `Schritt ${tourIndex+1} / ${TOUR_STEPS.length}`;
    positionSpotAndBox(tgt);
    tourPrev.disabled       = tourIndex===0;
    tourNext.textContent    = tourIndex===TOUR_STEPS.length-1 ? 'Fertig' : 'Weiter';
  }, 200);
}

function startTour(auto=false) {
  if (!state.hudVisible) setHudVisible(true);
  tourEl.classList.add('active');
  if (auto) localStorage.setItem(TOUR_FLAG, 'in_progress');
  goTour(0);
}

function endTour(mark=true) {
  tourEl.classList.remove('active');
  if (mark) localStorage.setItem(TOUR_FLAG, '1');
}

// HUD Sichtbarkeit & Kompakt
function setHudVisible(v) {
  state.hudVisible = !!v;
  hudEl.style.display         = state.hudVisible ? 'block' : 'none';
  toggleHudBtn.textContent    = state.hudVisible ? 'HUD ausblenden' : 'HUD einblenden';
  toggleHudBtn.setAttribute('aria-expanded', state.hudVisible);
  if (state.hudVisible) autoPlaceHUD();
}

function setCompact(v) {
  state.compact = !!v;
  hudEl.classList.toggle('compact', state.compact);
  hudCompactBtn.classList.toggle('toggled', state.compact);
  toggleCompactBtn.classList.toggle('toggled', state.compact);
  updateUI();
  saveNow();
}

// Event-Listener
textEl.addEventListener('input', updateUI);
textEl.addEventListener('scroll', () => {
  const nearBottom = textEl.scrollTop + textEl.clientHeight >= textEl.scrollHeight - 50;
  hudEl.style.opacity       = nearBottom ? '0' : '1';
  hudEl.style.pointerEvents = nearBottom ? 'none' : 'auto';
});

rahmendatenEl.addEventListener('input', () => {
  state.rahmenCount = countWithoutNewlines(rahmendatenEl.value);
  rahmendatenCountEl.textContent = state.rahmenCount;
  updateUI();
  saveNow();
});

chaptersEl.addEventListener('input', () => { updateUI(); saveNow(); });
currentEl.addEventListener('input', () => { updateUI(); saveNow(); });
prevChapterBtn.addEventListener('click', () => stepChapter(-1));
nextChapterBtn.addEventListener('click', () => stepChapter(+1));

minTotalEl.addEventListener('input', () => {
  state.minTotal = clamp(+minTotalEl.value, 0, Infinity);
  updateUI(); saveNow();
});
maxTotalEl.addEventListener('input', () => {
  state.maxTotal = clamp(+maxTotalEl.value, 0, Infinity);
  updateUI(); saveNow();
});

autosaveToggleEl.addEventListener('change', () => {
  state.autosave = autosaveToggleEl.value;
  scheduleAutosave(); saveNow();
});
intervalEl.addEventListener('input', () => {
  state.interval = clamp(+intervalEl.value, 2, Infinity);
  scheduleAutosave(); saveNow();
});

saveBtn.addEventListener('click', () => saveNow());
exportBtn.addEventListener('click', exportTxt);
importBtn.addEventListener('click', () => importFileEl.click());
importFileEl.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  textEl.value = await file.text();
  updateUI(); saveNow('Import');
  importFileEl.value = '';
});

clearBtn.addEventListener('click', clearAll);

toggleHudBtn.addEventListener('click', () => setHudVisible(!state.hudVisible));
hudHideBtn.addEventListener('click', () => setHudVisible(false));
hudCompactBtn.addEventListener('click', () => setCompact(!state.compact));
toggleCompactBtn.addEventListener('click', () => setCompact(!state.compact));
hudHelpBtn.addEventListener('click', () => startTour());

tourPrev.addEventListener('click', () => goTour(tourIndex - 1));
tourNext.addEventListener('click', () => {
  if (tourIndex >= TOUR_STEPS.length - 1) endTour(true);
  else goTour(tourIndex + 1);
});
tourSkip.addEventListener('click', () => endTour(true));
$('#startTour').addEventListener('click', () => startTour());

lsExportBtn.addEventListener('click', () => {
  const data = localStorage.getItem(LS_KEY) || '{}';
  const blob = new Blob([data], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'zeichenzaehler_localstorage_backup.json';
  document.body.append(a);
  a.click(); a.remove();
});

lsImportBtn.addEventListener('click', () => {
  if (!confirm('Achtung: Überschreibt aktuellen Stand. Fortfahren?')) return;
  lsImportFile.click();
});
lsImportFile.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const txt = await file.text();
    const obj = JSON.parse(txt);
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
    loadFromStorage();
    alert('Import erfolgreich.');
  } catch {
    alert('Fehler beim Import.');
  } finally {
    lsImportFile.value = '';
  }
});

window.addEventListener('resize', () => { autoPlaceHUD(); if (tourEl.classList.contains('active')) goTour(tourIndex); });
window.addEventListener('scroll', () => { if (tourEl.classList.contains('active')) goTour(tourIndex); });
window.addEventListener('beforeunload', () => saveNow('Auto (beim Schließen)'));

// Initialisierung
loadFromStorage();
setHudVisible(true);
autoPlaceHUD();
if (!localStorage.getItem(TOUR_FLAG)) startTour(true);
