import { countries } from './map-geography.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const NEARBY_DISTANCE = 34;
const MAX_NEARBY_PLACES = 4;
const MAX_NEARBY_SPAN = 3;
const MIN_WIDTH = 9;
const MAX_WIDTH = 380;
const boundView = next => ({
  center: [Math.max(-220, Math.min(220, next.center[0])), Math.max(-180, Math.min(180, next.center[1]))],
  width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, next.width)),
});

/** Mercator world units in degrees; no basemap request is made at runtime. */
export function projectCoordinates([longitude, latitude]) {
  const clampedLatitude = Math.max(-85, Math.min(85, latitude));
  return [longitude, -180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + clampedLatitude * Math.PI / 360))];
}

const makeSvg = (tag, attributes = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
};

const orderedUnique = people => [...new Map(people.map(person => [person.id, person])).values()]
  .sort((a, b) => a.firstOrder - b.firstOrder || a.name.localeCompare(b.name));

export const displayPlace = value => String(value || '')
  .replace(/\s*\((?:approximate[^)]*|broad origin|birthplace uncertain)\)/gi, '')
  .replace(/\s*[—–]\s*approximate.*$/i, '')
  .trim();

/** Regional bounds supply an area anchor for visual density; their source geometry and precision remain intact. */
export function collectLocations(people) {
  const places = new Map();
  for (const person of people) {
    const location = person.birthplace;
    if (!location || location.precision === 'unknown') continue;
    if (location.precision === 'region' && !location.bounds) continue;
    if (location.precision === 'place' && !location.coordinates) continue;
    const key = `${location.precision}:${location.placeId || `${location.label}|${location.country}|${JSON.stringify(location.precision === 'region' ? location.bounds : location.coordinates)}`}`;
    if (!places.has(key)) {
      const bounds = location.bounds;
      const point = location.precision === 'region'
        ? [(bounds[0][0] + bounds[1][0]) / 2, (projectCoordinates(bounds[0])[1] + projectCoordinates(bounds[1])[1]) / 2]
        : projectCoordinates(location.coordinates);
      places.set(key, { key, location, point, people: [] });
    }
    places.get(key).people.push(person);
  }
  return [...places.values()].map(place => ({ ...place, people: orderedUnique(place.people) }));
}

/** One density layer includes points and areas without changing their source precision. */
export function clusterLocations(locations, toScreen, distance = NEARBY_DISTANCE) {
  const screenPoints = new Map(locations.map(place => [place.key, toScreen(place.point)]));
  const latitudes = new Map(locations.map(place => [place.key, 180 / Math.PI * (2 * Math.atan(Math.exp(-place.point[1] * Math.PI / 180)) - Math.PI / 2)]));
  const describe = members => {
    const people = orderedUnique(members.flatMap(place => place.people));
    const shared = members.length === 1 && members[0].location.precision === 'place';
    return {
      key: members.map(place => place.key).sort().join('~'),
      kind: shared ? 'shared' : 'area',
      label: members.length === 1 ? displayPlace(members[0].location.label) : `${displayPlace([...members].sort((a, b) => b.people.length - a.people.length || a.key.localeCompare(b.key))[0].location.label).split(',')[0]} & nearby`,
      location: members.length === 1 ? members[0].location : null,
      people, members,
      point: members.reduce((sum, place) => [sum[0] + place.point[0] / members.length, sum[1] + place.point[1] / members.length], [0, 0]),
      regional: members.every(place => place.location.precision === 'region'),
      hasRegions: members.some(place => place.location.precision === 'region'),
    };
  };
  const groups = [...locations].sort((a, b) => a.key.localeCompare(b.key)).map(place => describe([place]));
  // Complete-link distance prevents a chain of towns becoming one continental marker.
  // A substantial shared birthplace (Rome) keeps its own identity at every zoom.
  while (true) {
    let nearest = null;
    for (let left = 0; left < groups.length; left += 1) for (let right = left + 1; right < groups.length; right += 1) {
      const firstMembers = groups[left].members, secondMembers = groups[right].members;
      if (firstMembers.length + secondMembers.length > MAX_NEARBY_PLACES || firstMembers.some(place => place.people.length >= 8) || secondMembers.some(place => place.people.length >= 8)) continue;
      let diameter = 0;
      let local = true;
      for (const a of firstMembers) for (const b of secondMembers) {
        if (Math.abs(a.point[0] - b.point[0]) > MAX_NEARBY_SPAN || Math.abs(latitudes.get(a.key) - latitudes.get(b.key)) > MAX_NEARBY_SPAN) { local = false; break; }
        const first = screenPoints.get(a.key), second = screenPoints.get(b.key);
        diameter = Math.max(diameter, Math.hypot(first[0] - second[0], first[1] - second[1]));
      }
      diameter = Math.max(diameter, groups[left].diameter || 0, groups[right].diameter || 0);
      if (local && diameter < distance && (!nearest || diameter < nearest.diameter)) nearest = { left, right, members: [...firstMembers, ...secondMembers], diameter };
    }
    if (!nearest) break;
    groups[nearest.left] = { ...describe(nearest.members), diameter: nearest.diameter };
    groups.splice(nearest.right, 1);
  }
  return groups.sort((a, b) => a.people[0].firstOrder - b.people[0].firstOrder);
}

