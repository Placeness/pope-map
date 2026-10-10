import { countries } from './map-geography.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const NEARBY_DISTANCE = 52;
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

/** A regional origin never contributes a precise point to a nearby-pin cluster. */
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

/** Nearby groups are recomputed in screen space at every zoom, using unique people. */
export function clusterLocations(locations, toScreen, distance = NEARBY_DISTANCE) {
  const exact = locations.filter(place => place.location.precision === 'place');
  const pending = new Set(exact);
  const groups = [];
  while (pending.size) {
    const first = pending.values().next().value;
    pending.delete(first);
    const members = [first];
    // Connected components keep a dense set of overlapping Italian pins usable.
    for (let cursor = 0; cursor < members.length; cursor += 1) {
      const position = toScreen(members[cursor].point);
      for (const candidate of pending) {
        const other = toScreen(candidate.point);
        if (Math.hypot(position[0] - other[0], position[1] - other[1]) < distance) {
          pending.delete(candidate);
          members.push(candidate);
        }
      }
    }
    const people = orderedUnique(members.flatMap(place => place.people));
    groups.push({
      key: members.map(place => place.key).sort().join('~'),
      kind: members.length === 1 ? 'shared' : 'area',
      label: members.length === 1 ? members[0].location.label : 'Popes in this area',
      location: members.length === 1 ? members[0].location : null,
      people,
      point: members.reduce((sum, place) => [sum[0] + place.point[0] / members.length, sum[1] + place.point[1] / members.length], [0, 0]),
      members,
    });
  }
  // Approximate area symbols group with other regions, never with precise pins.
  const regionalPending = new Set(locations.filter(item => item.location.precision === 'region'));
  while (regionalPending.size) {
    const first = regionalPending.values().next().value;
    regionalPending.delete(first);
    const members = [first];
    for (let cursor = 0; cursor < members.length; cursor += 1) {
      const position = toScreen(members[cursor].point);
      for (const candidate of regionalPending) {
        const other = toScreen(candidate.point);
        if (Math.hypot(position[0] - other[0], position[1] - other[1]) < distance) {
          regionalPending.delete(candidate);
          members.push(candidate);
        }
      }
    }
    groups.push({
      key: members.map(place => place.key).sort().join('~'),
      kind: 'area',
      label: members.length === 1 ? members[0].location.label : 'Popes in this area',
      location: members.length === 1 ? members[0].location : null,
      people: orderedUnique(members.flatMap(place => place.people)),
      point: members.reduce((sum, place) => [sum[0] + place.point[0] / members.length, sum[1] + place.point[1] / members.length], [0, 0]),
      members,
      regional: true,
    });
  }
  return groups;
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
  const connectorLayer = makeSvg('g', { class: 'pope-map-region-connectors' });
  const regionalNodes = new Map();
  locations.filter(place => place.location.precision === 'region').forEach(place => {
    const [[west, south], [east, north]] = place.location.bounds;
    const upperLeft = projectCoordinates([west, north]);
    const lowerRight = projectCoordinates([east, south]);
    const rect = makeSvg('rect', {
      x: upperLeft[0], y: upperLeft[1], width: lowerRight[0] - upperLeft[0], height: lowerRight[1] - upperLeft[1],
      rx: 0.8, 'vector-effect': 'non-scaling-stroke',
    });
    regionalNodes.set(place.key, rect);
    regionalLayer.append(rect);
  });
  svg.append(land, regionalLayer, connectorLayer);
  const labelsLayer = document.createElement('div');
  labelsLayer.className = 'pope-map-labels';
  labelsLayer.setAttribute('aria-hidden', 'true');
  const markerLayer = document.createElement('div');
  markerLayer.className = 'pope-map-markers';
  const status = document.createElement('p');
  status.className = 'pope-map-status';
  status.setAttribute('aria-live', 'polite');
  element.replaceChildren(svg, labelsLayer, markerLayer, status);

  const backgroundLabels = [
    ['France', 2, 47], ['Spain', -4, 40], ['Italy', 15.7, 39], ['Germany', 10, 52], ['Poland', 21, 53],
    ['Greece', 23, 38.2], ['Türkiye', 35, 40], ['Egypt', 29, 26], ['Algeria', 3, 28], ['Morocco', -7, 31],
    ['United States', -104, 39], ['Argentina', -66, -35], ['Brazil', -51, -12], ['Mexico', -102, 23],
    ['Atlantic Ocean', -34, 25, 'sea'], ['Mediterranean Sea', 18, 33.5, 'sea'],
  ].map(([label, longitude, latitude, type]) => {
    const node = document.createElement('span');
    node.className = `pope-map-geographic-label${type ? ' pope-map-sea-label' : ''}`;
    node.textContent = label;
    labelsLayer.append(node);
    return { node, point: projectCoordinates([longitude, latitude]), type };
  });

  const toScreen = point => [(point[0] - view.center[0]) * width / view.width + width / 2, (point[1] - view.center[1]) * width / view.width + height / 2];
  const focalX = () => panelOpen && width >= 760 ? 0.75 : 0.5;
  const stopAnimation = () => {
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
  };

  function markerContent(button, group) {
    const activePerson = group.people.find(person => person.id === selectedId);
    const singlePerson = group.people.length === 1 ? group.people[0] : null;
    const depictedPerson = activePerson || singlePerson;
    const era = depictedPerson ? byEra.get(depictedPerson.eraId) : null;
    const active = Boolean(activePerson);
    button.className = `pope-map-marker${active ? ' is-selected' : ''}${group.regional ? ' is-regional' : ''}${group.people.length > 1 ? ' is-grouped' : ''}`;
    button.style.setProperty('--marker-color', era?.color || '#22305F');
    button.setAttribute('aria-pressed', String(active));
    const countText = group.people.length > 1 ? `, ${group.people.length} popes` : '';
    button.setAttribute('aria-label', `${group.regional ? 'Approximate birth region: ' : ''}${group.label}${countText}${activePerson ? `, ${activePerson.name} selected` : singlePerson ? `, ${singlePerson.name}` : ''}`);
    const signature = `${group.key}|${selectedId}|${era?.marker || ''}`;
    if (button.dataset.content === signature) return;
    button.dataset.content = signature;
    button.replaceChildren();
    if (group.regional) {
      const regionSymbol = document.createElement('span');
      regionSymbol.className = 'pope-map-region-symbol';
      regionSymbol.setAttribute('aria-hidden', 'true');
      const approximate = document.createElement('span');
      approximate.className = 'pope-map-approximate-symbol';
      approximate.textContent = '≈';
      regionSymbol.append(approximate);
      if (group.people.length > 1) {
        const count = document.createElement('span');
        count.textContent = group.people.length;
        regionSymbol.append(count);
      }
      button.append(regionSymbol);
    } else if (era?.marker) {
      const image = document.createElement('img');
      image.className = 'pope-map-pin-art';
      image.src = era.marker;
      image.alt = '';
      image.draggable = false;
      image.addEventListener('error', () => {
        image.remove();
        button.classList.add('has-fallback-pin');
        const fallback = document.createElement('span');
        fallback.className = 'pope-map-pin-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        button.prepend(fallback);
      }, { once: true });
      button.append(image);
      if (group.people.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'pope-map-count-badge';
        badge.textContent = group.people.length;
        button.append(badge);
      }
    } else {
      const badge = document.createElement('span');
      badge.className = 'pope-map-cluster';
      badge.textContent = group.people.length > 1 ? group.people.length : '•';
      badge.setAttribute('aria-hidden', 'true');
      button.append(badge);
    }
    const label = document.createElement('span');
    label.className = 'pope-map-marker-label';
    const name = document.createElement('strong');
    name.textContent = activePerson?.name || singlePerson?.name || group.label;
    label.append(name);
    if (activePerson || group.regional) {
      const place = document.createElement('span');
      place.textContent = activePerson?.birthplace.label || singlePerson?.birthplace.label || (group.members.length > 1 ? 'Approximate birth regions' : `${group.people.length} popes · approximate birth region`);
      label.append(place);
    }
    button.append(label);
  }

  function refreshRegionVisibility() {
    const selectedPlace = placeByPerson.get(selectedId);
    const highlighted = new Set();
    markerNodes.forEach(button => {
      const group = button.mapGroup;
      if (!group?.regional || (!button.mapHovered && !button.mapFocused)) return;
      const members = selectedPlace && group.people.some(person => person.id === selectedId) ? [selectedPlace] : group.members;
      members.forEach(place => highlighted.add(place.key));
    });
    regionalNodes.forEach((node, key) => {
      const active = selectedPlace?.key === key;
      node.classList.toggle('is-selected', active);
      node.classList.toggle('is-visible', active || highlighted.has(key));
      node.style.setProperty('--region-color', active ? byEra.get(byId.get(selectedId)?.eraId)?.color || '#22305F' : '#5E93C2');
    });
  }

  function render() {
    if (destroyed) return;
    const mapHeight = view.width * height / width;
    svg.setAttribute('viewBox', `${view.center[0] - view.width / 2} ${view.center[1] - mapHeight / 2} ${view.width} ${mapHeight}`);
    backgroundLabels.forEach(({ node, point, type }) => {
      const position = toScreen(point);
      node.style.left = `${position[0]}px`;
      node.style.top = `${position[1]}px`;
      node.hidden = position[0] < 30 || position[0] > width - 30 || position[1] < 20 || position[1] > height - 20 || (view.width < 32 && !type);
    });
    const groups = clusterLocations(locations, toScreen);
    const exactFootprints = groups.filter(group => !group.regional).map(group => {
      const active = group.people.find(person => person.id === selectedId);
      const [x, y] = toScreen(active ? placeByPerson.get(active.id).point : group.point);
      return { left: x - 31, right: x + 31, top: y - (active ? 80 : 71), bottom: y + 7 };
    });
    const regionalPositions = new Map();
    const placedRegions = [];
    const offsets = [[0, 0], [48, 0], [-48, 0], [0, 48], [0, -48], [40, 40], [40, -40], [-40, 40], [-40, -40], [68, 0], [-68, 0], [0, 68], [0, -68]];
    const collides = position => [...exactFootprints, ...placedRegions].some(box => position[0] + 24 > box.left && position[0] - 24 < box.right && position[1] + 24 > box.top && position[1] - 24 < box.bottom);
    connectorLayer.replaceChildren();
    groups.filter(group => group.regional)
      .sort((a, b) => Number(b.people.some(person => person.id === selectedId)) - Number(a.people.some(person => person.id === selectedId)))
      .forEach(group => {
        const active = group.people.find(person => person.id === selectedId);
        const original = toScreen(active ? placeByPerson.get(active.id).point : group.point);
        const ownAreas = active ? [placeByPerson.get(active.id)] : group.members;
        const corners = ownAreas.flatMap(place => place.location.bounds.map(projectCoordinates)).map(toScreen);
        const area = { left: Math.min(...corners.map(point => point[0])), right: Math.max(...corners.map(point => point[0])), top: Math.min(...corners.map(point => point[1])), bottom: Math.max(...corners.map(point => point[1])) };
        const candidates = offsets.map(offset => [original[0] + offset[0], original[1] + offset[1]]).filter(position => !collides(position));
        // ≈ labels are area annotations. Keep their group distinct from precise pins.
        const position = candidates.find(point => point[0] >= area.left && point[0] <= area.right && point[1] >= area.top && point[1] <= area.bottom) || candidates[0] || original;
        regionalPositions.set(group.key, position);
        placedRegions.push({ left: position[0] - 24, right: position[0] + 24, top: position[1] - 24, bottom: position[1] + 24 });
        const distance = Math.hypot(position[0] - original[0], position[1] - original[1]);
        if (distance > 26) {
          const edge = position.map((value, index) => value + (original[index] - value) * 22 / distance);
          const toWorld = point => [view.center[0] + (point[0] - width / 2) * view.width / width, view.center[1] + (point[1] - height / 2) * view.width / width];
          const originWorld = toWorld(original);
          const edgeWorld = toWorld(edge);
          const connector = makeSvg('line', { x1: originWorld[0], y1: originWorld[1], x2: edgeWorld[0], y2: edgeWorld[1], 'vector-effect': 'non-scaling-stroke' });
          if (active) connector.style.setProperty('--connector-color', byEra.get(active.eraId)?.color || '#22305F');
          connectorLayer.append(connector);
        }
      });
    const retained = new Set();
    for (const group of groups) {
      const activePerson = group.people.find(person => person.id === selectedId);
      // Exact pins stay at a documented place; ≈ symbols identify an area, not a point.
      const anchor = activePerson ? placeByPerson.get(activePerson.id).point : group.point;
      const position = group.regional ? regionalPositions.get(group.key) : toScreen(anchor);
      if (position[0] < -80 || position[0] > width + 80 || position[1] < -100 || position[1] > height + 80) continue;
      retained.add(group.key);
      let button = markerNodes.get(group.key);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.addEventListener('click', event => {
          event.stopPropagation();
          if (clickSuppressed) return;
          const current = button.mapGroup;
          if (current.people.length > 1) {
            onSelectGroup({ kind: current.kind, label: current.label, peopleIds: current.people.map(person => person.id), regional: Boolean(current.regional) });
          } else {
            onSelectPerson(current.people[0].id);
          }
        }, listeners);
        button.addEventListener('mouseenter', () => { button.mapHovered = true; refreshRegionVisibility(); }, listeners);
        button.addEventListener('mouseleave', () => { button.mapHovered = false; refreshRegionVisibility(); }, listeners);
        button.addEventListener('focus', () => { button.mapFocused = true; refreshRegionVisibility(); }, listeners);
        button.addEventListener('blur', () => { button.mapFocused = false; refreshRegionVisibility(); }, listeners);
        markerNodes.set(group.key, button);
        markerLayer.append(button);
      }
      button.mapGroup = group;
      button.style.left = `${position[0]}px`;
      button.style.top = `${position[1]}px`;
      markerContent(button, group);
    }
    markerNodes.forEach((node, key) => {
      if (!retained.has(key)) {
        node.remove();
        markerNodes.delete(key);
      }
    });
    refreshRegionVisibility();
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
    let targetWidth = view.width > 140 ? 115 : Math.max(view.width, 54);
    if (place.location.precision === 'region') {
      const [[west, south], [east, north]] = place.location.bounds;
      const top = projectCoordinates([west, north]);
      const bottom = projectCoordinates([east, south]);
      const availableFraction = panelOpen && width >= 760 ? 0.42 : 0.85;
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
    status.textContent = placeByPerson.has(personId)
      ? `${person.name}: ${person.birthplace.label}${person.birthplace.precision === 'region' ? ', approximate birth region' : ''}.`
      : person.birthplace?.precision === 'unknown'
        ? `${person.name}: birthplace unknown. The map view is retained.`
        : `${person.name}: ${person.birthplace?.label || 'Recorded origin'}. Map position unavailable; the view is retained.`;
    if (options.move !== false && placeByPerson.has(personId)) focusSelected();
    else render();
  }

  function setPanelOpen(open) {
    if (panelOpen === Boolean(open)) return;
    panelOpen = Boolean(open);
    if (width >= 760 && placeByPerson.has(selectedId)) focusSelected();
    else render();
  }

  function reset(mode = 'default') {
    updateView(mode === 'world'
      ? { center: [0, projectCoordinates([0, 12])[1]], width: 360 }
      : { center: [width >= 760 ? -0.8 : 12, projectCoordinates([0, 40])[1]], width: width >= 760 ? 115 : 100 }, true);
  }

  function zoomBy(factor, position = [width * focalX(), height / 2]) {
    if (!Number.isFinite(factor) || factor <= 0) return;
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
    if (selectedPlace && (previousWidth !== width || (previousHeight !== height && selectedPlace.location.precision === 'region'))) focusSelected(false);
    else render();
  }

  element.addEventListener('keydown', event => {
    if (event.target !== element) return;
    const step = view.width * 0.08;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
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
  view = { center: [width >= 760 ? -0.8 : 12, projectCoordinates([0, 40])[1]], width: width >= 760 ? 115 : 100 };
  render();

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
