import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import * as Cordis from '@deepseek-ai/cordis'
import * as currentSlots from 'dsh-slots-current'
import * as legacySlots from 'dsh-slots-legacy'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

const require = createRequire(import.meta.url)
const SOURCE = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const RENDERER = fs.readFileSync(require.resolve('dsh-renderer-current/client'), 'utf8')
const STORAGE_KEY = 'dsh_settings_drawer_config_v2'
const KEYS = ['settings.section', 'settings.plugins.tab', 'plugins.item']
const plain = (value) => JSON.parse(JSON.stringify(value))

async function harness(t, { coreModule = currentSlots, saved, blockedStorage = false } = {}) {
  const storage = new Map(saved === undefined ? [] : [[STORAGE_KEY, typeof saved === 'string' ? saved : JSON.stringify(saved)]])
  const events = new Map()
  const window = {
    addEventListener(name, fn) {
      if (!events.has(name)) events.set(name, new Set())
      events.get(name).add(fn)
    },
    removeEventListener(name, fn) { events.get(name)?.delete(fn) },
    dispatchEvent(event) { for (const fn of [...(events.get(event.type) || [])]) fn(event) },
  }
  const localStorage = {
    getItem(key) { return storage.get(key) ?? null },
    setItem(key, value) {
      if (blockedStorage) throw new Error('Storage is blocked')
      storage.set(key, value)
    },
  }
  let factory
  const loader = { load(row) { factory = row.factory } }
  vm.runInNewContext(RENDERER, { window: { __ModuleLoader__: loader }, queueMicrotask, console })
  const { SlotRegistry } = factory((name) => {
    if (name === '@deepseek-ai/cordis') return Cordis
    if (name === '@deepseek-ai/dsh-client-ui-slots') return coreModule
    if (name === 'react-dom' || name === 'react-dom/client') return {}
    return require(name)
  })
  const root = new Cordis.Context()
  const registry = new SlotRegistry(root)
  const core = registry._core
  const noop = () => null
  core.register({ name: 'root', children: Object.fromEntries([...KEYS, 'unrelated'].map((key) => [key, { kind: 'list', scope: 'root' }])) }, noop)
  const register = (key, id, label = id) => core.register({ name: key, id, label }, noop)
  for (const id of ['general', 'models', 'plugins', 'agent-presets', 'account', 'dock', 'example-plugin']) register(KEYS[0], id)
  for (const id of ['all', 'example-tab']) register(KEYS[1], id)
  for (const id of ['shell', 'agent-loop', 'subagent', 'web-search', 'example-item']) register(KEYS[2], id)
  register('unrelated', 'example-plugin')
  vm.runInNewContext(SOURCE, {
    window: { ...window, __ModuleLoader__: loader }, localStorage, setInterval, clearInterval,
    // No document or MutationObserver: filtering must work independently of DOM/CSS.
  })
  const plugin = factory(require)
  let fiber, mounted
  const enable = async () => {
    fiber = root.plugin(plugin)
    await fiber
    await Promise.resolve()
  }
  const disable = async () => { await fiber.dispose(); await Promise.resolve() }
  await enable()
  const ids = (key = KEYS[0]) => registry.entries(key).map((entry) => entry.options.id)
  const mount = async () => {
    const manager = core.entries(KEYS[0]).find((entry) => entry.options.id === 'settings-drawer-manager').component
    await act(async () => { mounted = TestRenderer.create(React.createElement(manager)) })
    return mounted
  }
  const checkbox = (id, groupLabel = '设置栏目') => {
    const group = mounted.root.findAllByType('fieldset').find((node) => node.findByType('legend').children.join('') === groupLabel)
    assert.ok(group, `missing group ${groupLabel}`)
    const label = group.findAllByType('label').find((node) => node.findByType('span').children.join('').endsWith(`(${id})`))
    assert.ok(label, `missing row ${id}`)
    return label.findByType('input')
  }
  const toggle = async (id, checked, group) => {
    await act(async () => { checkbox(id, group).props.onChange({ target: { checked } }) })
  }
  const button = async (text) => {
    await act(async () => { mounted.root.findAllByType('button').find((node) => node.children.join('') === text).props.onClick() })
  }
  t.after(async () => {
    if (mounted) await act(async () => { mounted.unmount() })
    await root.fiber.dispose()
  })
  return { root, registry, core, storage, events, window, localStorage, ids, register, enable, disable, mount, checkbox, toggle, button }
}