/** Fit documented data into a usable rectangle, rather than fitting a whole continent. */
export function fitLocations(locations, viewport, rectangle = {}, coreOnly = false) {
  if (coreOnly) return overviewFrame(viewport, rectangle);
  let candidates = locations;
  const specific = candidates.filter(place => place.location.precision === 'place' ||
    (place.location.bounds[1][0] - place.location.bounds[0][0] < 30 && place.location.bounds[1][1] - place.location.bounds[0][1] < 30));
  if (specific.length) candidates = specific;
  const points = candidates.map(place => place.point);
  if (!points.length) points.push(projectCoordinates([14, 43]));
  const left = rectangle.left ?? 24, top = rectangle.top ?? 24;
  const right = rectangle.right ?? viewport.width - 24, bottom = rectangle.bottom ?? viewport.height - 24;
  const availableWidth = Math.max(80, right - left), availableHeight = Math.max(80, bottom - top);
  const west = Math.min(...points.map(point => point[0])), east = Math.max(...points.map(point => point[0]));
  const north = Math.min(...points.map(point => point[1])), south = Math.max(...points.map(point => point[1]));
  const viewWidth = Math.max(20, (east - west + 9) * viewport.width / availableWidth, (south - north + 9) * viewport.width / availableHeight);
  return boundView({ width: viewWidth, center: [
    (west + east) / 2 - ((left + right) / 2 - viewport.width / 2) * viewWidth / viewport.width,
    (north + south) / 2 - ((top + bottom) / 2 - viewport.height / 2) * viewWidth / viewport.width,
  ] });
}

/** The opening composition prioritises the Mediterranean; other places remain available by panning or selection. */
export function overviewFrame(viewport, rectangle = {}) {
  const portrait = viewport.width <= 760;
  const left = rectangle.left ?? 24, right = rectangle.right ?? viewport.width - 24;
  const viewWidth = portrait ? 26 : Math.max(46, 35 * viewport.width / Math.max(300, right - left));
  const mapHeight = viewWidth * viewport.height / viewport.width;
  const northLimit = projectCoordinates([0, 55])[1];
  const top = rectangle.top ?? 40, bottom = rectangle.bottom ?? viewport.height - 80;
  const focalLatitude = projectCoordinates([0, 42.8])[1];
  return boundView({ width: viewWidth, center: [
    12 - ((left + right) / 2 - viewport.width / 2) * viewWidth / viewport.width,
    Math.max(focalLatitude - ((top + bottom) / 2 - viewport.height / 2) * viewWidth / viewport.width, northLimit + mapHeight / 2),
  ] });
}

/**
 * Callbacks run only for a user activating a map marker. select() is silent.
 * A group callback contains { kind, label, peopleIds, regional }, in first-roster order.
 */
