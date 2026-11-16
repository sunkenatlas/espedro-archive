import test from 'node:test';
import assert from 'node:assert/strict';
import { fitImage, constrain, zoomAt, pinchBetween, entityImages } from '../src/viewer-math.js';
import { initViewer } from '../src/viewer.js';

const viewport = { width: 1000, height: 700 };
const image = { width: 900, height: 600 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('portrait evidence fits without cropping or changing its ratio', () => {
  const size = fitImage({ width: 343, height: 420 }, { width: 1200, height: 2000 });
  near(size.width / size.height, 0.6);
  assert.equal(size.height, 420);
  assert.ok(size.width <= 343);
});

test('wheel zoom holds the image location under the cursor still', () => {
  const before = { scale: 2, x: 70, y: -20 };
  const point = { x: 680, y: 410 };
  const after = zoomAt(before, 3, point, viewport, image);
  assert.equal(after.scale, 3);
  near((point.x - 500 - before.x) / before.scale, (point.x - 500 - after.x) / after.scale);
  near((point.y - 350 - before.y) / before.scale, (point.y - 350 - after.y) / after.scale);
});

test('zoom bounds and pan bounds keep a zoomed image in reach', () => {
  assert.deepEqual(constrain({ scale: 0.3, x: 400, y: -400 }, viewport, image), { scale: 1, x: 0, y: 0 });
  assert.deepEqual(constrain({ scale: 12, x: 9000, y: -9000 }, viewport, image), { scale: 8, x: 3100, y: -2050 });
});

test('two fingers can zoom and move their shared image anchor together', () => {
  const from = [{ x: 450, y: 350 }, { x: 550, y: 350 }];
  const to = [{ x: 470, y: 380 }, { x: 670, y: 380 }];
  assert.deepEqual(pinchBetween({ scale: 2, x: 0, y: 0 }, from, to, viewport, image), { scale: 4, x: 70, y: 30 });
});

test('a collapsed pinch distance does not introduce invalid transforms', () => {
  const same = [{ x: 10, y: 10 }, { x: 10, y: 10 }];
  const state = { scale: 2, x: 10, y: 20 };
  assert.deepEqual(pinchBetween(state, same, same, viewport, image), state);
});

test('navigation stays within the selected entity and puts its primary first', () => {
  const records = [
    { id: 'b', entityId: 'EA-001', primary: false, version: 2 },
    { id: 'other', entityId: 'EA-002', primary: true, version: 1 },
    { id: 'a', entityId: 'EA-001', primary: true, version: 1 },
  ];
  assert.deepEqual(entityImages(records, 'b').map(item => item.id), ['a', 'b']);
  assert.deepEqual(records.map(item => item.id), ['b', 'other', 'a']);
  assert.deepEqual(entityImages(records, 'unknown'), []);
});

// Only browser/platform boundaries are simulated. Tests run the real viewer controller.
function viewerHarness(t, images = [{ id: 'ea-001-01', entityId: 'EA-001', primary: true, width: 900, height: 600, display: 'display.jpg', original: 'original.png' }]) {
  class Node {
    constructor(tag = '') {
      this.tagName = tag.toUpperCase(); this.style = { overflow: '' }; this.nodes = new Map();
      this.listeners = new Map(); this.attributes = new Map(); this.isConnected = true;
      this.clientWidth = 1000; this.clientHeight = 700; this.naturalWidth = 900; this.naturalHeight = 600;
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    addEventListener(type, callback, { signal } = {}) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push({ callback, signal });
    }
    fire(type, event = {}) {
      for (const { callback, signal } of this.listeners.get(type) || []) if (!signal?.aborted) callback(event);
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Node()); return this.nodes.get(selector); }
    querySelectorAll() { return []; }
    append(node) { this.child = node; }
    prepend(node) { this.child = node; }
    remove() { this.isConnected = false; }
    focus() { doc.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; closeEvents.push(() => this.fire('close')); }
  }
  const closeEvents = [];
  const doc = new Node(); doc.documentElement = new Node('html'); doc.body = new Node('body');
  doc.fullscreenEnabled = true; doc.fullscreenElement = null;
  const calls = { requests: [], exits: 0 };
  const enter = async function () { calls.requests.push(this); doc.fullscreenElement = this; doc.fire('fullscreenchange'); };
  doc.documentElement.requestFullscreen = enter;
  doc.exitFullscreen = async () => { calls.exits++; doc.fullscreenElement = null; doc.fire('fullscreenchange'); };
  doc.createElement = tag => {
    const node = new Node(tag);
    if (tag === 'dialog') node.requestFullscreen = async () => { throw new TypeError('Dialog cannot be fullscreen'); };
    return node;
  };
  const previous = { document: globalThis.document, HTMLElement: globalThis.HTMLElement, ResizeObserver: globalThis.ResizeObserver };
  globalThis.document = doc; globalThis.HTMLElement = Node;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  const api = initViewer(images);
  const dialog = doc.body.child;
  const clickFullscreen = () => dialog.fire('click', { target: { closest: () => ({ dataset: { action: 'fullscreen' } }) } });
  t.after(() => { api.destroy(); Object.assign(globalThis, previous); });
  return { api, doc, dialog, calls, clickFullscreen, flushClose: () => closeEvents.splice(0).forEach(event => event()), Node };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('fullscreen targets the document root and exits only the session it entered', async t => {
  const { api, doc, dialog, calls, clickFullscreen } = viewerHarness(t);
  api.open('ea-001-01'); clickFullscreen(); await settle();
  assert.equal(calls.requests.length, 1);
  assert.equal(calls.requests[0], doc.documentElement);
  assert.equal(doc.fullscreenElement, doc.documentElement);
  assert.equal(dialog.querySelector('[data-action="fullscreen"]').attributes.get('aria-label'), '退出全屏查看');
  api.close();
  assert.equal(calls.exits, 1);
});

test('existing fullscreen on the root or another element is never acquired or exited', async t => {
  const { api, doc, calls, clickFullscreen, Node } = viewerHarness(t);
  for (const existing of [doc.documentElement, new Node('video')]) {
    doc.fullscreenElement = existing;
    api.open('ea-001-01'); clickFullscreen(); await settle(); api.close();
    assert.equal(doc.fullscreenElement, existing);
  }
  assert.equal(calls.requests.length, 0);
  assert.equal(calls.exits, 0);
});

test('a queued close from an older opening cannot unlock or invalidate a reopened image', t => {
  const { api, doc, dialog, flushClose } = viewerHarness(t);
  api.open('ea-001-01'); api.close(); api.open('ea-001-01');
  const image = dialog.querySelector('.viewer-stage').child;
  flushClose(); image.onload();
  assert.equal(dialog.open, true);
  assert.equal(doc.documentElement.style.overflow, 'hidden');
  assert.equal(image.hidden, false);
  assert.equal(dialog.querySelector('.viewer-stage').attributes.get('aria-busy'), 'false');
});

test('navigation moves focus off its disabled end button and body fallback keys remain scoped to the open viewer', t => {
  const images = [
    { id: 'ea-002-01', entityId: 'EA-002', primary: true, width: 900, height: 600, display: 'first.jpg', original: 'first.png' },
    { id: 'ea-002-02', entityId: 'EA-002', primary: false, width: 900, height: 600, display: 'second.jpg', original: 'second.png' },
  ];
  const { api: viewer, doc, dialog: modal } = viewerHarness(t, images);
  viewer.open('ea-002-01');
  const next = modal.querySelector('[data-action="next"]');
  next.dataset = { action: 'next' };
  next.focus();
  modal.fire('click', { target: { closest: () => next } });
  assert.equal(next.disabled, true);
  assert.equal(doc.activeElement, modal.querySelector('.viewer-stage'));

  // Some native engines move focus to body as a focused button becomes disabled.
  doc.activeElement = doc.body;
  let prevented = 0, stopped = 0;
  const key = { key: 'ArrowLeft', target: doc.body, preventDefault: () => prevented++, stopPropagation: () => stopped++ };
  doc.fire('keydown', key);
  assert.equal(modal.querySelector('.viewer-count').textContent, '1 / 2');
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  viewer.close();
  doc.fire('keydown', { ...key, key: 'ArrowRight' });
  assert.equal(modal.querySelector('.viewer-count').textContent, '1 / 2');
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
});
