import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { notFoundPage, aboutPage } from '../src/templates.mjs';

function recoveryAt(html, url) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const scripts = [...head.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter(match => !/\bsrc=/.test(match[0]));
  assert.ok(scripts.length, '404 must establish its base before resources load');
  assert.ok(head.indexOf(scripts[0][0]) < head.indexOf('<link'), 'base must precede the first fetched asset');
  const requested = new URL(url, 'https://archive.example');
  const skipLink = { href: '#main' }, listeners = new Map();
  let baseURL = requested;
  const document = {
    createElement: tagName => ({ tagName }),
    head: { append: element => { assert.equal(element.tagName, 'base'); baseURL = new URL(element.href, requested); } },
    addEventListener: (type, callback) => listeners.set(type, callback),
    querySelector: selector => selector === '.skip-link' ? skipLink : null,
  };
  for (const [, script] of scripts) vm.runInNewContext(script, { document, location: requested, URL });
  listeners.get('DOMContentLoaded')?.();
  return { baseURL, requested, skipLink };
}

for (const [configured, prefix] of [['/', '/'], ['/espedro-archive', '/espedro-archive/'], ['/archive%20notes/', '/archive%20notes/']]) {
  test(`404 fallback keeps assets and recovery links inside ${prefix} at every path depth`, () => {
    const html = notFoundPage(configured);
    for (const suffix of ['404.html', 'missing.html', 'entries/missing.html', 'a/b/c', 'entries/', 'a/b/']) {
      const { baseURL, requested } = recoveryAt(html, `${prefix}${suffix}`);
      for (const [, resource] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
        if (resource === '#main') continue;
        assert.equal(new URL(resource, baseURL).href, new URL(`${prefix}${resource}`, requested).href, `${requested.pathname}: ${resource}`);
      }
    }
  });

  test(`404 skip link preserves the requested URL for ${prefix}`, () => {
    for (const suffix of ['404.html?q=missing', 'entries/missing.html?view=index&q=test#old', 'a/b/?q=%E4%BD%99%E6%95%B0']) {
      const { baseURL, requested, skipLink } = recoveryAt(notFoundPage(configured), `${prefix}${suffix}`);
      assert.equal(new URL(skipLink.href, baseURL).href, new URL('#main', requested).href);
    }
  });
}

test('a project build keeps root previews usable and requires a complete project prefix', () => {
  for (const pathname of ['/404.html', '/entries/missing.html', '/a/b/', '/espedro-archive-other/entries/missing.html']) {
    const { baseURL, requested } = recoveryAt(notFoundPage('/espedro-archive/'), pathname);
    assert.equal(new URL('assets/app.js', baseURL).href, new URL('/assets/app.js', requested).href);
  }
  assert.doesNotMatch(aboutPage(), /<base\b|document\.createElement\(['"]base/);
});

const css = await readFile(new URL('../src/site.css', import.meta.url), 'utf8');
test('anchor spacing has one shared offset without additive section margins', () => {
  assert.match(css, /:root\s*\{[^}]*--anchor-offset:\s*112px/s);
  assert.match(css, /@media\(max-width:600px\)\s*\{\s*:root\s*\{[^}]*--anchor-offset:\s*145px/s);
  assert.match(css, /html\s*\{[^}]*scroll-padding-top:\s*var\(--anchor-offset\)/);
  const margins = [...css.matchAll(/scroll-margin-top:\s*([^;}]+)/g)].map(match => match[1].trim());
  assert.ok(margins.length);
  assert.ok(margins.every(value => value === '0'), `additive scroll margins: ${margins}`);
});

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const updateScroll = app.slice(app.indexOf('function updateScroll(){'), app.indexOf('function queueScroll()'));
for (const [name, offset, height] of [['mobile', 145, 667], ['desktop', 112, 1200]]) {
  test(`${name} TOC selects the aligned section without selecting the following heading`, () => {
    const positions = [-500, offset, offset + 80];
    const sections = positions.map((top, index) => ({ id: `section-${index}`, getBoundingClientRect: () => ({ top, bottom: top + 500 }) }));
    const toc = sections.map(section => ({ hash: `#${section.id}`, classList: { toggle() {} }, setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; } }));
    vm.runInNewContext(`${updateScroll}\nupdateScroll();`, {
      sections, toc, meter: null, hero: null, scrollQueued: false,
      window: { scrollY: 1000, innerHeight: height }, document: { documentElement: {}, getElementById: () => null },
      getComputedStyle: () => ({ getPropertyValue: name => name === '--anchor-offset' ? `${offset}px` : '' }),
    });
    assert.deepEqual(toc.filter(link => link['aria-current']).map(link => link.hash), ['#section-1']);
  });
}
