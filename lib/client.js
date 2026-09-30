// Filter the settings ledgers, rather than build-specific CSS class names.
window.__ModuleLoader__.load({ id: 'dsh-settings-drawer', factory: (require) => {
  const React = require('react')
  const h = React.createElement
  const STORAGE_KEY = 'dsh_settings_drawer_config_v2'
  const MANAGER_ID = 'settings-drawer-manager'
  const CORE_IDS = new Set(['general', 'models', 'plugins', 'agent-presets', 'account', MANAGER_ID])
  const KNOWN_DEFAULTS = { dock: true, 'dsh-prompt': true }
  const GROUPS = [
    { key: 'settings.section', field: 'visibleCards', label: '设置栏目', core: CORE_IDS },
    { key: 'settings.plugins.tab', field: 'visiblePluginTabs', label: '插件标签', core: new Set(['all']) },
    { key: 'plugins.item', field: 'visiblePluginItems', label: '插件配置项', core: new Set(['shell', 'agent-loop', 'subagent', 'web-search']) },
  ]

  function defaultConfig() {
    return { enableDrawer: true, visibleCards: {}, visiblePluginTabs: {}, visiblePluginItems: {} }
  }

  function getSavedConfig() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (!parsed || typeof parsed !== 'object') return defaultConfig()
      const cfg = { enableDrawer: parsed.enableDrawer !== false }
      for (const group of GROUPS) {
        const saved = parsed[group.field]
        cfg[group.field] = saved && typeof saved === 'object' && !Array.isArray(saved)
          ? Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === 'boolean'))
          : {}
      }
      return cfg
    } catch {
      return defaultConfig()
    }
  }

  function defaultVisible(group, id) {
    if (group.core.has(id)) return true
    // New plugin surfaces start visible; upgrading must not hide built-in tools.
    if (group.key !== 'settings.section') return true
    return Object.prototype.hasOwnProperty.call(KNOWN_DEFAULTS, id) && KNOWN_DEFAULTS[id]
  }

  function shouldKeep(group, id, cfg) {
    if (!id || id === MANAGER_ID || !cfg.enableDrawer) return true
    const saved = cfg[group.field]
    return Object.prototype.hasOwnProperty.call(saved, id) ? saved[id] : defaultVisible(group, id)
  }

  function resolveLabel(label) {
    try {
      return String((typeof label === 'function' ? label() : label) || '')
    } catch {
      return ''
    }
  }

  function getSlotCore(slots) {
    return slots._core || slots.core || (slots.records ? slots : null)
  }

  function notifyLedgers(slots) {
    const core = getSlotCore(slots)
    for (const group of GROUPS) {
      const record = core?.records?.get(group.key)
      if (!record) continue
      if (typeof core.markDirty === 'function') {
        core.markDirty(group.key, record)
      } else {
        record.version = (record.version || 0) + 1
        for (const listener of [...(record.listeners || [])]) listener()
      }
    }
  }

  function createRuntime(ctx, slots) {
    let cfg = getSavedConfig()
    let revision = 0
    let active = true
    const listeners = new Set()
    const subscriptions = new Set()
    const cached = new Map()
    const descriptor = Object.getOwnPropertyDescriptor(slots, 'entries')
    const original = slots.entries.bind(slots)
    const rawEntries = (key) => original(key)
    function filteredEntries(key) {
      const list = rawEntries(key)
      const group = GROUPS.find((item) => item.key === key)
      if (!active || !group || !cfg.enableDrawer) return list
      const previous = cached.get(key)
      if (previous?.list === list && previous.revision === revision) return previous.filtered
      const filtered = list.filter((entry) => shouldKeep(group, entry.options?.id, cfg))
      cached.set(key, { list, revision, filtered })
      return filtered
    }
    Object.defineProperty(slots, 'entries', { configurable: true, writable: true, value: filteredEntries })

    function publish(next) {
      if (!active) return
      cfg = next
      revision += 1
      cached.clear()
      notifyLedgers(slots)
      for (const listener of [...listeners]) listener()
    }

    function save(next) {
      // Keep the current page usable even when browser storage is unavailable.
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      publish(next)
    }

    function rows(group) {
      const ids = new Set()
      return rawEntries(group.key).flatMap((entry) => {
        const id = entry.options?.id
        if (!id || id === MANAGER_ID || ids.has(id)) return []
        ids.add(id)
        return [{ id, label: resolveLabel(entry.options.label) || id, order: entry.options.order || 0 }]
      }).sort((a, b) => a.order - b.order)
    }

    const storageChanged = (event) => {
      if ((event.key === STORAGE_KEY || event.key === null) && (!event.storageArea || event.storageArea === localStorage)) {
        publish(getSavedConfig())
      }
    }
    const configChanged = () => publish(getSavedConfig())
    window.addEventListener('storage', storageChanged)
    window.addEventListener('dsh-settings-drawer-updated', configChanged)

    ctx.effect(() => () => {
      active = false
      window.removeEventListener('storage', storageChanged)
      window.removeEventListener('dsh-settings-drawer-updated', configChanged)
      listeners.clear()
      for (const off of [...subscriptions]) off()
      cached.clear()
      // Do not overwrite another plugin's subsequently installed wrapper.
      if (Object.getOwnPropertyDescriptor(slots, 'entries')?.value === filteredEntries) {
        if (descriptor) Object.defineProperty(slots, 'entries', descriptor)
        else delete slots.entries
      }
      notifyLedgers(slots)
    }, 'settings-drawer: restore ledgers and release listeners')

    return {
      config: () => cfg,
      rows,
      save,
      listen(listener) {
        if (!active) return () => {}
        listeners.add(listener)
        const offs = []
        let timer
        if (typeof slots.subscribe === 'function') {
          for (const group of GROUPS) offs.push(slots.subscribe(group.key, listener))
        } else {
          timer = setInterval(listener, 1000)
        }
        const locale = ctx.get('locale')
        if (locale && typeof locale.subscribe === 'function') offs.push(locale.subscribe(listener))
        let stopped = false
        const stop = () => {
          if (stopped) return
          stopped = true
          subscriptions.delete(stop)
          listeners.delete(listener)
          for (const off of offs) off()
          if (timer !== undefined) clearInterval(timer)
        }
        subscriptions.add(stop)
        return stop
      },
    }
  }

  const buttonStyle = {
    background: 'none', border: '1px solid var(--dsw-alias-border-l2, #444)',
    borderRadius: '6px', color: 'var(--dsw-alias-label-secondary, #ccc)',
    padding: '4px 10px', cursor: 'pointer', fontSize: '12px',
  }

  function ManagerCard({ runtime }) {
    const read = () => ({ cfg: runtime.config(), groups: GROUPS.map((group) => ({ group, rows: runtime.rows(group) })) })
    const [view, setView] = React.useState(read)
    const refresh = () => setView(read())
    React.useEffect(() => {
      const off = runtime.listen(refresh)
      refresh()
      return off
    }, [runtime])
    const { cfg, groups } = view
    const toggleCard = (group, id, checked) => {
      const current = runtime.config()
      runtime.save({ ...current, [group.field]: { ...current[group.field], [id]: checked } })
    }
    const hideExtras = () => {
      const current = runtime.config()
      const next = { ...current, enableDrawer: true }
      for (const group of GROUPS) {
        next[group.field] = { ...current[group.field] }
        for (const row of runtime.rows(group)) next[group.field][row.id] = group.core.has(row.id)
      }
      runtime.save(next)
    }

    return h('div', {
      style: {
        border: '1px solid var(--dsw-alias-border-l2, #333)', borderRadius: '12px', padding: '16px',
        background: 'var(--dsw-alias-bg-layer-2, rgba(255,255,255,0.03))',
        display: 'flex', flexDirection: 'column', gap: '12px',
      },
    }, [
      h('div', { key: 'head', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } }, [
        h('strong', { key: 'title' }, '设置抽屉'),
        h('div', { key: 'actions', style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
          h('button', { key: 'refresh', type: 'button', onClick: refresh, title: '刷新设置栏目列表', 'aria-label': '刷新设置栏目列表', style: buttonStyle }, '⟳'),
          h('label', { key: 'toggle', style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' } }, [
            h('input', { key: 'input', type: 'checkbox', checked: cfg.enableDrawer, onChange: (event) => runtime.save({ ...runtime.config(), enableDrawer: event.target.checked }) }),
            '启用过滤',
          ]),
        ]),
      ]),
      h('div', { key: 'description', style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #aaa)', lineHeight: '1.5' } },
        '选择要显示的设置栏目、插件标签与插件配置项。通用、模型、插件、Agent Presets 和账户默认保留，修改立即生效。隐藏配置入口不会禁用对应插件。'),
      cfg.enableDrawer && groups.filter(({ rows }) => rows.length).map(({ group, rows }) => h('fieldset', {
        key: group.key, style: { border: 'none', padding: 0, margin: 0, minWidth: 0 },
      }, [
        h('legend', { key: 'label', style: { fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' } }, group.label),
        h('div', { key: 'rows', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '8px' } }, rows.map((row) => {
          const visible = shouldKeep(group, row.id, cfg)
          return h('label', {
            key: row.id, style: {
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px',
              border: '1px solid var(--dsw-alias-border-l2, #333)',
              background: visible ? 'var(--dsw-alias-bg-layer-3, rgba(255,255,255,0.05))' : 'transparent',
              opacity: visible ? 1 : 0.55, cursor: 'pointer', fontSize: '12.5px', overflowWrap: 'anywhere',
            },
          }, [
            h('input', { key: 'input', type: 'checkbox', checked: visible, onChange: (event) => toggleCard(group, row.id, event.target.checked) }),
            h('span', { key: 'label' }, `${row.label} (${row.id})`),
          ])
        })),
      ])),
      h('div', { key: 'foot', style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' } }, [
        h('button', { key: 'hide', type: 'button', onClick: hideExtras, style: buttonStyle }, '只显示核心项'),
        h('button', { key: 'reset', type: 'button', onClick: () => runtime.save(defaultConfig()), style: buttonStyle }, '恢复默认'),
      ]),
    ])
  }

  const inject = ['slots']
  function apply(ctx) {
    const slots = ctx.get('slots')
    if (!slots || typeof slots.entries !== 'function') return
    const runtime = createRuntime(ctx, slots)
    const Drawer = () => h(ManagerCard, { runtime })
    slots.inject('settings.section', () => slots.register({
      name: 'settings.section', id: MANAGER_ID, order: -100, label: () => '设置抽屉',
    }, Drawer))
    notifyLedgers(slots)
  }

  return { inject, apply }
} })