for (const [version, coreModule] of [['0.2.0-rc.2', currentSlots], ['0.1.0-rc.7', legacySlots]]) {
  test(`${version} slot contract: accounts stay visible, saved section choices survive`, async (t) => {
    const app = await harness(t, { coreModule, saved: { enableDrawer: true, visibleCards: { models: false, 'example-plugin': true } } })
    assert.ok(app.ids().includes('account'))
    assert.ok(app.ids().includes('example-plugin'))
    assert.ok(!app.ids().includes('models'))
    assert.ok(app.ids().includes('settings-drawer-manager'))
    assert.deepEqual(app.ids('unrelated'), ['example-plugin'])
    await app.mount()
    assert.equal(app.checkbox('models').props.checked, false)
    const before = app.registry.getVersion(KEYS[0])
    await app.toggle('models', true)
    assert.ok(app.ids().includes('models'))
    assert.ok(app.registry.getVersion(KEYS[0]) > before)
    assert.equal(JSON.parse(app.storage.get(STORAGE_KEY)).visibleCards['example-plugin'], true)
  })

  test(`${version} slot contract: disabling and re-enabling restores the registry`, async (t) => {
    const app = await harness(t)
    await app.mount()
    await app.toggle('models', false)
    await act(async () => { await app.disable() })
    assert.ok(app.ids().includes('models'))
    assert.ok(app.ids().includes('example-plugin'))
    assert.ok(!app.ids().includes('settings-drawer-manager'))
    assert.equal(Object.hasOwn(app.registry, 'entries'), false)
    for (const listeners of app.events.values()) assert.equal(listeners.size, 0)
    for (const key of KEYS) assert.equal(app.core.records.get(key).listeners.size, 0)
    await app.enable()
    assert.ok(!app.ids().includes('models'))
    assert.equal(app.core.entries(KEYS[0]).filter((entry) => entry.options.id === 'settings-drawer-manager').length, 1)
  })
}

test('new plugin surfaces start visible and keep IDs separate from settings sections', async (t) => {
  const app = await harness(t)
  app.register(KEYS[0], 'shell')
  await app.mount()
  assert.ok(!app.ids().includes('shell'))
  assert.ok(app.ids(KEYS[2]).includes('shell'))
  await app.toggle('shell', true)
  await app.toggle('shell', false, '插件配置项')
  assert.ok(app.ids().includes('shell'))
  assert.ok(!app.ids(KEYS[2]).includes('shell'))
  await app.toggle('example-tab', false, '插件标签')
  assert.deepEqual(app.ids(KEYS[1]), ['all'])
  await app.toggle('all', false, '插件标签')
  assert.deepEqual(app.ids(KEYS[1]), [])
})

test('hiding extras protects current built-ins; reset and filter-off publish immediately', async (t) => {
  const app = await harness(t)
  const mounted = await app.mount()
  await app.toggle('example-plugin', true)
  await app.button('只显示核心项')
  assert.ok(app.ids().includes('account'))
  assert.ok(!app.ids().includes('example-plugin'))
  assert.deepEqual(app.ids(KEYS[1]), ['all'])
  assert.deepEqual(app.ids(KEYS[2]), ['shell', 'agent-loop', 'subagent', 'web-search'])
  await app.button('恢复默认')
  assert.ok(app.ids(KEYS[1]).includes('example-tab'))
  assert.ok(app.ids(KEYS[2]).includes('example-item'))
  const control = mounted.root.findAllByType('label').find((node) => node.children.includes('启用过滤'))
  await act(async () => { control.findByType('input').props.onChange({ target: { checked: false } }) })
  assert.ok(app.ids().includes('example-plugin'))
})

