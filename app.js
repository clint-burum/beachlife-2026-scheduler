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

  // Inline SVG glyphs for music service links. 14x14 viewBox, currentColor fill
  // so they pick up parent text color (works in selected/headliner/normal states).
  // Apple Music: stylized "music" mark. Spotify: three concentric arcs.
  const ICON_APPLE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M22.5 7.2c0-1.4-.1-2.6-.4-3.5-.5-1.6-1.7-2.7-3.3-3.1-.9-.2-1.8-.3-2.7-.3-1.7-.1-3.4-.1-5.1-.1-1.7 0-3.4 0-5.1.1-.9 0-1.8.1-2.7.3-1.6.4-2.8 1.5-3.3 3.1-.3.9-.4 2.1-.4 3.5v9.6c0 1.4.1 2.6.4 3.5.5 1.6 1.7 2.7 3.3 3.1.9.2 1.8.3 2.7.3 1.7.1 3.4.1 5.1.1 1.7 0 3.4 0 5.1-.1.9 0 1.8-.1 2.7-.3 1.6-.4 2.8-1.5 3.3-3.1.3-.9.4-2.1.4-3.5V7.2zm-5.7 1.5v7.4c0 1.5-1.2 2.7-2.7 2.7-1.4 0-2.6-1.1-2.7-2.5 0-1.5 1.2-2.7 2.7-2.7.4 0 .8.1 1.1.2V8.7L9.2 10v8.5c0 1.5-1.2 2.7-2.7 2.7-1.4 0-2.6-1.1-2.7-2.5 0-1.5 1.2-2.7 2.7-2.7.4 0 .8.1 1.1.2V7.5c0-.4.3-.7.6-.8l8-1.7c.5-.1.9.3.9.7v3z"/></svg>';
  const ICON_SPOTIFY = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.7 0 12 0zm5.5 17.3c-.2.4-.7.5-1 .3-2.8-1.7-6.4-2.1-10.6-1.1-.4.1-.8-.2-.9-.6-.1-.4.2-.8.6-.9 4.6-1 8.6-.6 11.7 1.3.3.2.4.7.2 1zm1.5-3.3c-.3.4-.8.6-1.3.3-3.2-2-8.1-2.6-11.9-1.4-.5.1-1-.1-1.2-.6-.1-.5.1-1 .6-1.2 4.4-1.3 9.8-.7 13.5 1.6.5.3.6.9.3 1.3zm.1-3.4C15.2 8.4 8.7 8.2 5 9.3c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.3-1.3 11.5-1 16 1.6.5.3.7 1 .4 1.5-.3.5-1 .7-1.6.4z"/></svg>';

  // ---- Utilities ---------------------------------------------
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Strip parenthetical context and generic backing-band suffixes so music
  // service search lands on the right artist:
  //   "Mike Watt (Minutemen, The Stooges)"  -> "Mike Watt"
  //   "James Taylor and His All-Star Band"  -> "James Taylor"
  //   "Joan Jett and the Blackhearts"       -> kept as-is (the band IS the act)
  //   "Jen Pop (The Bombpops)"              -> "Jen Pop"
  function cleanArtistForSearch(name) {
    let out = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    out = out.replace(/\s+and\s+His\s+All-Star\s+Band$/i, '');
    return out.replace(/\s+/g, ' ').trim();
  }

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
        const searchQuery = cleanArtistForSearch(set.artist);
        const searchEnc = encodeURIComponent(searchQuery);
        const artistEsc = escapeHTML(set.artist);

        // Use a <div role="button"> rather than <button> so we can legally
        // nest <a> tags inside (HTML disallows interactive descendants of
        // <button>; iOS Safari refuses to handle those nested taps reliably).
        const card = document.createElement('div');
        card.className = [
          'artist-card',
          isSelected ? 'is-selected' : '',
          isHeadliner ? 'is-headliner' : '',
          wouldConflict ? 'is-conflict-warn' : ''
        ].filter(Boolean).join(' ');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-pressed', isSelected);
        card.dataset.key = k;

        card.innerHTML = `
          <span class="artist-time">${formatTimeRange(set.start, set.end)}</span>
          <span class="artist-name">${artistEsc}${isHeadliner ? '<span class="headliner-tag">Headliner</span>' : ''}</span>
          <span class="artist-links" aria-label="Preview ${artistEsc}">
            <a class="music-link music-link-apple"
               href="https://music.apple.com/us/search?term=${searchEnc}"
               target="_blank" rel="noopener"
               aria-label="Preview ${artistEsc} on Apple Music"
               title="Apple Music">${ICON_APPLE}</a>
            <a class="music-link music-link-spotify"
               href="https://open.spotify.com/search/${searchEnc}"
               target="_blank" rel="noopener"
               aria-label="Preview ${artistEsc} on Spotify"
               title="Spotify">${ICON_SPOTIFY}</a>
          </span>
          <span class="artist-check" aria-hidden="true">✓</span>
        `;

        // Card click toggles selection — but ignore clicks that landed
        // on a music link (or its inner SVG/path). closest() walks up
        // from the actual click target.
        card.addEventListener('click', (e) => {
          if (e.target.closest('.music-link')) return;
          toggleSelection(set);
        });
        // Keyboard: Enter/Space toggles, but only when focus is on the card itself.
        card.addEventListener('keydown', (e) => {
          if (e.target !== card) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSelection(set);
          }
        });
        list.appendChild(card);
      }

      group.appendChild(list);
      container.appendChild(group);
    }

    // Official set times poster reference
    const ref = document.createElement('details');
    ref.className = 'poster-ref';
    const dayName = activeDay === 'fri' ? 'Friday' : activeDay === 'sat' ? 'Saturday' : 'Sunday';
    ref.innerHTML = `
      <summary>
        <span class="poster-ref-label">Official poster — ${dayName}</span>
        <span class="poster-ref-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div class="poster-ref-body">
        <img
          src="assets/setlist-${activeDay}.jpg"
          alt="Official BeachLife 2026 ${dayName} set times poster"
          loading="lazy"
          decoding="async"
        />
        <p class="poster-ref-source">
          Source: <a href="https://www.beachlifefestival.com/set-times" target="_blank" rel="noopener">beachlifefestival.com/set-times</a>
        </p>
      </div>
    `;
    container.appendChild(ref);
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
