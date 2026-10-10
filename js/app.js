/* Pope Placeness — map, list, shared profiles, grouped chooser, manual tour.
   All names, dates and places come from data/popes-v2.json; nothing factual is hard-coded here. */
(function () {
  'use strict';

  var D = null;                     // the dataset
  var byN = {}, byPerson = {}, eraById = {}, apById = {};
  var map = null, markerLayer = null, lineLayer = null, areaLayer = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqMobile = window.matchMedia('(max-width: 820px)');

  var state = {
    view: 'welcome',                // welcome | list | profile | overview | closed
    entry: null,                    // selected roster number
    person: null,                   // selected person id
    group: null,                    // {kind:'shared'|'area', label, members:[personId], key}
    mode: 'all',                    // all | saints | antipopes
    eras: {},                       // era id -> visible
    tour: { active: false, pos: null },
    listScroll: 0,
    query: '',
    returnView: 'list'
  };

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  // ---------- data helpers ----------
  function person(id) { return byPerson[id]; }
  function entry(n) { return byN[n]; }
  function eraOf(p) { return eraById[p.era]; }
  function hasPlace(p) { return p.birthplace && p.birthplace.precision !== 'unknown' && p.birthplace.lat != null; }
  function firstEntry(p) { return p.pontificates[0]; }
  function isSaint(p) { return p.saint && p.saint.status === 'saint'; }
  function isBlessed(p) { return p.saint && p.saint.status === 'blessed'; }

  function dateText(raw) { return raw ? PopeDates.parse(raw).text : ''; }
  function yearsLabel(e) {
    var a = e.start_label || '', b = e.ongoing ? 'present' : (e.end_label || '');
    if (!a) return 'until ' + b;
    return a + '–' + b;
  }
  function placeLabel(p, withCountry) {
    var bp = p.birthplace;
    if (p.research_status === 'pending') return 'Birthplace still being researched';
    if (!bp || bp.precision === 'unknown') return 'Birthplace unknown';
    var s = bp.label;
    if (withCountry !== false && bp.country && bp.country !== bp.label && s.indexOf(bp.country) === -1) s += ', ' + bp.country;
    if (bp.precision === 'region') s = 'Region of ' + s;
    return s;
  }
  function placeShort(p) {
    var bp = p.birthplace;
    if (!bp || bp.precision === 'unknown') return 'Birthplace unknown';
    return (bp.precision === 'region' ? '≈ ' : '') + bp.label;
  }
  function saintBadge(p) {
    if (isSaint(p)) return '<span class="badge" title="' + esc(p.saint.label) + '">Saint</span>';
    if (isBlessed(p)) return '<span class="badge blessed" title="' + esc(p.saint.label) + '">Blessed</span>';
    return '';
  }
  function pinSrc(eraId) { return 'assets/pins/pin-' + eraId + '.png'; }

  // ---------- boot ----------
  fetch('data/popes-v2.json').then(function (r) { return r.json(); }).then(function (data) {
    D = data;
    D.eras.forEach(function (e) { eraById[e.id] = e; state.eras[e.id] = true; });
    D.people.forEach(function (p) { byPerson[p.id] = p; });
    D.pontificates.forEach(function (e) {
      byN[e.n] = e;
      e.start_label = e.begin_raw ? PopeDates.parse(e.begin_raw).dates[0] : '';
      e.end_label = e.end_raw ? PopeDates.parse(e.end_raw).dates.slice(-1)[0] : '';
      var b = PopeDates.parse(e.begin_raw), en = PopeDates.parse(e.end_raw);
      e.dates_label = (b.dates[0] || 'Start unknown') + ' to ' + (e.ongoing ? 'the present' : (en.text || 'unknown'));
      if (!e.begin_raw) e.dates_label = 'Until ' + en.text;
      if (b.dates.length > 1) e.date_note = 'The Vatican list also gives ' + b.dates.slice(1).join(' and ') + ', usually the date of his consecration, coronation or inauguration.';
      if (b.approx || en.approx) e.date_note = (e.date_note ? e.date_note + ' ' : '') + 'Alternatives marked “or” are kept as the Vatican list gives them.';
    });
    (D.antipopes || []).forEach(function (a) { apById[a.id] = a; });
    var t = store('pp.tour'); if (t && byN[t.pos]) state.tour.pos = t.pos;
    buildLegend();
    buildResources();
    initMap();
    buildRail();
    bindUI();
    var fromHash = readHash();
    if (fromHash) selectEntry(fromHash, { source: 'hash' });
    else render();
  }).catch(function (err) {
    console.error(err);
    $('#panel').innerHTML = '<div class="panel-pad"><h2>Something went wrong</h2><p>The pope records could not be loaded. Please reload the page.</p></div>';
  });

  // ---------- map ----------
  function initMap() {
    if (!window.L) { $('#map-fallback').hidden = false; return; }
    map = L.map('map', {
      zoomControl: false, attributionControl: true, minZoom: 2, maxZoom: 9,
      worldCopyJump: false, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 120,
      maxBounds: [[-60, -190], [80, 200]], maxBoundsViscosity: 0.8,
      keyboard: true, inertia: !reduceMotion, fadeAnimation: !reduceMotion, zoomAnimation: !reduceMotion, markerZoomAnimation: !reduceMotion
    });
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution('Art: <a href="https://www.etsy.com/shop/PrintAndPraise" target="_blank" rel="noopener">Print &amp; Praise</a> · Outlines: Natural Earth');
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.createPane('land'); map.getPane('land').style.zIndex = 200;
    map.createPane('areas'); map.getPane('areas').style.zIndex = 350;
    map.createPane('lines'); map.getPane('lines').style.zIndex = 380;
    fitInitial(false);
    fetch('data/basemap-50m.json').then(function (r) { return r.json(); }).then(function (geo) {
      var renderer = L.svg({ pane: 'land', padding: 0.5 });
      L.geoJSON(geo.land, { pane: 'land', renderer: renderer, interactive: false,
        style: { color: '#5E93C2', weight: 1.4, fillColor: '#DCEAF5', fillOpacity: 1, className: 'land', lineJoin: 'round' } }).addTo(map);
      L.geoJSON(geo.borders, { pane: 'land', renderer: renderer, interactive: false,
        style: { color: '#A9C7E4', weight: 0.7, dashArray: '2 3', className: 'land', fill: false } }).addTo(map);
      (D.map_labels || []).forEach(function (l) {
        L.marker([l.lat, l.lon], { interactive: false, keyboard: false, pane: 'land',
          icon: L.divIcon({ className: 'sea-label', html: esc(l.label), iconSize: null }) }).addTo(map);
      });
    }).catch(function () { /* outline is decorative; pins still work */ });
    areaLayer = L.layerGroup().addTo(map);
    lineLayer = L.layerGroup().addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    map.on('zoomend', function () { renderMarkers(); updateLabelClass(); });
    map.on('click', function () { /* clicking empty map keeps the selection */ });
    window.addEventListener('resize', debounce(function () { map.invalidateSize(); renderMarkers(); }, 150));
  }

  function updateLabelClass() {
    if (!map) return;
    $('#map').classList.toggle('show-labels', map.getZoom() >= 7);
    $('#map').classList.toggle('show-group-labels', map.getZoom() >= 5);
  }

  function panelOffsetPx() {
    if (mqMobile.matches || state.view === 'closed') return 0;
    return $('#panel').getBoundingClientRect().width;
  }

  function fitInitial(animate) {
    if (!map) return;
    var off = panelOffsetPx();
    var b = mqMobile.matches ? L.latLngBounds([[30, -8], [56, 38]]) : L.latLngBounds([[22, -18], [60, 50]]);
    map.fitBounds(b, { paddingTopLeft: [off + 20, 70], paddingBottomRight: [20, mqMobile.matches ? 140 : 150], animate: !!animate && !reduceMotion });
  }

  function focusLatLng(latlng, zoom, animate) {
    if (!map) return;
    var off = panelOffsetPx();
    var size = map.getSize();
    var dock = mqMobile.matches ? 0 : 60;
    var z = zoom == null ? map.getZoom() : zoom;
    var pt = map.project(latlng, z);
    var target = map.unproject(pt.subtract([off / 2, -dock / 2]), z);
    if (animate && !reduceMotion) map.flyTo(target, z, { duration: 0.9, easeLinearity: 0.3 });
    else map.setView(target, z, { animate: false });
    if (size.x === 0) map.invalidateSize();
  }

  function focusPerson(p, opts) {
    opts = opts || {};
    if (!map || !hasPlace(p)) return;
    var bp = p.birthplace;
    var ll = L.latLng(bp.lat, bp.lon);
    var curZ = map.getZoom();
    var z = opts.zoom != null ? opts.zoom : Math.min(Math.max(curZ, 4), 6);
    if (bp.precision === 'region' && bp.radius_km) z = Math.min(z, bp.radius_km > 400 ? 4 : 5);
    var inView = map.getBounds().pad(-0.15).contains(ll);
    if (opts.onlyIfHidden && inView) return;
    focusLatLng(ll, z, opts.animate !== false);
  }

  // ---------- filtering & clustering ----------
  function visiblePeople() {
    return D.people.filter(function (p) {
      if (!hasPlace(p)) return false;
      if (!state.eras[p.era]) return false;
      if (state.mode === 'saints') return isSaint(p);
      if (state.mode === 'antipopes') return p.antipopes && p.antipopes.length > 0;
      return true;
    });
  }

  // Same coordinates (to about 1 km) form one site, so a probable birthplace in Rome joins the Rome group.
  function siteKey(p) { return p.birthplace.lat.toFixed(2) + ',' + p.birthplace.lon.toFixed(2); }

  function computeClusters(people) {
    var sites = {}, order = [];
    people.forEach(function (p) {
      var k = siteKey(p);
      if (!sites[k]) { sites[k] = { key: k, label: p.birthplace.label, country: p.birthplace.country, lat: p.birthplace.lat, lon: p.birthplace.lon, precision: p.birthplace.precision, people: [] }; order.push(sites[k]); }
      else if (sites[k].precision === 'region' && p.birthplace.precision === 'exact') { sites[k].label = p.birthplace.label; sites[k].precision = 'exact'; }
      if (p.birthplace.precision === 'region') sites[k].mixed = true;
      sites[k].people.push(p.id);
    });
    order.forEach(function (s) { s.pt = map.latLngToLayerPoint([s.lat, s.lon]); });
    order.sort(function (a, b) { return b.people.length - a.people.length || firstN(a) - firstN(b); });
    var R = 38, used = {}, clusters = [];
    order.forEach(function (s) {
      if (used[s.key]) return;
      var c = { anchor: s, sites: [s] }; used[s.key] = true;
      order.forEach(function (o) {
        if (used[o.key]) return;
        if (s.pt.distanceTo(o.pt) < R) { c.sites.push(o); used[o.key] = true; }
      });
      var ids = []; c.sites.forEach(function (x) { x.people.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
      ids.sort(function (a, b) { return firstEntry(person(a)) - firstEntry(person(b)); });
      c.people = ids;
      c.kind = c.sites.length > 1 ? 'area' : (ids.length > 1 ? 'shared' : 'single');
      c.key = c.kind === 'area' ? 'area:' + c.sites.map(function (x) { return x.key; }).sort().join('|') : 'site:' + s.key;
      clusters.push(c);
    });
    return clusters;
    function firstN(site) { return Math.min.apply(null, site.people.map(function (id) { return firstEntry(person(id)); })); }
  }

  var lastClusters = [];
  function renderMarkers() {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers(); lineLayer.clearLayers(); areaLayer.clearLayers();
    var people = visiblePeople();
    var clusters = computeClusters(people);
    lastClusters = clusters;
    var posOfPerson = {};
    clusters.forEach(function (c) {
      var ll = L.latLng(c.anchor.lat, c.anchor.lon);
      c.people.forEach(function (id) { posOfPerson[id] = ll; });
      if (c.kind === 'single') markerLayer.addLayer(pinMarker(person(c.people[0]), ll));
      else markerLayer.addLayer(groupMarker(c, ll));
    });
    // area indicator for a selected regional birthplace
    var sp = state.person && person(state.person);
    if (sp && hasPlace(sp) && sp.birthplace.precision === 'region' && sp.birthplace.radius_km) {
      var col = eraOf(sp).color;
      areaLayer.addLayer(L.circle([sp.birthplace.lat, sp.birthplace.lon], { pane: 'areas', radius: sp.birthplace.radius_km * 1000, className: 'area-ring', color: '#5B2716', fillColor: col, interactive: false }));
    }
    if (state.mode === 'antipopes') renderAntipopes(posOfPerson);
    updateModeNote(people);
  }

  function pinMarker(p, ll) {
    var e = eraOf(p);
    var sel = state.person === p.id;
    var approx = p.birthplace.precision === 'region';
    var html = '<div class="pm-inner">' +
      (approx ? '<span class="pm-approx" aria-hidden="true"></span>' : '') +
      '<span class="pm-pin" style="background-image:url(' + pinSrc(e.id) + ')"></span>' +
      (isSaint(p) ? '<span class="pm-halo" aria-hidden="true"></span>' : '') +
      '<span class="pm-label">' + esc(p.display_name) + '<small>' + esc(placeShort(p)) + (approx ? ' (approximate)' : '') + '</small></span></div>';
    var m = L.marker(ll, {
      icon: L.divIcon({ className: 'pm' + (sel ? ' is-selected' : ''), html: html, iconSize: [40, 54], iconAnchor: [20, 54] }),
      keyboard: true, title: '', alt: p.display_name, riseOnHover: true,
      zIndexOffset: sel ? 1000 : 0
    });
    m.on('click', function () { selectPerson(p.id, { source: 'map' }); });
    m.on('add', function () {
      var el = m.getElement(); if (!el) return;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', p.display_name + ', ' + e.label + ', born ' + placeLabel(p) + (isSaint(p) ? ', saint' : ''));
    });
    return m;
  }

  var KEYS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M19 19 5 5" stroke="#5B2716" stroke-width="2.6" stroke-linecap="round"/></svg>';
  function groupMarker(c, ll) {
    var n = c.people.length;
    var size = n >= 50 ? 54 : n >= 10 ? 46 : 40;
    var active = state.person && c.people.indexOf(state.person) >= 0;
    var activeCol = active ? eraOf(person(state.person)).color : null;
    var label = c.kind === 'shared' ? (c.anchor.precision === 'region' ? '≈ ' : '') + c.anchor.label
      : (c.anchor.people.length >= 5 ? c.anchor.label + ' and nearby' : 'Popes in this area');
    var sub = n + ' popes' + (active ? ' · ' + person(state.person).display_name : '');
    var html = '<div class="pm-inner"><span class="pg-disc">' + n +
      (c.kind === 'shared' ? '<span class="pg-keys">' + KEYS_SVG + '</span>' : '') + '</span>' +
      '<span class="pm-label pg-label">' + esc(label) + '<small>' + esc(sub) + '</small></span></div>';
    var m = L.marker(ll, {
      icon: L.divIcon({ className: 'pm pg ' + (c.kind === 'area' ? 'is-area' : 'is-shared') + (active ? ' is-active' : ''), html: html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
      keyboard: true, riseOnHover: true, zIndexOffset: active ? 900 : 100 + n
    });
    m.on('click', function () { openGroup(c); });
    m.on('add', function () {
      var el = m.getElement(); if (!el) return;
      if (activeCol) el.style.setProperty('--active', activeCol);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', (c.kind === 'shared' ? 'Shared birthplace ' + label : 'Group of nearby birthplaces') + ', ' + n + ' popes. Opens a chooser.');
    });
    return m;
  }

  function openGroup(c) {
    state.group = {
      kind: c.kind, key: c.key, members: c.people.slice(),
      label: c.anchor.label,
      precision: c.anchor.precision, mixed: !!c.anchor.mixed && c.anchor.precision === 'exact',
      sites: c.sites.length, anchorCount: c.anchor.people.length,
      center: [c.anchor.lat, c.anchor.lon]
    };
    var pick = state.person && c.people.indexOf(state.person) >= 0 ? state.person : c.people[0];
    selectPerson(pick, { source: 'group', keepGroup: true });
  }

  function groupForPerson(pid) {
    var p = person(pid);
    if (!hasPlace(p)) return null;
    var k = siteKey(p);
    var members = D.people.filter(function (q) { return hasPlace(q) && siteKey(q) === k; }).map(function (q) { return q.id; });
    if (members.length < 2) return null;
    members.sort(function (a, b) { return firstEntry(person(a)) - firstEntry(person(b)); });
    var exact = members.map(person).filter(function (q) { return q.birthplace.precision === 'exact'; })[0];
    var mixed = members.some(function (id) { return person(id).birthplace.precision === 'region'; });
    return { kind: 'shared', key: 'site:' + k, members: members, label: (exact || p).birthplace.label, precision: exact ? 'exact' : 'region', mixed: mixed && !!exact };
  }

  // ---------- antipopes on the map ----------
  function renderAntipopes(posOfPerson) {
    var occupied = [];
    Object.keys(posOfPerson).forEach(function (id) { occupied.push(map.latLngToLayerPoint(posOfPerson[id])); });
    (D.antipopes || []).forEach(function (a) {
      var linked = (a.people || []).filter(function (pid) { return posOfPerson[pid]; });
      if (!linked.length) return;
      var hasLoc = a.birthplace && a.birthplace.precision !== 'unknown' && a.birthplace.lat != null;
      if (!hasLoc) return;
      var base = map.latLngToLayerPoint([a.birthplace.lat, a.birthplace.lon]);
      var pt = base, step = 0;
      while (occupied.some(function (o) { return o.distanceTo(pt) < 20; }) && step < 40) {
        step++;
        var ang = step * 2.4, rad = 22 + step * 3.2;
        pt = base.add([Math.cos(ang) * rad, Math.sin(ang) * rad]);
      }
      occupied.push(pt);
      var ll = map.layerPointToLatLng(pt);
      linked.forEach(function (pid) {
        lineLayer.addLayer(L.polyline([ll, posOfPerson[pid]], { pane: 'lines', className: 'ap-line', interactive: false }));
      });
      var sel = state.antipope === a.id;
      var m = L.marker(ll, {
        icon: L.divIcon({ className: 'pm ap' + (sel ? ' is-selected' : ''), html: '<div class="ap-dot"></div><span class="pm-label">' + esc(a.display_name) + '<small>Antipope · ' + esc(a.claim_label) + '</small></span>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        keyboard: true, zIndexOffset: 500
      });
      m.on('click', function () { state.antipope = a.id; selectPerson(linked[0], { source: 'antipope', antipope: a.id }); });
      m.on('add', function () { var el = m.getElement(); if (el) { el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Antipope ' + a.display_name + ', linked to ' + linked.map(function (id) { return person(id).display_name; }).join(' and ')); } });
      markerLayer.addLayer(m);
    });
  }

  function updateModeNote(people) {
    var note = $('#mode-note');
    var hiddenEras = Object.keys(state.eras).filter(function (k) { return !state.eras[k]; }).length;
    var txt = '';
    if (state.mode === 'saints') {
      var all = D.people.filter(isSaint).length;
      txt = 'Showing ' + people.length + ' pope saints with a known or approximate birthplace (' + all + ' saints in all).';
    } else if (state.mode === 'antipopes') {
      var ap = (D.antipopes || []).length;
      var placed = (D.antipopes || []).filter(function (a) { return a.birthplace && a.birthplace.precision !== 'unknown' && a.birthplace.lat != null; }).length;
      txt = 'Grey dots are antipopes at their birthplaces, linked to the pope they opposed. ' + placed + ' of ' + ap + ' recorded claimants have a known birthplace; all are described in the profiles.';
    } else if (hiddenEras) {
      txt = 'Showing ' + people.length + ' popes from the selected eras.';
    }
    note.textContent = txt; note.hidden = !txt;
  }

  // ---------- legend / filters ----------
  function buildLegend() {
    var body = $('#legend-body');
    body.innerHTML = D.eras.map(function (e) {
      var n = D.people.filter(function (p) { return p.era === e.id; }).length;
      return '<button type="button" class="era-toggle" data-era="' + e.id + '" aria-pressed="true">' +
        '<img src="' + pinSrc(e.id) + '" alt="" width="22" height="32">' +
        '<span class="t">' + esc(e.label) + '<span class="y">' + esc(e.years) + '</span></span><span class="n">' + n + '</span></button>';
    }).join('') + '<p class="legend-note">Eras are this project\'s groupings, set between pontificates.</p>';
    $('#legend-count').innerHTML = D.eras.map(function (e) { return '<img src="' + pinSrc(e.id) + '" alt="" width="14" height="20" data-pin="' + e.id + '">'; }).join('');
  }

  function setMode(mode) {
    state.mode = mode;
    $$('.filter-modes .chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    if (mode === 'antipopes' && state.person && !(person(state.person).antipopes || []).length) { /* keep selection, it may be hidden */ }
    renderMarkers();
    if (mode === 'antipopes' && map) {
      // every antipope birthplace lies between Spain, the Low Countries and Egypt
      var off = panelOffsetPx();
      map.fitBounds(L.latLngBounds([[30, -6], [53, 31]]), { paddingTopLeft: [off + 20, 70], paddingBottomRight: [20, mqMobile.matches ? 140 : 150], animate: !reduceMotion });
    } else if (mode !== 'all' && map) map.setZoom(Math.min(map.getZoom(), 4.5), { animate: !reduceMotion });
  }

  // ---------- resources ----------
  function buildResources() {
    $('#resource-cards').innerHTML = (D.resources || []).map(function (r) {
      return '<article class="resource-card"><h3>' + esc(r.title) + '</h3><p>' + esc(r.text) + '</p>' +
        '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.link_label) + ' →</a></article>';
    }).join('');
  }

  // ---------- selection ----------
  function selectEntry(n, opts) {
    var e = entry(n); if (!e) return;
    opts = opts || {};
    state.entry = n;
    selectPerson(e.person, Object.assign({}, opts, { entry: n }));
  }

  function selectPerson(pid, opts) {
    opts = opts || {};
    var p = person(pid); if (!p) return;
    var prevPerson = state.person;
    state.person = pid;
    // A map selection opens the person's first entry unless one of his pontificates is already selected.
    if (opts.entry) state.entry = opts.entry;
    else if (!(state.entry && p.pontificates.indexOf(state.entry) >= 0)) state.entry = p.pontificates[0];
    if (state.tour.active) { state.tour.pos = state.entry; saveTour(); }
    if (!opts.keepGroup) {
      if (!(state.group && state.group.members.indexOf(pid) >= 0)) state.group = groupForPerson(pid);
    }
    if (opts.antipope) state.antipope = opts.antipope; else if (opts.source !== 'antipope') state.antipope = null;
    if (state.view !== 'profile') state.returnView = state.view === 'list' ? 'list' : (state.view === 'overview' ? 'overview' : 'map');
    state.view = 'profile';
    writeHash();
    render({ scrollTop: true });
    var moveMap = opts.source === 'tour' || opts.source === 'list' || opts.source === 'rail' || opts.source === 'hash' || opts.source === 'chooser';
    if (moveMap) {
      if (opts.source === 'chooser' && state.group && state.group.kind === 'area') { /* keep the area in view */ }
      else focusPerson(p, { animate: opts.source !== 'hash', onlyIfHidden: opts.source === 'chooser' });
    }
    renderMarkers();
    if (mqMobile.matches) $('#panel').focus({ preventScroll: true });
  }

  function saveTour() { store('pp.tour', { pos: state.tour.pos }); }

  // ---------- rendering ----------
  function render(opts) {
    opts = opts || {};
    var panel = $('#panel');
    var v = state.view;
    panel.dataset.view = v;
    document.body.classList.toggle('panel-closed', v === 'closed');
    document.body.classList.toggle('panel-open', v !== 'closed');
    $$('.nav-link').forEach(function (b) {
      var a = b.dataset.action;
      var on = (a === 'list' && (v === 'list')) || (a === 'overview' && v === 'overview') || (a === 'tour' && state.tour.active) || (a === 'map' && v === 'closed');
      b.setAttribute('aria-pressed', String(on));
    });
    if (v === 'welcome') panel.innerHTML = welcomeHTML();
    else if (v === 'list') { panel.innerHTML = listHTML(); restoreListScroll(); }
    else if (v === 'profile') panel.innerHTML = profileHTML();
    else if (v === 'overview') panel.innerHTML = overviewHTML();
    else panel.innerHTML = '';
    if (opts.scrollTop) { var sc = $('.panel-scroll', panel); if (sc) sc.scrollTop = 0; }
    renderDock();
    if (map) setTimeout(function () { map.invalidateSize(); }, 300);
  }

  function bar(left) {
    return '<div class="panel-bar">' + (left || '<span></span>') +
      '<button type="button" class="icon-btn" data-action="close" aria-label="Close panel and browse the map">×</button></div>';
  }

  function welcomeHTML() {
    var m = D.meta.counts;
    return bar('<span class="eyebrow" style="margin:0">From St Peter to ' + esc(D.meta.latest_pope) + '</span>') +
      '<div class="panel-scroll"><div class="panel-pad"><div class="welcome"><div>' +
      '<h1>Every pope comes from a place</h1><span class="underline"></span>' +
      '<p class="lede">' + esc(D.meta.welcome) + '</p>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + m.pontificates + '</b><span>Pontificates in the Vatican list</span></div>' +
      '<div class="stat"><b>' + m.people + '</b><span>Popes</span></div>' +
      '<div class="stat"><b>' + m.mapped + '</b><span>Birthplaces on the map</span></div>' +
      '</div>' +
      '<div class="btn-row"><button type="button" class="btn" data-action="tour-start">Take the pope tour</button>' +
      '<button type="button" class="btn secondary" data-action="list">List of popes</button></div>' +
      '<div class="btn-row" style="margin-top:12px"><button type="button" class="text-btn" data-action="overview">What is a pope? →</button><button type="button" class="text-btn" data-action="close">Explore the map →</button></div>' +
      '</div><div class="welcome-art"><img src="assets/art/hero-st-peter.webp" alt="Illustration of St Peter holding the keys, beside a hand-drawn map" width="700" height="805"></div></div>' +
      '<p class="welcome-foot">' + esc(m.note) + '</p>' +
      '</div></div>';
  }

  function listHTML() {
    var q = state.query.trim().toLowerCase();
    var html = '';
    D.eras.forEach(function (e) {
      var rows = D.pontificates.filter(function (x) { return x.era === e.id; }).filter(function (x) {
        if (!q) return true;
        var p = person(x.person);
        return (p.display_name + ' ' + (p.alt_names || []).join(' ') + ' ' + placeLabel(p) + ' ' + x.n).toLowerCase().indexOf(q) >= 0;
      });
      if (!rows.length) return;
      html += '<div class="era-head" style="--era:' + e.color + '"><img src="' + pinSrc(e.id) + '" alt="" width="20" height="29"><h3>' + esc(e.label) + '</h3><span>' + esc(e.years) + '</span></div><ul class="pope-list">';
      rows.forEach(function (x) {
        var p = person(x.person);
        var cur = state.entry === x.n;
        var repeat = p.pontificates.length > 1 ? ' <span class="soft">(' + ordinal(p.pontificates.indexOf(x.n) + 1) + ' time)</span>' : '';
        html += '<li><button type="button" class="pope-row" data-entry="' + x.n + '" style="--era:' + e.color + '"' + (cur ? ' aria-current="true"' : '') + '>' +
          '<span class="num">' + x.n + '</span><span class="nm">' + esc(p.display_name) + repeat + saintBadge(p) +
          '<span class="meta">' + esc(placeLabel(p)) + '</span></span><span class="yrs">' + esc(x.years_label) + '</span></button></li>';
      });
      html += '</ul>';
    });
    if (!html) html = '<p class="empty">No pope matches “' + esc(state.query) + '”.</p>';
    return bar('<button type="button" class="text-btn" data-action="close">← Back to map</button>') +
      '<div class="list-head"><h2>List of popes</h2><p class="soft" style="margin:4px 0 0">' + esc(D.meta.list_note) + '</p>' +
      '<div class="list-tools"><input class="search" id="search" type="search" placeholder="Search by name, place or number" value="' + esc(state.query) + '" aria-label="Search popes"></div></div>' +
      '<div class="panel-scroll" id="list-scroll">' + html + '</div>';
  }
  function ordinal(i) { return ['first', 'second', 'third', 'fourth'][i - 1] || i + 'th'; }

  function restoreListScroll() {
    var sc = $('#list-scroll'); if (!sc) return;
    if (state.listScrollTo) {
      var row = $('[data-entry="' + state.listScrollTo + '"]', sc);
      if (row) sc.scrollTop = Math.max(0, row.offsetTop - sc.clientHeight / 2);
      state.listScrollTo = null;
    } else sc.scrollTop = state.listScroll || 0;
  }

  function chooserHTML() {
    var g = state.group; if (!g) return '';
    var i = g.members.indexOf(state.person); if (i < 0) return '';
    var p = person(state.person);
    var title = g.kind === 'shared' ? (g.precision === 'region' ? 'Born in the region of ' : g.mixed ? 'Born in or near ' : 'Born in ') + g.label : (g.anchorCount >= 5 ? g.label + ' and nearby' : 'Popes in this area');
    var kind = g.kind === 'shared' ? 'Shared birthplace' : 'Nearby birthplaces, grouped at this zoom';
    var opts = g.members.map(function (id, k) {
      var q = person(id);
      var showPlace = g.kind === 'area' || q.birthplace.precision === 'region';
      return '<option value="' + esc(id) + '"' + (k === i ? ' selected' : '') + '>' + (k + 1) + '. ' + esc(q.display_name) + ' · ' + esc(entry(firstEntry(q)).years_label) + (showPlace ? ' · ' + esc(placeShort(q)) : '') + '</option>';
    }).join('');
    return '<section class="chooser' + (g.kind === 'area' ? ' is-area' : '') + '" aria-label="Location chooser">' +
      '<div class="chooser-top"><span class="chooser-active" style="--active:' + eraOf(p).color + '" aria-hidden="true"></span><div><div class="chooser-kind">' + esc(kind) + '</div><div class="chooser-title">' + esc(title) + '</div></div>' +
      '<div class="chooser-nav"><button type="button" class="round-btn" data-action="group-prev" aria-label="Previous pope in this place"' + (i === 0 ? ' disabled' : '') + '>‹</button>' +
      '<span class="chooser-count" aria-live="polite">' + (i + 1) + '/' + g.members.length + '</span>' +
      '<button type="button" class="round-btn" data-action="group-next" aria-label="Next pope in this place"' + (i === g.members.length - 1 ? ' disabled' : '') + '>›</button></div></div>' +
      '<label class="visually-hidden" for="group-select">Choose a pope in this group</label><select id="group-select">' + opts + '</select>' +
      (g.kind === 'area' ? '<button type="button" class="text-btn" data-action="group-zoom" style="justify-self:start">Zoom in to separate these birthplaces</button>' : '') +
      '</section>';
  }

  function profileHTML() {
    var p = person(state.person), e = eraOf(p), n = state.entry, x = entry(n);
    var back = mqMobile.matches ? '<button type="button" class="text-btn" data-action="back-map">← Back to map</button>'
      : (state.returnView === 'overview' ? '<button type="button" class="text-btn" data-action="overview">← Back to overview</button>'
        : '<button type="button" class="text-btn" data-action="back-list">← Back to list</button>');
    var bp = p.birthplace;
    var periods = p.pontificates.map(function (k) {
      var y = entry(k);
      return '<li><button type="button" class="period" data-entry="' + k + '"' + (k === n ? ' aria-current="true"' : '') + ' style="--era:' + e.color + '"><b>No. ' + k + '</b>' + esc(y.dates_label) + '</button></li>';
    }).join('');
    var birthDd = '';
    if (p.research_status === 'pending') {
      birthDd = 'Still being researched<span class="note">This profile has not been checked against the sources yet.</span>';
    } else if (!bp || bp.precision === 'unknown') {
      birthDd = 'Birthplace unknown<span class="note">' + esc((bp && bp.public_note) || 'No reliable source records where he was born, so he is not placed on the map. He remains in the list and tour.') + '</span>';
    } else {
      birthDd = esc(bp.label) + (bp.country && bp.country !== bp.label ? ', ' + esc(bp.country) : '') +
        (bp.precision === 'region' ? '<span class="precision">approximate region</span>' : '') +
        (bp.historical_name ? '<span class="note">Historical name: ' + esc(bp.historical_name) + '</span>' : '') +
        (bp.public_note ? '<span class="note">' + esc(bp.public_note) + '</span>' : '');
    }
    var saintDd = p.saint && p.saint.status !== 'none' ? esc(p.saint.label) + (p.saint.public_note ? '<span class="note">' + esc(p.saint.public_note) + '</span>' : '') : '';
    var aps = (p.antipopes || []).map(function (id) { return apById[id]; }).filter(Boolean);
    var html = bar(back) + '<div class="panel-scroll">' + chooserHTML() + '<div class="panel-pad profile" style="--era:' + e.color + '">' +
      '<div class="profile-head"><div>' +
      '<div class="era-tag"><img src="' + pinSrc(e.id) + '" alt="" width="22" height="32">' + esc(e.label) + ' <i aria-hidden="true"></i></div>' +
      '<h1>' + esc(p.display_name) + saintBadge(p) + (aps.length ? '<span class="badge antipope">Antipope note</span>' : '') + '</h1>' +
      (p.alt_names && p.alt_names.length ? '<p class="alt-names">' + esc(p.alt_names.join(' · ')) + '</p>' : '') +
      '</div>' + (p.image ? '<figure class="portrait"><img src="' + esc(p.image.src) + '" alt="' + esc(p.image.alt) + '"></figure>' : '') + '</div>' +
      '<dl class="facts">' +
      '<dt>Vatican list</dt><dd>' + (p.pontificates.length > 1 ? 'Appears ' + p.pontificates.length + ' times. Showing no. ' + n + ' of ' + D.meta.counts.pontificates + '.<ul class="periods">' + periods + '</ul>' : 'No. ' + n + ' of ' + D.meta.counts.pontificates) + '</dd>' +
      '<dt>Pontificate</dt><dd>' + esc(x.dates_label) + (x.date_note ? '<span class="note">' + esc(x.date_note) + '</span>' : '') + '</dd>' +
      '<dt>Birthplace</dt><dd>' + birthDd + '</dd>' +
      (p.birth_date ? '<dt>Born</dt><dd>' + esc(p.birth_date) + '</dd>' : '') +
      (p.secular_name ? '<dt>Birth name</dt><dd>' + esc(p.secular_name) + '</dd>' : '') +
      (saintDd ? '<dt>Saint status</dt><dd>' + saintDd + '</dd>' : '') +
      '</dl>' +
      (p.short_bio ? '<p class="short-bio">' + esc(p.short_bio) + '</p>' : '<p class="short-bio soft">A fuller profile for this pope is still being researched.</p>');
    var more = '';
    if (p.long_bio) more += '<h3>His story</h3>' + paras(p.long_bio);
    if (p.actions && p.actions.length) more += '<h3>Important actions</h3><ul>' + p.actions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    if (p.context) more += '<h3>What was happening in the world</h3>' + paras(p.context);
    if (aps.length) {
      more += '<h3>Antipopes</h3>' + aps.map(function (a) {
        return '<details class="card antipope-note"' + (state.antipope === a.id ? ' open' : '') + '><summary>' + esc(a.display_name) + ' · rival claim ' + esc(a.claim_label) + '</summary>' +
          '<div class="ap-body"><p><strong>' + esc(a.relationship) + '</strong></p>' + paras(a.dispute_long || a.dispute_short) +
          (a.birthplace && a.birthplace.precision !== 'unknown' ? '<p class="soft">Born: ' + esc(a.birthplace.label) + (a.birthplace.country ? ', ' + esc(a.birthplace.country) : '') + (a.birthplace.precision === 'region' ? ' (approximate)' : '') + '</p>' : '<p class="soft">Birthplace unknown.</p>') +
          (a.classification_public ? '<p class="soft">' + esc(a.classification_public) + '</p>' : '') + '</div></details>';
      }).join('') + '<p class="soft" style="font-size:14px">' + esc(D.overview.antipopes_short) + '</p>';
    }
    if (p.saint && p.saint.status !== 'none' && D.overview.saints_short) {
      more += '<div class="card"><h3 style="margin-top:0">About saint status</h3><p>' + esc(D.overview.saints_short) + '</p><button type="button" class="text-btn" data-action="overview-saints">How saints are recognized →</button></div>';
    }
    more += '<div class="card" style="--era:' + e.color + '"><div class="era-tag" style="margin:0"><img src="' + pinSrc(e.id) + '" alt="" width="22" height="32"><strong style="color:var(--navy)">' + esc(e.label) + ', ' + esc(e.years) + '</strong></div><p style="margin:8px 0 0">' + esc(e.summary) + '</p></div>';
    if (p.public_uncertainty) more += '<p class="uncertain">' + esc(p.public_uncertainty) + '</p>';
    html += '<details class="more"' + (state.moreOpen ? ' open' : '') + '><summary>Read more about ' + esc(p.display_name) + '</summary><div class="more-body">' + more + '</div></details>';
    if (state.tour.active) {
      html += '<div class="next-prev"><button type="button" class="btn secondary small" data-action="tour-prev"' + (n <= 1 ? ' disabled' : '') + '>‹ Previous</button>' +
        '<span class="tour-pos">Vatican sequence ' + n + ' / ' + D.meta.counts.pontificates + '</span>' +
        '<button type="button" class="btn small" data-action="tour-next"' + (n >= D.meta.counts.pontificates ? ' disabled' : '') + '>Next ›</button></div>';
    }
    html += '</div></div>';
    return html;
  }
  function paras(t) { return String(t).split(/\n\s*\n/).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join(''); }

  function overviewHTML() {
    var o = D.overview;
    var eraCards = D.eras.map(function (e) {
      return '<div class="era-card"><img src="' + pinSrc(e.id) + '" alt="" width="32" height="47"><div><h3>' + esc(e.label) + '</h3><span class="y">' + esc(e.years) + ' · ' + esc(e.range_label) + '</span><p>' + esc(e.summary) + '</p></div></div>';
    }).join('');
    return bar('<button type="button" class="text-btn" data-action="close">← Back to map</button>') + '<div class="panel-scroll"><div class="panel-pad">' +
      '<section class="ov-section" id="ov-intro"><div><p class="eyebrow">The basics</p><h2>What is a pope?</h2><span class="underline"></span>' + paras(o.intro) + '</div>' +
      '<div class="ov-art"><img src="assets/art/chair-of-st-peter.webp" alt="The Chair of St Peter beneath the dove of the Holy Spirit" width="700" height="875"></div></section>' +
      '<div class="divider"></div>' +
      '<section class="ov-section flip" id="ov-succession"><div class="ov-art"><img src="assets/art/white-smoke.webp" alt="White smoke rising from the Sistine Chapel chimney" width="700" height="700"></div>' +
      '<div><p class="eyebrow">Habemus papam</p><h2>How is a pope chosen?</h2><span class="underline"></span>' + paras(o.succession) + '</div></section>' +
      '<div class="divider"></div>' +
      '<section class="ov-section" id="ov-saints"><div><p class="eyebrow">Holiness on the chair of Peter</p><h2>Pope saints</h2><span class="underline"></span>' + paras(o.saints) +
      '<p><strong>' + D.meta.counts.saints + '</strong> popes are honoured as saints and <strong>' + D.meta.counts.blessed + '</strong> as blessed in these records.</p>' +
      '<div class="btn-row"><button type="button" class="btn secondary" data-action="mode-saints">See them on the map</button></div></div>' +
      '<div class="ov-art"><img src="assets/art/st-gregory-the-great.webp" alt="St Gregory the Great writing, with the dove at his ear" width="700" height="780"></div></section>' +
      '<div class="divider"></div>' +
      '<section class="ov-section flip" id="ov-antipopes"><div class="ov-art"><img src="assets/art/antipopes-two-chairs.webp" alt="A golden chair with the keys beside an empty silver chair" width="800" height="575"></div>' +
      '<div><p class="eyebrow">Claimants to the chair</p><h2>Antipopes</h2><span class="underline"></span>' + paras(o.antipopes) +
      '<div class="btn-row"><button type="button" class="btn secondary" data-action="mode-antipopes">See which popes faced an antipope</button></div></div></section>' +
      '<div class="divider"></div>' +
      '<section id="ov-eras"><p class="eyebrow">Historical context</p><h2>Five eras on the map</h2><span class="underline"></span>' +
      '<img class="wide-art" src="assets/art/st-peters-square.webp" alt="St Peter\'s Square and Basilica" width="1200" height="600">' +
      paras(o.eras_note) + '<div class="era-cards">' + eraCards + '</div></section>' +
      '<div class="btn-row" style="margin-top:28px"><button type="button" class="btn" data-action="tour-start">Take the pope tour</button><button type="button" class="btn secondary" data-action="list">List of popes</button></div>' +
      '</div></div>';
  }

  // ---------- tour dock & rail ----------
  function renderDock() {
    var c = $('#tour-controls'); var total = D.meta.counts.pontificates;
    if (state.tour.active) {
      var n = state.tour.pos, x = entry(n), p = person(x.person);
      c.innerHTML = '<button type="button" class="round-btn" data-action="tour-prev" aria-label="Previous pope in the Vatican sequence"' + (n <= 1 ? ' disabled' : '') + '>‹</button>' +
        '<div class="tour-pos">Vatican sequence ' + n + ' / ' + total + '<small>' + esc(p.display_name) + ' · ' + esc(x.years_label) + '</small></div>' +
        '<button type="button" class="round-btn" data-action="tour-next" aria-label="Next pope in the Vatican sequence"' + (n >= total ? ' disabled' : '') + '>›</button>' +
        '<span class="tour-spacer"></span><button type="button" class="btn small secondary" data-action="tour-exit">Exit tour</button>';
    } else if (state.tour.pos && state.tour.pos > 1) {
      var y = entry(state.tour.pos), q = person(y.person);
      c.innerHTML = '<div class="tour-pos">Pope tour<small>Paused at no. ' + y.n + ', ' + esc(q.display_name) + '</small></div><span class="tour-spacer"></span>' +
        '<button type="button" class="btn small" data-action="tour-continue">Continue tour</button>' +
        '<button type="button" class="btn small secondary" data-action="tour-restart">Restart</button>';
    } else {
      c.innerHTML = '<div class="tour-pos">Pope tour<small>All ' + total + ' entries, St Peter to ' + esc(D.meta.latest_pope) + '</small></div><span class="tour-spacer"></span>' +
        '<button type="button" class="btn small" data-action="tour-start">Take the pope tour</button>';
    }
    updateRail();
  }

  function buildRail() {
    var rail = $('#rail'); var total = D.meta.counts.pontificates;
    rail.setAttribute('aria-valuemax', total);
    rail.innerHTML = D.eras.map(function (e) {
      var cnt = e.last_n - e.first_n + 1;
      var light = e.id === 'early' || e.id === 'renaissance';
      return '<div class="rail-seg" style="flex:' + cnt + ';background:' + e.color + ';color:' + (light ? '#22305F' : '#fff') + '" title="' + esc(e.label) + '"><span>' + (cnt > 25 ? esc(e.short || e.label) : '') + '</span></div>';
    }).join('') + '<div class="rail-hover"></div><div class="rail-thumb"></div>';
    var preview = $('#rail-preview');
    function nAt(clientX) {
      var r = rail.getBoundingClientRect();
      var f = Math.min(Math.max((clientX - r.left) / r.width, 0), 0.99999);
      return Math.floor(f * total) + 1;
    }
    function show(n, clientX) {
      var x = entry(n), p = person(x.person), r = rail.getBoundingClientRect();
      preview.innerHTML = '<b>' + n + '. ' + esc(p.display_name) + '</b>' + esc(x.years_label);
      preview.hidden = false;
      var left = ((n - 0.5) / total) * r.width;
      left = Math.min(Math.max(left, 90), r.width - 90);
      preview.style.left = left + 'px';
      var hov = $('.rail-hover', rail); hov.style.display = 'block'; hov.style.left = ((n - 0.5) / total * 100) + '%';
    }
    function hide() { preview.hidden = true; $('.rail-hover', rail).style.display = 'none'; }
    var dragging = false;
    rail.addEventListener('pointermove', function (ev) { show(nAt(ev.clientX), ev.clientX); });
    rail.addEventListener('pointerleave', function () { if (!dragging) hide(); });
    rail.addEventListener('pointerdown', function (ev) { dragging = true; rail.setPointerCapture(ev.pointerId); show(nAt(ev.clientX)); });
    rail.addEventListener('pointerup', function (ev) {
      if (!dragging) return; dragging = false; hide();
      jumpTour(nAt(ev.clientX), 'rail');
    });
    rail.addEventListener('pointercancel', function () { dragging = false; hide(); });
    rail.addEventListener('keydown', function (ev) {
      var cur = state.tour.active ? state.tour.pos : (state.entry || 1), n = cur;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') n = Math.min(total, cur + 1);
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') n = Math.max(1, cur - 1);
      else if (ev.key === 'PageUp') n = Math.min(total, cur + 10);
      else if (ev.key === 'PageDown') n = Math.max(1, cur - 10);
      else if (ev.key === 'Home') n = 1;
      else if (ev.key === 'End') n = total;
      else return;
      ev.preventDefault(); jumpTour(n, 'rail');
    });
    rail.addEventListener('focus', function () { var n = state.tour.active ? state.tour.pos : (state.entry || 1); show(n); });
    rail.addEventListener('blur', hide);
  }

  function updateRail() {
    var total = D.meta.counts.pontificates;
    var n = state.tour.active ? state.tour.pos : (state.entry || state.tour.pos || 1);
    var th = $('.rail-thumb'); if (th) th.style.left = ((n - 0.5) / total * 100) + '%';
    var rail = $('#rail'); var x = entry(n), p = x && person(x.person);
    rail.setAttribute('aria-valuenow', n);
    if (p) rail.setAttribute('aria-valuetext', n + ', ' + p.display_name + ', ' + x.years_label);
  }

  function jumpTour(n, source) {
    state.tour.active = true; state.tour.pos = n; saveTour();
    state.moreOpen = false;
    selectEntry(n, { source: source || 'tour' });
  }

  // ---------- events ----------
  function bindUI() {
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-action],[data-entry],[data-mode],[data-era],[data-close]');
      if (!t) return;
      if (t.hasAttribute('data-close')) { $('#resources').close(); return; }
      if (t.dataset.mode) { setMode(t.dataset.mode); return; }
      if (t.dataset.era) { toggleEra(t.dataset.era); return; }
      if (t.dataset.entry && !t.dataset.action) {
        if (t.classList.contains('pope-row')) { var sc = $('#list-scroll'); state.listScroll = sc ? sc.scrollTop : 0; }
        state.moreOpen = t.classList.contains('period') ? !!$('.more[open]') : false;
        selectEntry(parseInt(t.dataset.entry, 10), { source: t.classList.contains('period') ? 'period' : 'list' });
        return;
      }
      action(t.dataset.action, t);
    });
    document.addEventListener('change', function (ev) {
      if (ev.target.id === 'group-select') selectPerson(ev.target.value, { source: 'chooser', keepGroup: true });
    });
    document.addEventListener('input', function (ev) {
      if (ev.target.id === 'search') {
        state.query = ev.target.value;
        var pos = ev.target.selectionStart;
        var sc = $('#list-scroll'); var html = listHTML();
        $('#panel').innerHTML = html; var s = $('#search'); s.focus(); s.setSelectionRange(pos, pos);
        state.listScroll = 0;
      }
    });
    document.addEventListener('toggle', function (ev) { if (ev.target.classList && ev.target.classList.contains('more')) state.moreOpen = ev.target.open; }, true);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if ($('#resources').open) return;
        if (state.view !== 'closed') { ev.preventDefault(); action(state.view === 'profile' && !mqMobile.matches ? 'close' : (state.view === 'profile' ? 'back-map' : 'close')); }
        return;
      }
      var tag = (ev.target.tagName || '').toLowerCase();
      if (state.tour.active && !/input|select|textarea/.test(tag) && !ev.target.closest('.leaflet-container') && ev.target.id !== 'rail') {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); action('tour-next'); }
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); action('tour-prev'); }
      }
    });
    $('#resources-toggle').addEventListener('click', function () { $('#resources').showModal(); });
    $('#resources').addEventListener('click', function (ev) { if (ev.target === ev.currentTarget) ev.currentTarget.close(); });
    window.addEventListener('hashchange', function () { var n = readHash(); if (n && n !== state.entry) selectEntry(n, { source: 'hash' }); });
    mqMobile.addEventListener && mqMobile.addEventListener('change', function () { render(); });
  }

  function action(a) {
    var total = D.meta.counts.pontificates;
    switch (a) {
      case 'home': state.view = 'welcome'; render(); fitInitial(true); break;
      case 'map': case 'close': state.view = 'closed'; render(); setTimeout(renderMarkers, 320); break;
      case 'back-map':
        state.view = 'closed'; render();
        setTimeout(function () { if (map) { map.invalidateSize(); var p = state.person && person(state.person); if (p) focusPerson(p, { animate: false, onlyIfHidden: true }); renderMarkers(); } }, 30);
        break;
      case 'list': state.view = 'list'; state.listScrollTo = state.entry; render(); break;
      case 'back-list': state.view = 'list'; render(); break;
      case 'overview': state.view = 'overview'; render({ scrollTop: true }); break;
      case 'overview-saints': state.view = 'overview'; render(); var s = $('#ov-saints'); if (s) s.scrollIntoView(); break;
      case 'tour': if (state.tour.active) { state.view = 'profile'; render(); } else if (state.tour.pos > 1) action('tour-continue'); else action('tour-start'); break;
      case 'tour-start': case 'tour-restart': jumpTour(1, 'tour'); break;
      case 'tour-continue': jumpTour(state.tour.pos || 1, 'tour'); break;
      case 'tour-next': if (state.tour.active && state.tour.pos < total) jumpTour(state.tour.pos + 1, 'tour'); break;
      case 'tour-prev': if (state.tour.active && state.tour.pos > 1) jumpTour(state.tour.pos - 1, 'tour'); break;
      case 'tour-exit': state.tour.active = false; saveTour(); render(); break;
      case 'group-prev': case 'group-next':
        var g = state.group; if (!g) return;
        var i = g.members.indexOf(state.person) + (a === 'group-next' ? 1 : -1);
        if (i >= 0 && i < g.members.length) selectPerson(g.members[i], { source: 'chooser', keepGroup: true });
        break;
      case 'group-zoom':
        if (state.group && state.group.center && map) focusLatLng(L.latLng(state.group.center[0], state.group.center[1]), Math.min(map.getZoom() + 2, 9), true);
        break;
      case 'mode-saints': setMode('saints'); if (mqMobile.matches) { state.view = 'closed'; render(); } break;
      case 'mode-antipopes': setMode('antipopes'); if (mqMobile.matches) { state.view = 'closed'; render(); } break;
    }
  }

  function toggleEra(id) {
    state.eras[id] = !state.eras[id];
    if (!Object.keys(state.eras).some(function (k) { return state.eras[k]; })) state.eras[id] = true;
    $$('.era-toggle').forEach(function (b) { b.setAttribute('aria-pressed', String(!!state.eras[b.dataset.era])); });
    var on = Object.keys(state.eras).filter(function (k) { return state.eras[k]; }).length;
    $$('#legend-count img').forEach(function (im) { im.style.opacity = state.eras[im.dataset.pin] ? 1 : 0.25; });
    renderMarkers();
  }

  // ---------- hash ----------
  function readHash() { var m = location.hash.match(/^#\/?(?:pope|n)\/(\d+)/); return m ? parseInt(m[1], 10) : null; }
  function writeHash() { if (state.entry) history.replaceState(null, '', '#/pope/' + state.entry); }

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
})();
