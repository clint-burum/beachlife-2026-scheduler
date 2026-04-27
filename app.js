/* ----------------------------------------------------------
   My BeachLife 2026 — Schedule Builder
   Vanilla JS. Tap-to-toggle interaction (mobile-friendly).
   State persists in URL hash so URLs are inherently shareable.
---------------------------------------------------------- */

(function () {
  'use strict';

  // ---- State -------------------------------------------------
  const STAGES = ['HighTide', 'LowTide', 'SpeakEasy', 'RipTide'];
  const DAY_LABELS = { fri: 'Friday May 1', sat: 'Saturday May 2', sun: 'Sunday May 3' };
  const STAGE_SPONSORS = {
    HighTide: 'Fiji Airways',
    LowTide: 'Cove Soda',
    SpeakEasy: 'STōK Cold Brew',
    RipTide: 'LA Chargers'
  };

  let lineup = null;
  let activeDay = 'fri';
  // selected: Map<artistKey, true>
  // artistKey = `${day}::${stage}::${artist}`
  const selected = new Map();

  // ---- Utilities ---------------------------------------------
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'pm' : 'am';
    const h12 = ((h + 11) % 12) + 1;
    return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
  }

  function formatTimeRange(start, end) {
    return `${formatTime(start)}–${formatTime(end)}`;
  }

  function keyFor(set) {
    return `${set.day}::${set.stage}::${set.artist}`;
  }

  // Make a URL-safe short slug from artist name
  function slugify(s) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24);
  }

  // ---- URL hash serialization --------------------------------
  // Hash format: #fri=jeremy,grouplove&sat=offspring,switchfoot&sun=jamestaylor
  // We use slugified artist names so URLs stay readable

  function buildSlugIndex() {
    // Map slug -> set object (per day) so we can decode share URLs
    const idx = { fri: {}, sat: {}, sun: {} };
    for (const s of lineup.sets) {
      idx[s.day][slugify(s.artist)] = s;
    }
    return idx;
  }

  function serializeToHash() {
    const byDay = { fri: [], sat: [], sun: [] };
    for (const k of selected.keys()) {
      const [day, , artist] = k.split('::');
      byDay[day].push(slugify(artist));
    }
    const parts = [];
    for (const d of ['fri', 'sat', 'sun']) {
      if (byDay[d].length) parts.push(`${d}=${byDay[d].join(',')}`);
    }
    return parts.length ? '#' + parts.join('&') : '';
  }

  function loadFromHash() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return;
    const idx = buildSlugIndex();
    const params = h.split('&');
    for (const p of params) {
      const [day, list] = p.split('=');
      if (!list || !idx[day]) continue;
      for (const slug of list.split(',')) {
        const set = idx[day][slug];
        if (set) selected.set(keyFor(set), true);
      }
    }
  }

  function syncHashToURL() {
    const newHash = serializeToHash();
    const newURL = location.pathname + location.search + newHash;
    history.replaceState(null, '', newURL);
  }

  // ---- Conflict detection ------------------------------------
  function findConflicts() {
    // Returns Set of artistKeys that overlap with at least one other selected set
    const conflicting = new Set();
    const sel = lineup.sets.filter((s) => selected.has(keyFor(s)));
    for (let i = 0; i < sel.length; i++) {
      for (let j = i + 1; j < sel.length; j++) {
        const a = sel[i];
        const b = sel[j];
        if (a.day !== b.day) continue;
        if (a.stage === b.stage) continue;
        const aS = timeToMinutes(a.start);
        const aE = timeToMinutes(a.end);
        const bS = timeToMinutes(b.start);
        const bE = timeToMinutes(b.end);
        if (aS < bE && bS < aE) {
          conflicting.add(keyFor(a));
          conflicting.add(keyFor(b));
        }
      }
    }
    return conflicting;
  }

  // ---- Rendering ---------------------------------------------
  function renderLineup() {
    const container = $('#lineup-container');
    container.innerHTML = '';

    const conflicts = findConflicts();
    const dayActs = lineup.sets.filter((s) => s.day === activeDay);

    for (const stage of STAGES) {
      const stageActs = dayActs
        .filter((s) => s.stage === stage)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      if (!stageActs.length) continue;

      const group = document.createElement('div');
      group.className = 'stage-group';

      const header = document.createElement('div');
      header.className = 'stage-header';
      header.innerHTML = `
        <span class="stage-dot" data-stage="${stage}" aria-hidden="true"></span>
        <span class="stage-name">${stage}</span>
        <span class="stage-sponsor">${STAGE_SPONSORS[stage]}</span>
      `;
      group.appendChild(header);

      const list = document.createElement('div');
      list.className = 'set-list';

      for (const set of stageActs) {
        const k = keyFor(set);
        const isSelected = selected.has(k);
        const isHeadliner = !!set.headliner;
        const wouldConflict = isSelected && conflicts.has(k);

        const card = document.createElement('button');
        card.type = 'button';
        card.className = [
          'artist-card',
          isSelected ? 'is-selected' : '',
          isHeadliner ? 'is-headliner' : '',
          wouldConflict ? 'is-conflict-warn' : ''
        ].filter(Boolean).join(' ');
        card.setAttribute('aria-pressed', isSelected);
        card.dataset.key = k;

        card.innerHTML = `
          <span class="artist-time">${formatTimeRange(set.start, set.end)}</span>
          <span class="artist-name">${escapeHTML(set.artist)}${isHeadliner ? '<span class="headliner-tag">Headliner</span>' : ''}</span>
          <span class="artist-check" aria-hidden="true">✓</span>
        `;

        card.addEventListener('click', () => toggleSelection(set));
        list.appendChild(card);
      }

      group.appendChild(list);
      container.appendChild(group);
    }
  }

  function renderSchedule() {
    const container = $('#schedule-container');
    const sub = $('#schedule-sub');

    const selectedSets = lineup.sets.filter((s) => selected.has(keyFor(s)));
    const conflicts = findConflicts();

    if (selectedSets.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-emoji" aria-hidden="true">🌊</p>
          <p class="empty-text">Your schedule's wide open.<br/>Tap an act on the left to start building your day.</p>
        </div>
      `;
      sub.textContent = 'Nothing picked yet';
      return;
    }

    const dayOrder = ['fri', 'sat', 'sun'];
    selectedSets.sort((a, b) => {
      if (a.day !== b.day) return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    });

    container.innerHTML = '';

    if (conflicts.size > 0) {
      const warn = document.createElement('p');
      warn.className = 'conflict-summary';
      const pairs = Math.floor(conflicts.size / 2);
      warn.textContent = pairs === 1
        ? '1 schedule conflict — two acts overlap'
        : `${conflicts.size} acts have overlap conflicts`;
      container.appendChild(warn);
    }

    let lastDay = null;
    const list = document.createElement('div');
    list.className = 'schedule-list';

    for (const set of selectedSets) {
      if (set.day !== lastDay) {
        const sep = document.createElement('p');
        sep.className = 'schedule-day-sep';
        sep.textContent = DAY_LABELS[set.day];
        list.appendChild(sep);
        lastDay = set.day;
      }

      const k = keyFor(set);
      const item = document.createElement('div');
      item.className = 'schedule-item' + (conflicts.has(k) ? ' is-conflict' : '');
      item.innerHTML = `
        <span class="stage-stripe" data-stage="${set.stage}" aria-hidden="true"></span>
        <span class="schedule-time">${formatTimeRange(set.start, set.end)}</span>
        <div class="schedule-meta">
          <p class="schedule-name">${escapeHTML(set.artist)}</p>
          <p class="schedule-stage">${set.stage}</p>
        </div>
        <button class="remove-btn" type="button" aria-label="Remove ${escapeHTML(set.artist)} from schedule" data-key="${k}">×</button>
      `;
      item.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSelection(set);
      });
      list.appendChild(item);
    }

    container.appendChild(list);

    const total = selectedSets.length;
    sub.textContent = total === 1 ? '1 act picked' : `${total} acts picked`;
  }

  function renderDayCounts() {
    for (const day of ['fri', 'sat', 'sun']) {
      const count = Array.from(selected.keys()).filter((k) => k.startsWith(day + '::')).length;
      const el = $(`[data-day-count="${day}"]`);
      if (el) {
        el.textContent = count;
        el.classList.toggle('has-count', count > 0);
      }
    }
  }

  function renderAll() {
    renderLineup();
    renderSchedule();
    renderDayCounts();
  }

  // ---- Interactions ------------------------------------------
  function toggleSelection(set) {
    const k = keyFor(set);
    if (selected.has(k)) {
      selected.delete(k);
    } else {
      selected.set(k, true);
    }
    syncHashToURL();
    renderAll();
  }

  function setActiveDay(day) {
    activeDay = day;
    for (const tab of $$('.day-tab')) {
      tab.setAttribute('aria-selected', tab.dataset.day === day ? 'true' : 'false');
    }
    renderLineup();
  }

  // ---- Sharing -----------------------------------------------
  async function copyShareURL() {
    const url = location.origin + location.pathname + serializeToHash();
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied — paste it in your group chat');
    } catch (_) {
      // Fallback: legacy execCommand
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Link copied — paste it in your group chat');
      } catch (_) {
        showToast('Copy failed — long-press the URL bar instead');
      }
    }
  }

  function resetSchedule() {
    if (selected.size === 0) return;
    selected.clear();
    syncHashToURL();
    renderAll();
    showToast('Schedule cleared');
  }

  function showToast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.classList.remove('is-visible');
    }, 2400);
  }

  // ---- HTML escape ------------------------------------------
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---- Init --------------------------------------------------
  async function init() {
    try {
      const res = await fetch('lineup.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load lineup.json: ' + res.status);
      lineup = await res.json();
    } catch (err) {
      $('#lineup-container').innerHTML = `<p style="color:#d63a2a;padding:1rem;">Couldn't load the lineup data. (${err.message})</p>`;
      return;
    }

    loadFromHash();

    for (const tab of $$('.day-tab')) {
      tab.addEventListener('click', () => setActiveDay(tab.dataset.day));
    }
    $('#share-btn').addEventListener('click', copyShareURL);
    $('#reset-btn').addEventListener('click', resetSchedule);

    window.addEventListener('hashchange', () => {
      // Reload selections when hash changes externally (e.g., back button)
      selected.clear();
      loadFromHash();
      renderAll();
    });

    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
