import { fitImage, constrain, zoomAt, pinchBetween, entityImages } from './viewer-math.js';

const paths = {
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  left: '<path d="m14 6-6 6 6 6"/>', right: '<path d="m10 6 6 6-6 6"/>',
  up: '<path d="m6 14 6-6 6 6"/>', down: '<path d="m6 10 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  link: '<path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const button = (action, label, glyph, extra = '') => `<button type="button" class="viewer-button" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(glyph)}</button>`;
let activeViewer;

/** Initialise once after the document exists. Image paths must already be page-relative. */
export function initViewer(images = []) {
  activeViewer?.destroy();
  const dialog = document.createElement('dialog');
  dialog.className = 'viewer-dialog';
  dialog.setAttribute('aria-labelledby', 'viewer-title');
  dialog.setAttribute('aria-describedby', 'viewer-help');
  dialog.innerHTML = `
    <header class="viewer-header">
      <div class="viewer-heading"><span class="viewer-eyebrow">EVIDENCE / 影像查阅</span><h2 id="viewer-title"></h2></div>
      <div class="viewer-header-actions"><a class="viewer-original" target="_blank" rel="noopener">${icon('link')}<span>原始文件</span></a>${button('close', '关闭影像查看器（Esc）', 'close', 'autofocus')}</div>
    </header>
    <div class="viewer-stage" tabindex="0" aria-label="影像画布，可滚轮缩放、拖动或双指缩放">
      <div class="viewer-state" role="status" aria-live="polite"></div>
      <div class="viewer-error" hidden><p>影像暂时无法载入</p><span>可重新载入，或直接查看原始文件。</span><div><button type="button" class="viewer-retry">重新载入</button><a target="_blank" rel="noopener">查看原始文件</a></div></div>
    </div>
    <footer class="viewer-footer">
      <div class="viewer-metadata"><span class="viewer-image-id"></span><span class="viewer-source"></span><span class="viewer-dimensions"></span></div>
      <div class="viewer-toolbar">
        <div class="viewer-control-group" aria-label="同一条目影像导航">${button('previous', '上一张影像（左方向键）', 'left')}<span class="viewer-count" aria-live="polite"></span>${button('next', '下一张影像（右方向键）', 'right')}</div>
        <div class="viewer-control-group" aria-label="影像缩放">${button('minus', '缩小影像', 'minus')}<button type="button" class="viewer-reset" data-action="reset" aria-label="重置缩放与位置（0）" title="重置缩放与位置（0）">1×</button>${button('plus', '放大影像', 'plus')}</div>
        <div class="viewer-control-group viewer-pan" aria-label="移动已放大的影像">${button('pan-left', '向左移动影像', 'left')}${button('pan-up', '向上移动影像', 'up')}${button('pan-down', '向下移动影像', 'down')}${button('pan-right', '向右移动影像', 'right')}</div>
        ${button('fullscreen', '进入全屏查看', 'expand')}
      </div>
      <p id="viewer-help" class="viewer-help">滚轮 / 双指缩放 · 拖动平移 · 双击重置<span> · 方向键切图 · Esc 关闭</span></p>
      <p class="viewer-notice" role="status" aria-live="polite"></p>
    </footer>`;
  document.body.append(dialog);
  const find = selector => dialog.querySelector(selector);
  const stage = find('.viewer-stage');
  const loading = find('.viewer-state');
  const error = find('.viewer-error');
  const zoomLabel = find('.viewer-reset');
  const notice = find('.viewer-notice');
  const pointers = new Map();
  const abort = new AbortController();
  const listen = (target, event, callback, options = {}) => target.addEventListener(event, callback, { ...options, signal: abort.signal });
  let collection = [], index = 0, imageNode, trigger, generation = 0;
  let transform = { scale: 1, x: 0, y: 0 };
  let base = { width: 1, height: 1 }, viewport = { width: 1, height: 1 };
  let ready = false, previousOverflow, previousBodyOverflow, scrollLocked = false;
  const fullscreenTarget = document.documentElement;
  let ownsFullscreen = false, fullscreenPending = false, destroyed = false, session = 0;

  function updateFullscreenControl() {
    const control = find('[data-action="fullscreen"]');
    const label = ownsFullscreen && document.fullscreenElement === fullscreenTarget ? '退出全屏查看'
      : document.fullscreenElement ? '当前窗口已处于全屏' : '进入全屏查看';
    control.setAttribute('aria-label', label); control.title = label;
  }

  function draw() {
    if (imageNode) {
      imageNode.style.width = `${base.width}px`;
      imageNode.style.height = `${base.height}px`;
      imageNode.style.transform = `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
    }
    stage.classList.toggle('viewer-is-zoomed', ready && transform.scale > 1);
    zoomLabel.textContent = `${Number(transform.scale.toFixed(1))}×`;
    dialog.querySelectorAll('[data-action="plus"], [data-action="minus"], [data-action="reset"], .viewer-pan button').forEach(control => {
      const action = control.dataset.action;
      control.disabled = !ready || (action === 'minus' && transform.scale <= 1) || (action === 'plus' && transform.scale >= 8) || (action.startsWith('pan-') && transform.scale <= 1);
    });
  }

  function measure() {
    if (!dialog.open) return;
    viewport = { width: stage.clientWidth, height: stage.clientHeight };
    if (!ready || !viewport.width || !viewport.height) return;
    base = fitImage({ width: Math.max(1, viewport.width - 32), height: Math.max(1, viewport.height - 24) }, { width: imageNode.naturalWidth, height: imageNode.naturalHeight });
    transform = constrain(transform, viewport, base);
    draw();
  }

  function load() {
    const item = collection[index];
    const token = ++generation;
    pointers.clear();
    stage.classList.remove('viewer-is-dragging');
    ready = false;
    transform = { scale: 1, x: 0, y: 0 };
    imageNode?.remove();
    imageNode = document.createElement('img');
    const currentImage = imageNode;
    currentImage.className = 'viewer-image';
    currentImage.alt = `${item.entityId} · ${item.sourceLabel || '档案影像'}${item.primary ? ' · 主影像' : ''}`;
    currentImage.draggable = false;
    currentImage.hidden = true;
    currentImage.decoding = 'async';
    stage.prepend(currentImage);
    error.hidden = true;
    loading.hidden = false;
    loading.textContent = '正在载入影像…';
    stage.setAttribute('aria-busy', 'true');
    notice.textContent = '';
    find('#viewer-title').textContent = item.entityId;
    find('.viewer-image-id').textContent = item.id.toUpperCase();
    find('.viewer-source').textContent = item.sourceLabel || item.sourceType || '档案影像';
    find('.viewer-source').title = [item.sourceLabel, item.sourceEnglish].filter(Boolean).join(' / ');
    find('.viewer-dimensions').textContent = `${item.width} × ${item.height}`;
    find('.viewer-count').textContent = `${index + 1} / ${collection.length}`;
    find('[data-action="previous"]').disabled = collection.length < 2 || index === 0;
    find('[data-action="next"]').disabled = collection.length < 2 || index === collection.length - 1;
    find('.viewer-original').href = item.original;
    find('.viewer-original').setAttribute('aria-label', `在新标签页查看 ${item.id} 未压缩原始文件`);
    find('.viewer-error a').href = item.original;
    currentImage.onload = () => {
      if (token !== generation || destroyed || !dialog.open) return;
      ready = true;
      currentImage.hidden = false;
      loading.hidden = true;
      stage.setAttribute('aria-busy', 'false');
      measure();
    };
    currentImage.onerror = () => {
      if (token !== generation || destroyed || !dialog.open) return;
      ready = false;
      loading.hidden = true;
      error.hidden = false;
      stage.setAttribute('aria-busy', 'false');
      notice.textContent = '影像载入失败，可使用重新载入或原始文件链接。';
      draw();
    };
    currentImage.src = item.display;
    draw();
  }

  function lockScroll() {
    if (scrollLocked) return;
    previousOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    scrollLocked = true;
  }

  function cleanup() {
    ++generation;
    pointers.clear();
    stage.classList.remove('viewer-is-dragging');
    if (scrollLocked) {
      document.documentElement.style.overflow = previousOverflow;
      document.body.style.overflow = previousBodyOverflow;
      scrollLocked = false;
    }
    if (ownsFullscreen && document.fullscreenElement === fullscreenTarget) document.exitFullscreen?.().catch(() => {});
    ownsFullscreen = false;
    updateFullscreenControl();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  }

  function close() {
    if (dialog.open) { dialog.close(); cleanup(); }
  }

  function open(id, origin = document.activeElement) {
    const selected = entityImages(images, id);
    if (!selected.length || destroyed) return false;
    collection = selected;
    index = collection.findIndex(item => item.id === id);
    trigger = origin instanceof HTMLElement ? origin : null;
    if (!dialog.open) { ++session; dialog.showModal(); lockScroll(); }
    updateFullscreenControl();
    load();
    find('[data-action="close"]').focus({ preventScroll: true });
    return true;
  }

  function navigate(delta) {
    const next = index + delta;
    if (next < 0 || next >= collection.length) return;
    const focusedControl = document.activeElement;
    index = next;
    load();
    // Native engines may blur a navigation button to body when load disables it.
    if (focusedControl?.disabled) stage.focus({ preventScroll: true });
  }

  function zoom(nextScale, point = { x: viewport.width / 2, y: viewport.height / 2 }) {
    if (!ready) return;
    transform = zoomAt(transform, nextScale, point, viewport, base);
    draw();
  }

  function pan(x, y) {
    if (!ready) return;
    transform = constrain({ ...transform, x: transform.x + x, y: transform.y + y }, viewport, base);
    draw();
  }

  async function fullscreen() {
    if (fullscreenPending) return;
    if (document.fullscreenElement === fullscreenTarget && ownsFullscreen) {
      await document.exitFullscreen().catch(() => { notice.textContent = '未能退出全屏，请使用浏览器的退出全屏操作。'; });
      return;
    }
    if (document.fullscreenElement) {
      notice.textContent = '当前窗口已处于全屏，查看器会保留现有全屏状态。';
      return;
    }
    if (!fullscreenTarget.requestFullscreen || !document.fullscreenEnabled) {
      notice.textContent = '当前浏览器不支持全屏，已使用窗口内最大可用画布。';
      return;
    }
    const requestSession = session;
    fullscreenPending = true;
    try {
      // Dialog elements are forbidden Fullscreen API targets; the modal remains
      // in the top layer while its containing document enters fullscreen.
      await fullscreenTarget.requestFullscreen();
      ownsFullscreen = document.fullscreenElement === fullscreenTarget;
      if ((!dialog.open || destroyed || requestSession !== session) && ownsFullscreen) {
        await document.exitFullscreen(); ownsFullscreen = false;
      }
    } catch {
      notice.textContent = '未能进入全屏，仍可在当前窗口缩放查看。';
    } finally {
      fullscreenPending = false;
      updateFullscreenControl();
    }
  }

  const actions = {
    close, previous: () => navigate(-1), next: () => navigate(1),
    plus: () => zoom(transform.scale * 1.5), minus: () => zoom(transform.scale / 1.5),
    reset: () => { transform = { scale: 1, x: 0, y: 0 }; draw(); }, fullscreen,
    'pan-left': () => pan(-viewport.width / 5, 0), 'pan-right': () => pan(viewport.width / 5, 0),
    'pan-up': () => pan(0, -viewport.height / 5), 'pan-down': () => pan(0, viewport.height / 5),
  };
  listen(document, 'click', event => {
    const origin = event.target.closest?.('button[data-viewer]');
    if (origin && !origin.disabled && open(origin.dataset.viewer, origin)) event.preventDefault();
  });
  listen(dialog, 'click', event => {
    const control = event.target.closest?.('[data-action]');
    if (control && !control.disabled) actions[control.dataset.action]?.();
  });
  listen(find('.viewer-retry'), 'click', load);
  listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
  // Native close events are queued: an earlier close may arrive after reopen.
  listen(dialog, 'close', () => { if (!dialog.open && scrollLocked) cleanup(); });
  listen(document, 'keydown', event => {
    if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    const keys = { ArrowLeft: 'previous', ArrowRight: 'next', '+': 'plus', '=': 'plus', '-': 'minus', '0': 'reset', Escape: 'close' };
    if (keys[event.key]) { event.preventDefault(); event.stopPropagation(); actions[keys[event.key]](); }
  }, { capture: true });
  const localPoint = event => {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  listen(stage, 'wheel', event => {
    if (!ready) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.height : 1);
    zoom(transform.scale * Math.exp(-delta * 0.0018), localPoint(event));
  }, { passive: false });
  listen(stage, 'dblclick', event => {
    if (event.target.closest('button, a')) return;
    event.preventDefault(); actions.reset();
  });
  listen(stage, 'pointerdown', event => {
    if (!ready || event.target.closest('button, a') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointers.set(event.pointerId, localPoint(event));
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('viewer-is-dragging');
  });
  listen(stage, 'pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const before = [...pointers.values()].slice(0, 2);
    const previous = pointers.get(event.pointerId);
    const point = localPoint(event);
    pointers.set(event.pointerId, point);
    if (pointers.size > 1) transform = pinchBetween(transform, before, [...pointers.values()].slice(0, 2), viewport, base);
    else transform = constrain({ ...transform, x: transform.x + point.x - previous.x, y: transform.y + point.y - previous.y }, viewport, base);
    draw();
  });
  const releasePointer = event => {
    pointers.delete(event.pointerId);
    if (!pointers.size) stage.classList.remove('viewer-is-dragging');
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(stage, type, releasePointer);
  listen(document, 'fullscreenchange', () => {
    if (document.fullscreenElement !== fullscreenTarget) ownsFullscreen = false;
    updateFullscreenControl();
    measure();
  });
  const observer = new ResizeObserver(measure);
  observer.observe(stage);
  const api = { open, close, destroy() {
    close(); destroyed = true; ++generation;
    abort.abort(); observer.disconnect(); dialog.remove();
    if (activeViewer === api) activeViewer = null;
  } };
  activeViewer = api;
  return api;
}
