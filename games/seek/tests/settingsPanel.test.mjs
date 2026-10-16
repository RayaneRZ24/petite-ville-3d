import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('panneau : ouverture, fermeture, attributs accessibles, Échap et retour du focus', () => {
  const nodes = new Map();
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { inert: id === 'controls', attrs: {}, events: {},
      classList: { toggle(name, value) { this[name] = value; } },
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute(name, value) { this.attrs[name] = value; },
      focus() { document.activeElement = this; } });
    return nodes.get(id);
  } };
  const context = vm.createContext({ document });
  vm.runInContext(readFileSync(new URL('../settingsPanel.js', import.meta.url), 'utf8'), context);
  vm.runInContext('bindSettingsPanel(document)', context);
  const panel = nodes.get('controls'), toggle = nodes.get('settings-toggle'), close = nodes.get('settings-close');
  toggle.events.click();
  assert.equal(panel.inert, false); assert.equal(panel.attrs['aria-hidden'], 'false');
  assert.equal(toggle.attrs['aria-expanded'], 'true'); assert.equal(document.activeElement, close);
  assert.equal(nodes.get('settings-backdrop').hidden, false);
  let prevented = false;
  panel.events.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.ok(prevented); assert.equal(panel.inert, true); assert.equal(document.activeElement, toggle);
  assert.equal(nodes.get('settings-backdrop').hidden, true);
  toggle.events.click(); close.events.click(); assert.equal(panel.inert, true);
  toggle.events.click(); nodes.get('settings-backdrop').events.click(); assert.equal(panel.inert, true);
  toggle.events.click();
  const last = { getClientRects: () => [1], focus() { document.activeElement = this; } };
  close.getClientRects = () => [1];
  panel.querySelectorAll = () => [close, last];
  panel.events.keydown({ key: 'Tab', shiftKey: true, preventDefault() {} });
  assert.equal(document.activeElement, last);
  panel.events.keydown({ key: 'Tab', shiftKey: false, preventDefault() {} });
  assert.equal(document.activeElement, close);
});
