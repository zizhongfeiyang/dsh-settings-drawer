// Browser client half of dsh-settings-cleaner
// Settings is a left-nav list of `settings.section` entries, not CSS cards.
// Hide by filtering SlotCore.entries('settings.section').
window.__ModuleLoader__.load({ id: 'dsh-settings-cleaner', factory: (require) => {
  var module = { exports: {} }; var exports = module.exports;

  const React = require('react')
  const h = React.createElement

  const STORAGE_KEY = 'dsh_settings_cleaner_config_v2'

  // Built-in / core pages: keep visible by default and do not let "hide all extras" wipe them.
  const CORE_IDS = new Set([
    'general',
    'models',
    'plugins',
    'agent-presets',
    'settings-cleaner-manager',
  ])

  const KNOWN_CARDS = [
    { id: 'general', label: '通用 (general)', defaultShow: true, core: true },
    { id: 'models', label: '模型 (models)', defaultShow: true, core: true },
    { id: 'plugins', label: '插件 (plugins)', defaultShow: true, core: true },
    { id: 'agent-presets', label: 'Agent Presets (agent-presets)', defaultShow: true, core: true },
    { id: 'dock', label: 'Skills 与 MCP (dock)', defaultShow: true },
    { id: 'dsh-prompt', label: '自定义系统提示词 (dsh-prompt)', defaultShow: true },
    { id: 'easy-vision', label: '视觉快配 (easy-vision)', defaultShow: false },
    { id: 'easy-persona', label: '人设编辑 (easy-persona)', defaultShow: false },
    { id: 'easy-migration', label: '迁移助手 (easy-migration)', defaultShow: false },
    { id: 'tool-vision', label: '视觉工具 (tool-vision)', defaultShow: false },
    { id: 'soul-md', label: 'Soul.md (soul-md)', defaultShow: false },
    { id: 'tdai-memory', label: '长期记忆 (tdai-memory)', defaultShow: false },
    { id: 'font-custom', label: '界面字体设置 (font-custom)', defaultShow: false },
    { id: 'dsh-side-session', label: '侧边临时会话 (dsh-side-session)', defaultShow: false },
    { id: 'auto-compact', label: '自动压缩上下文 (auto-compact)', defaultShow: false },
    { id: 'change-review', label: '改动审查/核对 (change-review)', defaultShow: false },
    { id: 'plugin-shield', label: '插件安全防护 (plugin-shield)', defaultShow: false },
    { id: 'dsh-session-manager', label: '归档对话管理 (dsh-session-manager)', defaultShow: false },
    { id: 'session-manager', label: 'Zat 对话管理 (session-manager)', defaultShow: false },
    { id: 'dsh-third-party-thinking', label: '第三方思考流 (dsh-third-party-thinking)', defaultShow: false },
    { id: 'openclaw-bridge', label: 'OpenClaw 桥接 (openclaw-bridge)', defaultShow: false },
    { id: 'dsh-undo', label: '配置快照回滚 (dsh-undo)', defaultShow: false },
    { id: 'better-sidebar', label: '侧栏增强 (better-sidebar)', defaultShow: false },
  ]

  function resolveLabel(label) {
    try {
      if (typeof label === 'function') return String(label() || '')
      if (label == null) return ''
      return String(label)
    } catch {
      return ''
    }
  }

  function defaultVisibleFor(id) {
    const known = KNOWN_CARDS.find((c) => c.id === id)
    if (known) return known.defaultShow
    if (CORE_IDS.has(id)) return true
    return false
  }

  function defaultConfig() {
    const cfg = { enableCleaner: true, visibleCards: {} }
    KNOWN_CARDS.forEach((c) => { cfg.visibleCards[c.id] = c.defaultShow })
    return cfg
  }

  function getSavedConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          enableCleaner: parsed.enableCleaner !== false,
          visibleCards: parsed.visibleCards && typeof parsed.visibleCards === 'object' ? parsed.visibleCards : {},
        }
      }
    } catch (e) {}
    return defaultConfig()
  }

  function getSlotCore(slots) {
    if (!slots) return null
    return slots._core || slots.core || (slots.records ? slots : null)
  }

  function hiddenIds(cfg) {
    const hidden = []
    const seen = new Set()
    const consider = (cardId) => {
      if (!cardId || seen.has(cardId) || cardId === 'settings-cleaner-manager') return
      seen.add(cardId)
      if (!shouldKeep(cardId, cfg)) hidden.push(cardId)
    }
    KNOWN_CARDS.forEach((c) => consider(c.id))
    Object.keys(cfg.visibleCards || {}).forEach(consider)
    return hidden
  }

  function applyNavStyle(cfg) {
    const id = 'dsh-settings-drawer-style'
    let styleEl = document.getElementById(id)
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = id
      document.head.appendChild(styleEl)
    }
    if (!cfg.enableCleaner) {
      styleEl.textContent = ''
      return
    }
    const hidden = hiddenIds(cfg)
    styleEl.textContent = hidden.map((sid) => (
      `.VOzbGW_navList button.VOzbGW_navCell[data-dsh-section-id="${sid}"]{display:none!important}`
    )).join('\n')
  }

  function stampNavButtons() {
    const slots = window.__dshSettingsCleanerSlots
    const core = getSlotCore(slots)
    const raw = core && typeof core.entries === 'function' ? core.entries('settings.section') : []
    const byLabel = new Map()
    raw.forEach((e) => {
      const sid = e && e.options && e.options.id
      const label = resolveLabel(e && e.options && e.options.label)
      if (sid && label) byLabel.set(label, sid)
    })
    document.querySelectorAll('.VOzbGW_navList button.VOzbGW_navCell').forEach((btn) => {
      const label = (btn.querySelector('.VOzbGW_navLabel')?.textContent || '').trim()
      const sid = byLabel.get(label)
      if (sid) btn.setAttribute('data-dsh-section-id', sid)
    })
  }

  function notifySettingsNav() {
    const slots = window.__dshSettingsCleanerSlots
    const core = getSlotCore(slots)
    try {
      if (core && typeof core.markDirty === 'function' && core.records) {
        const rec = core.records.get('settings.section')
        if (rec) core.markDirty('settings.section', rec)
      } else if (core && core.records) {
        const rec = core.records.get('settings.section')
        if (rec) {
          rec.version = (rec.version || 0) + 1
          if (rec.listeners) for (const fn of [...rec.listeners]) {
            try { fn() } catch {}
          }
        }
      }
    } catch {}
    stampNavButtons()
    applyNavStyle(getSavedConfig())
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
      window.dispatchEvent(new CustomEvent('dsh-settings-cleaner-updated', { detail: cfg }))
    } catch (e) {}
    notifySettingsNav()
  }

  function shouldKeep(id, cfg) {
    if (!id) return true
    if (id === 'settings-cleaner-manager') return true
    if (!cfg.enableCleaner) return true
    if (Object.prototype.hasOwnProperty.call(cfg.visibleCards, id)) {
      return cfg.visibleCards[id] !== false
    }
    return defaultVisibleFor(id)
  }

  function ManagerCard() {
    const [cfg, setCfg] = React.useState(getSavedConfig)
    const [liveRows, setLiveRows] = React.useState([])

    React.useEffect(() => {
      const slots = window.__dshSettingsCleanerSlots
      const refresh = () => {
        try {
          const raw = slots && typeof slots.entries === 'function'
            ? (slots.__dshSettingsCleanerRawEntries || slots.entries).call(slots, 'settings.section')
            : []
          const rows = (raw || [])
            .map((e) => ({
              id: e && e.options && e.options.id,
              label: resolveLabel(e && e.options && e.options.label),
              order: (e && e.options && e.options.order) || 0,
            }))
            .filter((r) => r.id && r.id !== 'settings-cleaner-manager')
            .sort((a, b) => a.order - b.order)
          setLiveRows(rows)
        } catch {
          setLiveRows([])
        }
      }
      refresh()
      notifySettingsNav()
      const timer = setInterval(() => {
        refresh()
        stampNavButtons()
        applyNavStyle(getSavedConfig())
      }, 400)
      window.addEventListener('dsh-settings-cleaner-updated', refresh)
      return () => {
        clearInterval(timer)
        window.removeEventListener('dsh-settings-cleaner-updated', refresh)
      }
    }, [])

    const catalog = (() => {
      const map = new Map()
      KNOWN_CARDS.forEach((c) => map.set(c.id, { ...c }))
      liveRows.forEach((r) => {
        if (!map.has(r.id)) {
          map.set(r.id, {
            id: r.id,
            label: r.label ? `${r.label} (${r.id})` : r.id,
            defaultShow: defaultVisibleFor(r.id),
            core: CORE_IDS.has(r.id),
          })
        } else if (r.label) {
          const prev = map.get(r.id)
          map.set(r.id, { ...prev, label: `${r.label} (${r.id})` })
        }
      })
      return Array.from(map.values())
    })()

    const toggleCleaner = (e) => {
      const next = { ...cfg, enableCleaner: e.target.checked }
      setCfg(next)
      saveConfig(next)
    }

    const toggleCard = (cardId, checked) => {
      const next = {
        ...cfg,
        visibleCards: {
          ...cfg.visibleCards,
          [cardId]: checked,
        },
      }
      setCfg(next)
      saveConfig(next)
    }

    const resetAll = () => {
      const next = defaultConfig()
      liveRows.forEach((r) => {
        if (!(r.id in next.visibleCards)) next.visibleCards[r.id] = defaultVisibleFor(r.id)
      })
      setCfg(next)
      saveConfig(next)
    }

    const hideAllExtras = () => {
      const next = { enableCleaner: true, visibleCards: { ...cfg.visibleCards } }
      catalog.forEach((c) => {
        next.visibleCards[c.id] = !!c.core || CORE_IDS.has(c.id)
      })
      setCfg(next)
      saveConfig(next)
    }

    return h('div', {
      style: {
        border: '1px solid var(--dsw-alias-border-l2, #333)',
        borderRadius: '12px',
        padding: '16px',
        background: 'var(--dsw-alias-bg-layer-2, rgba(255,255,255,0.03))',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }
    }, [
      h('div', { key: 'head', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
        h('div', { key: 'title', style: { fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' } }, [
          '设置抽屉',
          h('span', { key: 'badge', style: { fontSize: '11px', background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '10px' } }, '已启用')
        ]),
        h('label', { key: 'toggle', style: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' } }, [
          h('input', {
            type: 'checkbox',
            checked: cfg.enableCleaner,
            onChange: toggleCleaner
          }),
          '启用过滤'
        ])
      ]),
      h('div', { key: 'desc', style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #aaa)', lineHeight: '1.5' } },
        '控制设置页左侧要显示哪些栏目。取消勾选后该项会从侧栏隐藏；通用、模型、插件、Agent Presets 默认保留。修改后立即生效。'
      ),
      cfg.enableCleaner && h('div', { key: 'list', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', marginTop: '4px' } },
        catalog.map(card => {
          const isShow = shouldKeep(card.id, cfg)
          return h('label', {
            key: card.id,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--dsw-alias-border-l2, #333)',
              background: isShow ? 'var(--dsw-alias-bg-layer-3, rgba(255,255,255,0.05))' : 'transparent',
              opacity: isShow ? 1 : 0.55,
              cursor: 'pointer',
              fontSize: '12.5px'
            }
          }, [
            h('input', {
              type: 'checkbox',
              checked: isShow,
              onChange: (e) => toggleCard(card.id, e.target.checked)
            }),
            card.label
          ])
        })
      ),
      h('div', { key: 'foot', style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' } }, [
        h('button', {
          key: 'hide',
          onClick: hideAllExtras,
          style: {
            background: 'none',
            border: '1px solid var(--dsw-alias-border-l2, #444)',
            color: 'var(--dsw-alias-label-secondary, #ccc)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer'
          }
        }, '只显示核心项'),
        h('button', {
          key: 'reset',
          onClick: resetAll,
          style: {
            background: 'none',
            border: '1px solid var(--dsw-alias-border-l2, #444)',
            color: 'var(--dsw-alias-label-secondary, #ccc)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer'
          }
        }, '恢复默认')
      ])
    ])
  }

  const inject = ['slots']

  function patchSlots(slots) {
    if (!slots || slots.__dshSettingsCleanerPatched) return
    const original = slots.entries.bind(slots)
    slots.__dshSettingsCleanerRawEntries = original
    slots.entries = function (key) {
      const list = original(key)
      if (key !== 'settings.section') return list
      const cfg = getSavedConfig()
      if (!cfg.enableCleaner) return list
      const filtered = list.filter((entry) => shouldKeep(entry && entry.options && entry.options.id, cfg))
      return filtered.length ? filtered : list
    }
    slots.__dshSettingsCleanerPatched = true
    window.__dshSettingsCleanerSlots = slots
    notifySettingsNav()
  }

  function apply(ctx) {
    const slots = ctx.get('slots')
    if (!slots) return
    patchSlots(slots)
    notifySettingsNav()
    const mo = new MutationObserver(() => {
      stampNavButtons()
      applyNavStyle(getSavedConfig())
    })
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true })
    }

    slots.inject('settings.section', () => slots.register(
      {
        name: 'settings.section',
        id: 'settings-cleaner-manager',
        order: -100,
        label: () => '设置抽屉'
      },
      ManagerCard
    ))
  }

  module.exports = { inject, apply }
  return module.exports
} })
