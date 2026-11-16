const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Size an uncropped image inside the available stage. */
export function fitImage(viewport, image) {
  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

/** Translation is relative to the viewport centre, before any CSS scale. */
export function constrain(state, viewport, image) {
  const scale = clamp(state.scale, 1, 8);
  const limitX = Math.max(0, (image.width * scale - viewport.width) / 2);
  const limitY = Math.max(0, (image.height * scale - viewport.height) / 2);
  return { scale, x: clamp(state.x, -limitX, limitX) || 0, y: clamp(state.y, -limitY, limitY) || 0 };
}

export function zoomAt(state, nextScale, point, viewport, image) {
  const scale = clamp(nextScale, 1, 8);
  const factor = scale / state.scale;
  const x = point.x - viewport.width / 2;
  const y = point.y - viewport.height / 2;
  return constrain({ scale, x: x - (x - state.x) * factor, y: y - (y - state.y) * factor }, viewport, image);
}

export function pinchBetween(state, from, to, viewport, image) {
  const centre = points => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
  const distance = points => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  const beforeDistance = distance(from);
  if (beforeDistance < 1) return state;
  const before = centre(from);
  const after = centre(to);
  const scale = clamp(state.scale * distance(to) / beforeDistance, 1, 8);
  const factor = scale / state.scale;
  return constrain({
    scale,
    x: after.x - viewport.width / 2 - (before.x - viewport.width / 2 - state.x) * factor,
    y: after.y - viewport.height / 2 - (before.y - viewport.height / 2 - state.y) * factor,
  }, viewport, image);
}

export function entityImages(images, selectedId) {
  const selected = images.find(image => image.id === selectedId);
  if (!selected) return [];
  return images.filter(image => image.entityId === selected.entityId)
    .sort((a, b) => Number(b.primary) - Number(a.primary) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}