export function createMap(element, { people, eras, onSelectGroup = () => {}, onSelectPerson = () => {} }) {
  const byId = new Map(people.map(person => [person.id, person]));
  const byEra = new Map(eras.map(era => [era.id, era]));
  const locations = collectLocations(people);
  const placeByPerson = new Map();
  locations.forEach(place => place.people.forEach(person => placeByPerson.set(person.id, place)));
  let selectedId = null;
  let framing = 'overview';
  let showWorld = false;
  let hoveredKey = null;
  let focusedKey = null;
  let panelOpen = false;
  let width = Math.max(element.clientWidth, 1);
  let height = Math.max(element.clientHeight, 1);
  let view = { center: [0, projectCoordinates([0, 40])[1]], width: 115 };
  let animation = null;
  let frame = null;
  let destroyed = false;
  let clickSuppressed = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointers = new Map();
  let gesture = null;
  let clusterScale = null;
  let cachedGroups = [];
  const markerNodes = new Map();
  const abort = new AbortController();
  const listeners = { signal: abort.signal };

  element.classList.add('pope-map');
  element.tabIndex = 0;
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', 'Interactive map of papal birthplaces. Use arrow keys to pan, plus and minus to zoom, and Home to reset.');

  const svg = makeSvg('svg', { class: 'pope-map-geography', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' });
  const land = makeSvg('g', { class: 'pope-map-land' });
  countries.forEach(country => land.append(makeSvg('path', { d: country.path, 'vector-effect': 'non-scaling-stroke' })));
  const regionalLayer = makeSvg('g', { class: 'pope-map-regions' });
  const markerLeaders = makeSvg('g', { class: 'pope-map-marker-leaders' });
  const regionalNodes = new Map();
  locations.filter(place => place.location.precision === 'region').forEach(place => {
    const [[west, south], [east, north]] = place.location.bounds;
    const upperLeft = projectCoordinates([west, north]);
    const lowerRight = projectCoordinates([east, south]);
    const rect = makeSvg('rect', { x: upperLeft[0], y: upperLeft[1], width: lowerRight[0] - upperLeft[0], height: lowerRight[1] - upperLeft[1], rx: 0.6, 'vector-effect': 'non-scaling-stroke' });
    regionalNodes.set(place.key, rect);
    regionalLayer.append(rect);
  });
  const selectedPlaceDot = makeSvg('circle', { class: 'pope-map-selected-place', 'vector-effect': 'non-scaling-stroke' });
  const tooltipConnector = makeSvg('line', { class: 'pope-map-tooltip-connector', 'vector-effect': 'non-scaling-stroke' });
  svg.append(land, regionalLayer, markerLeaders, selectedPlaceDot, tooltipConnector);
  const labelsLayer = document.createElement('div');
  labelsLayer.className = 'pope-map-labels';
  labelsLayer.setAttribute('aria-hidden', 'true');
  const markerLayer = document.createElement('div');
  markerLayer.className = 'pope-map-markers';
  const tooltip = document.createElement('div');
  tooltip.className = 'pope-map-tooltip';
  tooltip.hidden = true;
  tooltip.setAttribute('aria-hidden', 'true');
  const status = document.createElement('p');
  status.className = 'pope-map-status';
  status.setAttribute('aria-live', 'polite');
  const inset = document.createElement('section');
  inset.className = 'pope-map-inset';
  inset.setAttribute('aria-label', 'Birthplaces in the Americas');
  inset.hidden = true;
  const insetHeading = document.createElement('div');
  insetHeading.className = 'pope-map-inset-heading';
  const insetTitle = document.createElement('span');
  insetTitle.textContent = 'Americas';
  const insetClose = document.createElement('button');
  insetClose.type = 'button';
  insetClose.textContent = '×';
  insetClose.setAttribute('aria-label', 'Close Americas overview');
  insetClose.addEventListener('click', () => reset(), listeners);
  insetHeading.append(insetTitle, insetClose);
  const insetCanvas = document.createElement('div');
  insetCanvas.className = 'pope-map-inset-canvas';
  const insetSvg = makeSvg('svg', { 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' });
  const insetLand = makeSvg('g', { class: 'pope-map-inset-land' });
  countries.forEach(country => insetLand.append(makeSvg('path', { d: country.path, 'vector-effect': 'non-scaling-stroke' })));
  insetSvg.append(insetLand);
  insetCanvas.append(insetSvg);
  inset.append(insetHeading, insetCanvas);
  inset.addEventListener('pointerdown', event => event.stopPropagation(), listeners);
  inset.addEventListener('wheel', event => event.stopPropagation(), listeners);
  const distantLocations = locations.filter(place => place.point[0] < -25 || place.point[0] > 60);
  const insetMarkers = distantLocations.map(place => {
    const button = document.createElement('button');
    button.className = 'pope-map-inset-place';
    button.type = 'button';
    const circle = document.createElement('span');
    circle.className = 'pope-map-inset-dot';
    circle.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'pope-map-inset-place-label';
    label.textContent = displayPlace(place.location.label).split(',')[0];
    button.append(circle, label);
    button.setAttribute('aria-label', `${place.people.map(person => person.name).join(', ')}, ${displayPlace(place.location.label)}`);
    button.addEventListener('click', () => {
      if (place.people.length > 1) onSelectGroup({ kind: place.location.precision === 'place' ? 'shared' : 'area', label: displayPlace(place.location.label), peopleIds: place.people.map(person => person.id), regional: place.location.precision === 'region' });
      else onSelectPerson(place.people[0].id);
    }, listeners);
    insetCanvas.append(button);
    return { button, place, label };
  });
  element.replaceChildren(svg, labelsLayer, markerLayer, tooltip, inset, status);

  const backgroundLabels = [
    ['France', 2, 47], ['Spain', -4, 40], ['Italy', 15.7, 39], ['Germany', 10, 52], ['Poland', 21, 53],
    ['Greece', 23, 38.2], ['Türkiye', 35, 40], ['Egypt', 29, 26], ['Algeria', 3, 28], ['Morocco', -7, 31],
    ['United States', -104, 39], ['Argentina', -66, -35], ['Mediterranean Sea', 18, 33.5, 'sea'],
  ].map(([label, longitude, latitude, type]) => {
    const node = document.createElement('span');
    node.className = `pope-map-geographic-label${type ? ' pope-map-sea-label' : ''}`;
    node.textContent = label;
    labelsLayer.append(node);
    return { node, point: projectCoordinates([longitude, latitude]), type };
  });

  const toScreen = point => [(point[0] - view.center[0]) * width / view.width + width / 2, (point[1] - view.center[1]) * width / view.width + height / 2];
  const focalX = () => panelOpen && width > 760 ? 0.75 : 0.5;
  const stopAnimation = () => { if (animation !== null) cancelAnimationFrame(animation); animation = null; };
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const uiBoxes = () => {
    const origin = element.getBoundingClientRect();
    return [...element.parentElement.querySelectorAll('.welcome-card,.era-legend,.americas-card,.selection-card,.tour-rail,.map-toolbar,.pope-map-inset')]
      .filter(node => !node.hidden && node.getClientRects().length)
      .map(node => { const box = node.getBoundingClientRect(); return { left: box.left - origin.left, right: box.right - origin.left, top: box.top - origin.top, bottom: box.bottom - origin.top, node }; });
  };

  function overviewView() {
    const obstacles = uiBoxes().filter(box => box.node !== inset);
    const welcome = obstacles.find(box => box.node.classList.contains('welcome-card'));
    const legend = obstacles.find(box => box.node.classList.contains('era-legend'));
    const americas = obstacles.find(box => box.node.classList.contains('americas-card'));
    const portrait = width <= 760;
    const left = panelOpen && !portrait ? width * 0.5 + 24 : portrait ? 24 : welcome ? welcome.right + 34 : width * 0.27;
    const top = portrait && welcome ? welcome.bottom + 28 : 38;
    return fitLocations(locations, { width, height }, { left, right: width - (portrait ? 68 : 78), top, bottom: Math.min(height - 85, legend ? legend.top - 28 : height, americas ? americas.top - 28 : height) }, true);
  }

  function renderInset() {
    inset.hidden = !showWorld || !distantLocations.length;
    if (inset.hidden) return;
    const obstacles = uiBoxes().filter(box => box.node !== inset);
    const legend = obstacles.find(box => box.node.classList.contains('era-legend'));
    const welcome = obstacles.find(box => box.node.classList.contains('welcome-card'));
    const card = obstacles.find(box => box.node.classList.contains('selection-card'));
    const insetWidthOuter = inset.offsetWidth, insetHeightOuter = inset.offsetHeight;
    const desiredLeft = width > 760 ? panelOpen ? width * 0.5 + 22 : welcome ? welcome.right + 30 : card ? card.right + 20 : 28 : 16;
    const desiredBottom = width > 760 ? 24 : Math.max(100, legend ? height - legend.top + 14 : 100);
    const positions = [[desiredLeft, height - desiredBottom - insetHeightOuter], [desiredLeft, 16], [16, 16], [width - insetWidthOuter - 74, 16], [16, welcome ? welcome.bottom + 16 : 16]]
      .map(([left, top]) => ({ left: Math.max(12, Math.min(width - insetWidthOuter - 12, left)), top: Math.max(12, Math.min(height - insetHeightOuter - 12, top)) }));
    const ranked = positions.map(position => ({ ...position, score: obstacles.reduce((score, box) => score + overlap({ ...position, right: position.left + insetWidthOuter, bottom: position.top + insetHeightOuter }, box), 0) })).sort((a, b) => a.score - b.score);
    inset.style.left = `${ranked[0].left}px`;
    inset.style.top = `${ranked[0].top}px`;
    const insetWidth = insetCanvas.clientWidth, insetHeight = insetCanvas.clientHeight;
    const insetView = fitLocations(distantLocations, { width: insetWidth, height: insetHeight }, { left: 25, right: insetWidth - 25, top: 27, bottom: insetHeight - 25 });
    const insetMapHeight = insetView.width * insetHeight / insetWidth;
    insetSvg.setAttribute('viewBox', `${insetView.center[0] - insetView.width / 2} ${insetView.center[1] - insetMapHeight / 2} ${insetView.width} ${insetMapHeight}`);
    insetMarkers.forEach(({ button, place, label }) => {
      const active = place.people.find(person => person.id === selectedId);
      button.style.left = `${(place.point[0] - insetView.center[0]) * insetWidth / insetView.width + insetWidth / 2}px`;
      button.style.top = `${(place.point[1] - insetView.center[1]) * insetWidth / insetView.width + insetHeight / 2}px`;
      button.classList.toggle('is-selected', Boolean(active));
      button.style.setProperty('--marker-color', byEra.get((active || place.people[0]).eraId)?.color || '#22305F');
      label.textContent = active ? active.name : displayPlace(place.location.label).split(',')[0];
    });
  }

  function markerContent(button, group) {
    const activePerson = group.people.find(person => person.id === selectedId);
    const singlePerson = group.people.length === 1 ? group.people[0] : null;
    const era = byEra.get((activePerson || singlePerson || group.people[0])?.eraId);
    const regional = activePerson ? activePerson.birthplace.precision === 'region' : group.regional;
    button.className = `pope-map-marker${activePerson ? ' is-selected' : ''}${regional ? ' is-regional' : ''}${group.people.length > 1 ? ' is-grouped' : ''}`;
    button.style.setProperty('--marker-color', era?.color || '#22305F');
    button.setAttribute('aria-pressed', String(Boolean(activePerson)));
    button.setAttribute('aria-label', `${group.label}${group.people.length > 1 ? `, ${group.people.length} popes` : `, ${singlePerson.name}`}${activePerson ? `, ${activePerson.name} selected` : ''}`);
    const signature = `${group.key}|${selectedId}|${era?.marker || ''}`;
    if (button.dataset.content === signature) return;
    button.dataset.content = signature;
    const illustration = document.createElement('span');
    illustration.className = 'pope-map-illustration';
    illustration.setAttribute('aria-hidden', 'true');
    const drawingEras = [era?.id];
    if (group.kind === 'shared' && group.people.length >= 8) drawingEras.push(era?.id);
    drawingEras.forEach((eraId, index) => {
      const drawing = byEra.get(eraId);
      if (!drawing?.marker) return;
      const image = document.createElement('img');
      image.className = 'pope-map-era-art';
      image.src = drawing.marker; image.alt = ''; image.draggable = false;
      image.style.setProperty('--pin-index', index);
      image.style.setProperty('--pin-total', drawingEras.length);
      image.addEventListener('error', () => { image.remove(); illustration.classList.add('has-dot'); }, { once: true });
      illustration.append(image);
    });
    if (!illustration.childElementCount) illustration.classList.add('has-dot');
    if (group.people.length > 1) {
      const count = document.createElement('span');
      count.className = 'pope-map-count'; count.textContent = group.people.length;
      illustration.append(count);
    }
    const caption = document.createElement('span');
    caption.className = 'pope-map-place-caption'; caption.setAttribute('aria-hidden', 'true');
    caption.textContent = group.label;
    caption.hidden = true;
    button.replaceChildren(illustration, caption);
  }

  function positionMarkers(groups, obstacles) {
    const placed = [];
    const layout = new Map();
    const offsets = [[0, 0]];
    for (const radius of [46, 64]) for (let step = 0; step < 12; step += 1) offsets.push([Math.cos(step * Math.PI / 6) * radius, Math.sin(step * Math.PI / 6) * radius]);
    const leftEdge = panelOpen && width > 760 ? width * 0.48 + 24 : 24;
    for (const group of [...groups].sort((a, b) => Number(b.people.some(person => person.id === selectedId)) - Number(a.people.some(person => person.id === selectedId)) || b.people.length - a.people.length || a.key.localeCompare(b.key))) {
      const anchor = toScreen(group.point);
      if (anchor[0] < leftEdge || anchor[0] > width - 24 || anchor[1] < 24 || anchor[1] > height - 24) continue;
      // Never pull a hidden place out from behind a card: its connector would imply a false location.
      if (obstacles.some(box => overlap({ left: anchor[0] - 1, right: anchor[0] + 1, top: anchor[1] - 1, bottom: anchor[1] + 1 }, box))) continue;
      let best = null;
      for (const [dx, dy] of offsets) {
        const x = anchor[0] + dx, y = anchor[1] + dy;
        if (x < leftEdge || x > width - 24 || y < 24 || y > height - 24) continue;
        const box = { left: x - 22.5, right: x + 22.5, top: y - 22.5, bottom: y + 22.5 };
        const occlusion = [...obstacles, ...placed].reduce((total, obstacle) => total + overlap(box, obstacle), 0);
        const score = occlusion * 1000 + Math.hypot(dx, dy);
        if (!best || score < best.score) best = { x, y, anchor, box, score, occlusion };
        if (score === 0) break;
      }
      // Crowded places reappear on zoom; never trade a separate town for an overlapping touch target.
      if (best && best.occlusion === 0) {
        layout.set(group.key, best); placed.push(best.box);
        if (group.kind === 'shared' && group.people.length >= 8) placed.push({ left: best.x + 22, right: best.x + 74, top: best.y - 13, bottom: best.y + 13 });
      }
    }
    return layout;
  }

  function updateCaptions(obstacles) {
    const buttons = [...markerNodes.values()].filter(button => !button.hidden);
    const markerBoxes = buttons.map(button => { const x = parseFloat(button.style.left), y = parseFloat(button.style.top); return { left: x - 22, right: x + 22, top: y - 22, bottom: y + 22 }; });
    const captionBoxes = [];
    for (const button of [...buttons].sort((a, b) => b.mapGroup.people.length - a.mapGroup.people.length || a.mapGroup.key.localeCompare(b.mapGroup.key))) {
      const caption = button.querySelector('.pope-map-place-caption');
      caption.hidden = false;
      const x = parseFloat(button.style.left), y = parseFloat(button.style.top);
      const captionWidth = caption.offsetWidth, captionHeight = caption.offsetHeight;
      const candidates = [[x + 26, y - captionHeight / 2], [x - captionWidth / 2, y + 24], [x - captionWidth - 26, y - captionHeight / 2], [x - captionWidth / 2, y - captionHeight - 24]];
      const candidate = candidates.find(([left, top]) => left > 10 && left + captionWidth < width - 10 && top > 10 && top + captionHeight < height - 10 && ![...obstacles, ...markerBoxes, ...captionBoxes].some(box => overlap({ left: left - 3, right: left + captionWidth + 3, top: top - 2, bottom: top + captionHeight + 2 }, box)));
      caption.hidden = !candidate;
      if (candidate) {
        caption.style.left = `${candidate[0] - x + 22}px`; caption.style.top = `${candidate[1] - y + 22}px`;
        captionBoxes.push({ left: candidate[0] - 3, right: candidate[0] + captionWidth + 3, top: candidate[1] - 2, bottom: candidate[1] + captionHeight + 2 });
      }
    }
    return captionBoxes;
  }

  function updateTooltip() {
    tooltipConnector.style.display = 'none';
    const focused = markerNodes.get(focusedKey)?.hidden ? null : markerNodes.get(focusedKey);
    const hovered = markerNodes.get(hoveredKey)?.hidden ? null : markerNodes.get(hoveredKey);
    const selected = [...markerNodes.values()].find(button => !button.hidden && button.mapGroup.people.some(person => person.id === selectedId));
    const button = focused || hovered || selected;
    tooltip.hidden = !button;
    if (!button) { updateCaptions(uiBoxes()); return; }
    const group = button.mapGroup;
    const person = group.people.find(item => item.id === selectedId) || (group.people.length === 1 ? group.people[0] : null);
    const heading = document.createElement('strong');
    heading.textContent = person?.name || `${group.people.length} popes`;
    const place = document.createElement('span');
    place.textContent = person ? displayPlace(person.birthplace.label) : group.label;
    tooltip.replaceChildren(heading, place);
    tooltip.style.setProperty('--marker-color', person ? byEra.get(person.eraId)?.color || '#22305F' : '#22305F');
    tooltip.style.maxWidth = `${Math.min(230, width - 32)}px`;
    const tooltipWidth = tooltip.offsetWidth, tooltipHeight = tooltip.offsetHeight;
    const ownPlace = person?.id === selectedId ? placeByPerson.get(person.id) : null;
    const [x, y] = ownPlace ? toScreen(ownPlace.point) : [parseFloat(button.style.left), parseFloat(button.style.top)];
    const minX = panelOpen && width > 760 ? width * 0.48 + 12 : 12;
    const maxX = width - tooltipWidth - 12, maxY = height - tooltipHeight - 12;
    const candidates = [
      [x + 35, y - tooltipHeight / 2], [x - tooltipWidth - 35, y - tooltipHeight / 2],
      [x - tooltipWidth / 2, y + 35], [x - tooltipWidth / 2, y - tooltipHeight - 35],
      [x + 35, y + 35], [x + 35, y - tooltipHeight - 35],
      [x - tooltipWidth - 35, y + 35], [x - tooltipWidth - 35, y - tooltipHeight - 35],
    ].map(([left, top]) => ({ left: Math.max(minX, Math.min(maxX, left)), top: Math.max(12, Math.min(maxY, top)) }));
    const origin = element.getBoundingClientRect();
    const markers = [...markerNodes.values()].filter(node => !node.hidden).map(node => { const b = node.getBoundingClientRect(); return { left: b.left - origin.left - 3, right: b.right - origin.left + 3, top: b.top - origin.top - 3, bottom: b.bottom - origin.top + 3 }; });
    const obstacles = [...uiBoxes(), ...markers];
    const rank = candidate => ({ ...candidate,
      score: obstacles.reduce((score, obstacle) => score + overlap({ ...candidate, right: candidate.left + tooltipWidth, bottom: candidate.top + tooltipHeight }, obstacle), 0),
      distance: Math.hypot(candidate.left + tooltipWidth / 2 - x, candidate.top + tooltipHeight / 2 - y),
    });
    const compare = (a, b) => a.score - b.score || a.distance - b.distance;
    const ranked = candidates.map(rank).sort(compare);
    if (ranked[0].score > 0) {
      for (const radius of [70, 100, 140, 180]) for (let step = 0; step < 12; step += 1) {
        const angle = step * Math.PI / 6;
        ranked.push(rank({ left: Math.max(minX, Math.min(maxX, x + Math.cos(angle) * radius - tooltipWidth / 2)), top: Math.max(12, Math.min(maxY, y + Math.sin(angle) * radius - tooltipHeight / 2)) }));
      }
      for (const left of [minX, (minX + maxX) / 2, maxX]) for (const top of [12, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY]) {
        ranked.push(rank({ left, top }));
      }
      ranked.sort(compare);
      if (ranked[0].score > 0) {
        for (let left = minX; left <= maxX; left += 8) for (let top = 12; top <= maxY; top += 8) ranked.push(rank({ left, top }));
        ranked.sort(compare);
      }
    }
    tooltip.style.left = `${ranked[0].left}px`; tooltip.style.top = `${ranked[0].top}px`;
    const edge = [Math.max(ranked[0].left, Math.min(ranked[0].left + tooltipWidth, x)), Math.max(ranked[0].top, Math.min(ranked[0].top + tooltipHeight, y))];
    const distance = Math.hypot(edge[0] - x, edge[1] - y);
    if (distance > 65) {
      const startRadius = ownPlace && group.kind === 'area' ? 8 : 25;
      const start = [x + (edge[0] - x) * startRadius / distance, y + (edge[1] - y) * startRadius / distance];
      const toWorld = point => [view.center[0] + (point[0] - width / 2) * view.width / width, view.center[1] + (point[1] - height / 2) * view.width / width];
      const from = toWorld(start), to = toWorld(edge);
      tooltipConnector.setAttribute('x1', from[0]); tooltipConnector.setAttribute('y1', from[1]); tooltipConnector.setAttribute('x2', to[0]); tooltipConnector.setAttribute('y2', to[1]);
      tooltipConnector.style.setProperty('--marker-color', person ? byEra.get(person.eraId)?.color || '#22305F' : '#22305F');
      tooltipConnector.style.display = '';
    }
    updateCaptions([...uiBoxes(), { left: ranked[0].left, right: ranked[0].left + tooltipWidth, top: ranked[0].top, bottom: ranked[0].top + tooltipHeight }]);
  }

  function render() {
    if (destroyed) return;
    const mapHeight = view.width * height / width;
    svg.setAttribute('viewBox', `${view.center[0] - view.width / 2} ${view.center[1] - mapHeight / 2} ${view.width} ${mapHeight}`);
    renderInset();
    const scale = width / view.width;
    if (scale !== clusterScale) { cachedGroups = clusterLocations(locations, toScreen, NEARBY_DISTANCE); clusterScale = scale; }
    const groups = cachedGroups;
    const retained = new Set();
    const obstacles = uiBoxes();
    const layout = positionMarkers(groups, obstacles);
    markerLeaders.replaceChildren();
    for (const group of groups) {
      const position = layout.get(group.key);
      if (!position) continue;
      const { x, y, anchor } = position;
      retained.add(group.key);
      let button = markerNodes.get(group.key);
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.addEventListener('click', event => {
          event.stopPropagation(); if (clickSuppressed) return;
          const current = button.mapGroup;
          if (current.people.length > 1) onSelectGroup({ kind: current.kind, label: current.label, peopleIds: current.people.map(person => person.id), regional: current.regional, hasRegions: current.hasRegions });
          else onSelectPerson(current.people[0].id);
        }, listeners);
        button.addEventListener('mouseenter', () => { hoveredKey = button.mapGroup.key; updateTooltip(); }, listeners);
        button.addEventListener('mouseleave', () => { if (hoveredKey === button.mapGroup.key) hoveredKey = null; updateTooltip(); }, listeners);
        button.addEventListener('focus', () => { focusedKey = button.mapGroup.key; updateTooltip(); }, listeners);
        button.addEventListener('blur', () => { if (focusedKey === button.mapGroup.key) focusedKey = null; updateTooltip(); }, listeners);
        markerNodes.set(group.key, button); markerLayer.append(button);
      }
      button.mapGroup = group;
      button.style.left = `${x}px`; button.style.top = `${y}px`;
      button.hidden = obstacles.some(box => overlap({ left: x - 22, right: x + 22, top: y - 22, bottom: y + 22 }, box) > 0);
      button.tabIndex = button.hidden ? -1 : 0;
      markerContent(button, group);
      if (!button.hidden && Math.hypot(x - anchor[0], y - anchor[1]) > 8) {
        const shifted = [view.center[0] + (x - width / 2) * view.width / width, view.center[1] + (y - height / 2) * view.width / width];
        markerLeaders.append(makeSvg('line', { x1: group.point[0], y1: group.point[1], x2: shifted[0], y2: shifted[1], 'vector-effect': 'non-scaling-stroke' }));
        markerLeaders.append(makeSvg('circle', { cx: group.point[0], cy: group.point[1], r: 1.5 * view.width / width }));
      }
    }
    markerNodes.forEach((node, key) => { if (!retained.has(key)) { node.remove(); markerNodes.delete(key); } });
    const selectedPlace = placeByPerson.get(selectedId);
    const selectedGroup = groups.find(group => group.people.some(person => person.id === selectedId));
    const ownPoint = selectedPlace && toScreen(selectedPlace.point);
    const groupPoint = selectedGroup && toScreen(selectedGroup.point);
    const showExactDot = selectedPlace?.location.precision === 'place' && selectedGroup?.kind === 'area' && Math.hypot(ownPoint[0] - groupPoint[0], ownPoint[1] - groupPoint[1]) > 12;
    selectedPlaceDot.style.display = showExactDot ? '' : 'none';
    if (showExactDot) {
      selectedPlaceDot.setAttribute('cx', selectedPlace.point[0]); selectedPlaceDot.setAttribute('cy', selectedPlace.point[1]); selectedPlaceDot.setAttribute('r', 4 * view.width / width);
      selectedPlaceDot.style.setProperty('--marker-color', byEra.get(byId.get(selectedId)?.eraId)?.color || '#22305F');
    }
    regionalNodes.forEach((node, key) => {
      const active = selectedPlace?.key === key;
      node.classList.toggle('is-selected', active);
      node.style.setProperty('--region-color', active ? byEra.get(byId.get(selectedId)?.eraId)?.color || '#22305F' : '#5E93C2');
    });
    updateTooltip();
    const tooltipBox = tooltip.hidden ? [] : [{ left: parseFloat(tooltip.style.left), right: parseFloat(tooltip.style.left) + tooltip.offsetWidth, top: parseFloat(tooltip.style.top), bottom: parseFloat(tooltip.style.top) + tooltip.offsetHeight }];
    const captionBoxes = updateCaptions([...obstacles, ...tooltipBox]);
    const markerBoxes = [...markerNodes.values()].map(button => { const x = parseFloat(button.style.left), y = parseFloat(button.style.top); return { left: x - 28, right: x + 28, top: y - 28, bottom: y + 28 }; });
    markerBoxes.push(...captionBoxes, ...obstacles);
    if (!tooltip.hidden) markerBoxes.push({ left: parseFloat(tooltip.style.left), right: parseFloat(tooltip.style.left) + tooltip.offsetWidth, top: parseFloat(tooltip.style.top), bottom: parseFloat(tooltip.style.top) + tooltip.offsetHeight });
    backgroundLabels.forEach(({ node, point, type }) => {
      const [x, y] = toScreen(point);
      node.style.left = `${x}px`; node.style.top = `${y}px`; node.hidden = false;
      const box = { left: x - node.offsetWidth / 2, right: x + node.offsetWidth / 2, top: y - 9, bottom: y + 9 };
      node.hidden = x < 30 || x > width - 30 || y < 20 || y > height - 20 || (view.width < 28 && !type) || markerBoxes.some(marker => overlap(box, marker));
    });
  }

  function updateView(next, animate = false) {
    stopAnimation();
    const target = boundView(next);
    if (!animate || reducedMotion.matches) {
      view = target;
      render();
      return;
    }
    const original = view;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - start) / 320);
      const eased = 1 - (1 - progress) ** 3;
      view = {
        center: original.center.map((value, index) => value + (target.center[index] - value) * eased),
        width: original.width + (target.width - original.width) * eased,
      };
      render();
      animation = progress < 1 ? requestAnimationFrame(tick) : null;
    };
    animation = requestAnimationFrame(tick);
  }

  function focusSelected(animate = true) {
    const place = placeByPerson.get(selectedId);
    if (!place) return;
    let targetWidth = Math.min(overviewView().width, view.width);
    if (place.location.precision === 'region') {
      const [[west, south], [east, north]] = place.location.bounds;
      const top = projectCoordinates([west, north]);
      const bottom = projectCoordinates([east, south]);
      const availableFraction = panelOpen && width > 760 ? 0.42 : 0.85;
      targetWidth = Math.max(targetWidth, (east - west) / availableFraction, (bottom[1] - top[1]) * width / (height * 0.65));
      const center = [(west + east) / 2, (top[1] + bottom[1]) / 2];
      updateView({ center: [center[0] - (focalX() - 0.5) * targetWidth, center[1]], width: targetWidth }, animate);
    } else {
      updateView({ center: [place.point[0] - (focalX() - 0.5) * targetWidth, place.point[1]], width: targetWidth }, animate);
    }
  }

  function select(personId, options = {}) {
    if (!byId.has(personId)) return;
    stopAnimation();
    selectedId = personId;
    if (typeof options.panelOpen === 'boolean') panelOpen = options.panelOpen;
    const person = byId.get(personId);
    status.textContent = `${person.name}: ${person.birthplace?.precision === 'unknown' ? 'Birthplace unknown' : displayPlace(person.birthplace?.label) || 'Birthplace unknown'}.`;
    if (options.move !== false && placeByPerson.has(personId)) { framing = 'selected'; showWorld = false; element.dispatchEvent(new CustomEvent('pope-map-viewchange', { bubbles: true, detail: { mode: 'selected' } })); focusSelected(); }
    else { framing = 'free'; render(); }
  }

  function setPanelOpen(open) {
    if (panelOpen === Boolean(open)) return;
    panelOpen = Boolean(open);
    if (width > 760 && placeByPerson.has(selectedId)) focusSelected();
    else if (width > 760 && (framing === 'overview' || framing === 'world')) updateView(overviewView(), true);
    else render();
  }

  function reset(mode = 'default', options = {}) {
    if (options.clearSelection) selectedId = null;
    framing = mode === 'world' ? 'world' : 'overview';
    showWorld = mode === 'world';
    element.dispatchEvent(new CustomEvent('pope-map-viewchange', { bubbles: true, detail: { mode: framing } }));
    hoveredKey = null; focusedKey = null;
    updateView(overviewView(), true);
  }

  function zoomBy(factor, position = [width * focalX(), height / 2]) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    framing = 'free';
    const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, view.width / factor));
    const ratio = nextWidth / view.width;
    const anchor = [view.center[0] + (position[0] - width / 2) * view.width / width, view.center[1] + (position[1] - height / 2) * view.width / width];
    updateView({ center: view.center.map((value, index) => anchor[index] + (value - anchor[index]) * ratio), width: nextWidth });
  }

  function resize() {
    const previousWidth = width;
    const previousHeight = height;
    width = Math.max(element.clientWidth, 1);
    height = Math.max(element.clientHeight, 1);
    const selectedPlace = placeByPerson.get(selectedId);
    if (framing === 'overview' || framing === 'world') updateView(overviewView());
    else if (framing === 'selected' && selectedPlace && (previousWidth !== width || (previousHeight !== height && selectedPlace.location.precision === 'region'))) focusSelected(false);
    else render();
  }

  element.addEventListener('keydown', event => {
    if (event.target !== element) return;
    const step = view.width * 0.08;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      framing = 'free';
      updateView({ ...view, center: [view.center[0] + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), view.center[1] + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)] });
    } else if (['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      zoomBy(event.key === '-' ? 1 / 1.25 : 1.25);
    } else if (event.key === 'Home') {
      event.preventDefault();
      reset();
    }
  }, listeners);

  element.addEventListener('wheel', event => {
    if (event.target.closest?.('.pope-map-marker')) return;
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    zoomBy(Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * 0.0025), [event.clientX - rect.left, event.clientY - rect.top]);
  }, { ...listeners, passive: false });

  const getGesture = () => {
    const points = [...pointers.values()];
    const midpoint = points.length > 1 ? [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2] : points[0];
    return { midpoint, distance: points.length > 1 ? Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]) : 0, view: { center: [...view.center], width: view.width } };
  };
  element.addEventListener('pointerdown', event => {
    if (event.target.closest?.('.pope-map-marker') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    stopAnimation();
    framing = 'free';
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    gesture = getGesture();
    clickSuppressed = false;
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-dragging');
  }, listeners);
  element.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    const current = getGesture();
    const delta = [current.midpoint[0] - gesture.midpoint[0], current.midpoint[1] - gesture.midpoint[1]];
    const ratio = gesture.distance && current.distance ? gesture.distance / current.distance : 1;
    if (Math.hypot(...delta) > 4 || Math.abs(ratio - 1) > 0.01) clickSuppressed = true;
    const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, gesture.view.width * ratio));
    const rect = element.getBoundingClientRect();
    const originalAnchor = [gesture.view.center[0] + (gesture.midpoint[0] - rect.left - width / 2) * gesture.view.width / width, gesture.view.center[1] + (gesture.midpoint[1] - rect.top - height / 2) * gesture.view.width / width];
    view = boundView({ width: nextWidth, center: [originalAnchor[0] - (current.midpoint[0] - rect.left - width / 2) * nextWidth / width, originalAnchor[1] - (current.midpoint[1] - rect.top - height / 2) * nextWidth / width] });
    if (frame === null) frame = requestAnimationFrame(() => { frame = null; render(); });
  }, listeners);
  const endPointer = event => {
    pointers.delete(event.pointerId);
    if (pointers.size) gesture = getGesture();
    else {
      gesture = null;
      element.classList.remove('is-dragging');
      window.setTimeout(() => { clickSuppressed = false; }, 0);
    }
  };
  element.addEventListener('pointerup', endPointer, listeners);
  element.addEventListener('pointercancel', endPointer, listeners);
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  view = overviewView();
  render();
  document.fonts?.ready.then(() => {
    if (!destroyed && (framing === 'overview' || framing === 'world')) updateView(overviewView());
  });

  return {
    select, setPanelOpen, reset, zoomBy, resize,
    getView: () => ({ center: [...view.center], width: view.width, selectedId, panelOpen }),
    destroy() {
      destroyed = true;
      abort.abort();
      observer.disconnect();
      stopAnimation();
      if (frame !== null) cancelAnimationFrame(frame);
      element.replaceChildren();
    },
  };
}