test('live registration updates the manager, and refresh preserves temporarily absent preferences', async (t) => {
  const app = await harness(t, { saved: { visibleCards: { returning: true } } })
  const mounted = await app.mount()
  let remove
  await act(async () => { remove = app.register(KEYS[0], 'returning') })
  assert.equal(app.checkbox('returning').props.checked, true)
  await act(async () => { remove() })
  assert.ok(!mounted.root.findAllByType('span').some((node) => node.children.join('').endsWith('(returning)')))
  await app.button('⟳')
  assert.equal(JSON.parse(app.storage.get(STORAGE_KEY)).visibleCards.returning, true)
  await act(async () => { app.register(KEYS[0], 'returning') })
  assert.ok(app.ids().includes('returning'))
})

test('browser storage events update all ledgers, while foreign storage events do not', async (t) => {
  const app = await harness(t)
  await app.mount()
  const next = { visibleCards: { models: false }, visiblePluginTabs: { all: false }, visiblePluginItems: { shell: false } }
  app.storage.set(STORAGE_KEY, JSON.stringify(next))
  await act(async () => { app.window.dispatchEvent({ type: 'storage', key: STORAGE_KEY, storageArea: {} }) })
  assert.ok(app.ids().includes('models'))
  await act(async () => { app.window.dispatchEvent({ type: 'storage', key: STORAGE_KEY, storageArea: app.localStorage }) })
  assert.ok(!app.ids().includes('models'))
  assert.ok(!app.ids(KEYS[1]).includes('all'))
  assert.ok(!app.ids(KEYS[2]).includes('shell'))
  await act(async () => { app.storage.delete(STORAGE_KEY); app.window.dispatchEvent({ type: 'storage', key: null }) })
  assert.ok(app.ids().includes('models'))
})

test('malformed or unavailable storage cannot hide the drawer or break changes', async (t) => {
  const app = await harness(t, { saved: 'null', blockedStorage: true })
  await app.mount()
  await app.toggle('models', false)
  assert.ok(!app.ids().includes('models'))
  assert.equal(app.checkbox('models').props.checked, false)
  assert.ok(app.ids().includes('settings-drawer-manager'))
})

test('unload respects a later wrapper and turns retained callbacks into passthroughs', async (t) => {
  const app = await harness(t)
  const drawerEntries = Object.getOwnPropertyDescriptor(app.registry, 'entries').value
  const later = function (key) { return drawerEntries.call(this, key) }
  Object.defineProperty(app.registry, 'entries', { configurable: true, writable: true, value: later })
  await app.disable()
  assert.equal(Object.getOwnPropertyDescriptor(app.registry, 'entries').value, later)
  assert.ok(app.ids().includes('example-plugin'))
  await app.enable()
  await app.disable()
  assert.equal(Object.getOwnPropertyDescriptor(app.registry, 'entries').value, later)
  assert.ok(app.ids().includes('example-plugin'))
})

test('filtered snapshots are stable between changes and the raw registry is unchanged', async (t) => {
  const app = await harness(t)
  assert.equal(app.registry.entries(KEYS[0]), app.registry.entries(KEYS[0]))
  assert.ok(app.core.entries(KEYS[0]).some((entry) => entry.options.id === 'example-plugin'))
  await app.mount()
  const snapshot = app.registry.entries(KEYS[0])
  await app.toggle('example-plugin', true)
  assert.notEqual(app.registry.entries(KEYS[0]), snapshot)
  assert.deepEqual(plain(app.registry.entries(KEYS[0])).map((entry) => entry.options.id), app.ids())
})
