/**
 * dsh-endfield-startup — 浏览器半侧
 * ----------------------------------------------------------------------------
 * 1) 注册「设置 → 启动序列」面板，读写 /dsh-endfield-startup/config
 * 2) 桌面端 Host index 注入失效时，做一次浏览器侧自举兜底
 *
 * Host 注入正常时不会重复挂载：__DSH_STARTUP__ 或根节点存在即跳过。
 */
window.__ModuleLoader__.load({
  id: 'dsh-endfield-startup',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var h = react.createElement

    var ROUTE = '/dsh-endfield-startup'
    /* Host 在 Electron 里会把 routeBase 设成 webServer 的绝对 origin；
       这样面板与自举都不依赖 dsh-app:// 自定义协议去代理相对路径。 */
    var BASE = (function () {
      try {
        return (window.__DSH_STARTUP__ && window.__DSH_STARTUP__.routeBase) || ROUTE
      } catch (e) {
        return ROUTE
      }
    })()
    BASE = String(BASE).replace(/\/+$/, '')
    var API = BASE + '/config'
    var ROOT_ID = 'dsh-endfield-startup-root'

    /* ── 设置面板 CSS（直角、单色、等宽标签） ────────────────────────────── */
    var CSS = [
      '.__efs{max-width:680px;display:flex;flex-direction:column;gap:14px;font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.__efs *{box-sizing:border-box;border-radius:0!important}',
      '.__efs_head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid var(--dsw-alias-border-l2);padding-bottom:10px}',
      '.__efs_title{font-family:ui-monospace,Consolas,monospace;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}',
      '.__efs_ver{font-family:ui-monospace,Consolas,monospace;font-size:10px;letter-spacing:.08em;color:var(--dsw-alias-label-tertiary)}',
      '.__efs_group{border:1px solid var(--dsw-alias-border-l2);padding:12px 14px;display:flex;flex-direction:column;gap:11px}',
      '.__efs_gt{font-family:ui-monospace,Consolas,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.__efs_row{display:flex;align-items:center;justify-content:space-between;gap:16px}',
      '.__efs_rowcol{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.__efs_label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.__efs_hint{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.__efs_check{display:flex;align-items:flex-start;gap:8px;cursor:pointer}',
      '.__efs_check input{margin-top:2px;accent-color:var(--dsw-alias-state-business-primary)}',
      '.__efs_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:5px 7px;min-width:170px}',
      '.__efs_range{width:180px;accent-color:var(--dsw-alias-state-business-primary)}',
      '.__efs_num{width:44px;text-align:right;font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.__efs_id{border:1px solid var(--dsw-alias-border-l2);padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.__efs_idName{font-family:ui-monospace,Consolas,monospace;font-size:15px;font-weight:700;letter-spacing:.12em}',
      '.__efs_idTag{font-family:ui-monospace,Consolas,monospace;font-size:9px;letter-spacing:.14em;color:var(--dsw-alias-label-tertiary)}',
      '.__efs_actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px}',
      '.__efs_btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;padding:6px 13px;cursor:pointer}',
      '.__efs_btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}',
      '.__efs_btn:disabled{opacity:.5;cursor:default}',
      '.__efs_btnPri{border-color:var(--dsw-alias-state-business-primary,#3964fe);color:var(--dsw-alias-state-business-primary,#3964fe);background:transparent}',
      '.__efs_ok{font-size:11px;color:var(--dsw-alias-state-business-primary,#3964fe)}',
      '.__efs_err{font-size:11px;color:var(--dsw-alias-state-error-primary,#f85149)}',
      '.__efs_note{border-left:2px solid var(--dsw-alias-border-l3,#4a4d49);padding-left:10px;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary)}'
    ].join('')
    var tagId = 'dsh-endfield-startup/main.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-endfield-startup'
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    function readFlag(store, key) {
      try {
        var s = window[store]
        return s ? s.getItem(key) : null
      } catch (e) { return null }
    }
    function writeFlag(store, key, value) {
      try {
        var s = window[store]
        if (s) s.setItem(key, value)
      } catch (e) { /* noop */ }
    }
    function loadScript(src, done) {
      var s = document.createElement('script')
      s.src = src
      s.async = false
      s.addEventListener('load', function () { done(null) })
      s.addEventListener('error', function () { done(new Error('script load failed: ' + src)) })
      ;(document.head || document.documentElement).appendChild(s)
    }
    function loadCss(href, done) {
      var link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.addEventListener('load', function () { done(null) })
      link.addEventListener('error', function () { done(new Error('css load failed: ' + href)) })
      ;(document.head || document.documentElement).appendChild(link)
    }
    function releaseLock() {
      try {
        var r = document.getElementById(ROOT_ID)
        if (r && r.parentNode) r.parentNode.removeChild(r)
        document.documentElement.classList.remove('efs-lock')
        if (document.body) document.body.style.overflow = ''
      } catch (e) { /* noop */ }
    }

    /* Host index 注入失效时的兜底：建根节点 + 拉同一份 splash.css/js。 */
    function selfBoot() {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return
        if (!document.body) return
        if (window.__DSH_STARTUP__ || document.getElementById(ROOT_ID)) return
        if (window.__DSH_STARTUP_SKIP__ === true || window.__DSH_STARTUP_FAILED__ === true) return
        fetch(API, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json() })
          .then(function (j) { return j && j.ok ? j.config : null })
          .catch(function () { return null })
          .then(function (cfg) {
            if (!cfg || cfg.enabled === false) return
            var today = new Date().toISOString().slice(0, 10)
            if (cfg.mode === 'session' && readFlag('sessionStorage', 'dsh-endfield-startup:done') === '1') return
            if (cfg.mode === 'daily' && readFlag('localStorage', 'dsh-endfield-startup:day') === today) return
            var root = document.createElement('div')
            root.id = ROOT_ID
            root.className = 'efs-root efs-boot'
            document.body.appendChild(root)
            document.documentElement.classList.add('efs-lock')
            if (document.body) document.body.style.overflow = 'hidden'
            window.__DSH_STARTUP__ = Object.assign({}, cfg, { routeBase: BASE })
            window.__DSH_STARTUP_BOOT__ = 'client'
            var failed = false
            function fail(err) {
              if (failed) return
              failed = true
              if (typeof console !== 'undefined' && console.warn) {
                console.warn('[dsh-endfield-startup] 启动层自举失败，已放开页面：', err && err.message)
              }
              releaseLock()
              window.__DSH_STARTUP_FAILED__ = true
            }
            loadCss(BASE + '/splash.css', function (err) { if (err) fail(err) })
            try { delete window.__ENDFIELD_STARTUP_LOADED__ } catch (e) { window.__ENDFIELD_STARTUP_LOADED__ = undefined }
            loadScript(BASE + '/splash.js?t=' + Date.now(), function (err) { if (err) fail(err) })
            setTimeout(function () {
              var r = document.getElementById(ROOT_ID)
              if (r && r.getAttribute('data-mounted') !== '1') fail(new Error('startup layer did not mount'))
            }, 9000)
          })
          .catch(function () { /* 自举失败不阻塞主界面 */ })
      } catch (e) { /* noop */ }
    }

    /* ── 表单原子 ────────────────────────────────────────────────────────── */
    function Check(props) {
      return h('label', { className: '__efs_check' },
        h('input', { type: 'checkbox', checked: !!props.checked, onChange: function (e) { props.onChange(e.target.checked) } }),
        h('span', { className: '__efs_rowcol' },
          h('span', { className: '__efs_label' }, props.label),
          props.hint ? h('span', { className: '__efs_hint' }, props.hint) : null
        )
      )
    }
    function Volume(props) {
      return h('div', { className: '__efs_row' },
        h('span', { className: '__efs_label' }, props.label),
        h('span', { className: '__efs_row' },
          h('input', {
            className: '__efs_range', type: 'range', min: 0, max: 100, step: 1,
            value: Math.round(Number(props.value || 0) * 100),
            onChange: function (e) { props.onChange(Number(e.target.value) / 100) }
          }),
          h('span', { className: '__efs_num' }, Math.round(Number(props.value || 0) * 100) + '%')
        )
      )
    }

    /* ── 设置面板 ────────────────────────────────────────────────────────── */
    function Panel() {
      var state = react.useState(null)
      var cfg = state[0]
      var setCfg = state[1]
      var vstate = react.useState('')
      var version = vstate[0]
      var setVersion = vstate[1]
      var sstate = react.useState({ busy: false, ok: '', err: '' })
      var status = sstate[0]
      var setStatus = sstate[1]
      var dstate = react.useState(null)
      var defaults = dstate[0]
      var setDefaults = dstate[1]

      function applyPayload(j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'invalid response')
        setCfg(j.config)
        setDefaults(j.defaults)
        setVersion(j.version || '')
      }
      function load() {
        setStatus({ busy: true, ok: '', err: '' })
        fetch(API, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.json() })
          .then(function (j) {
            applyPayload(j)
            setStatus({ busy: false, ok: '', err: '' })
          })
          .catch(function (e) {
            setStatus({ busy: false, ok: '', err: String((e && e.message) || e) })
          })
      }
      react.useEffect(function () { load() }, [])

      function set(key, value) {
        setCfg(function (prev) { return Object.assign({}, prev, { [key]: value }) })
      }
      function save() {
        if (!cfg) return
        setStatus({ busy: true, ok: '', err: '' })
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: cfg })
        })
          .then(function (r) { return r.json() })
          .then(function (j) {
            applyPayload(j)
            setStatus({ busy: false, ok: '已保存；刷新页面后生效。', err: '' })
          })
          .catch(function (e) {
            setStatus({ busy: false, ok: '', err: String((e && e.message) || e) })
          })
      }
      function reset() {
        setStatus({ busy: true, ok: '', err: '' })
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        })
          .then(function (r) { return r.json() })
          .then(function (j) {
            applyPayload(j)
            setStatus({ busy: false, ok: '已恢复默认值。', err: '' })
          })
          .catch(function (e) {
            setStatus({ busy: false, ok: '', err: String((e && e.message) || e) })
          })
      }
      function preview() {
        try {
          if (window.__DSH_STARTUP_API__ && typeof window.__DSH_STARTUP_API__.replay === 'function') {
            window.__DSH_STARTUP_API__.replay()
            return
          }
        } catch (e) { /* noop */ }
        try {
          sessionStorage.removeItem('dsh-endfield-startup:done')
          localStorage.removeItem('dsh-endfield-startup:day')
        } catch (e) { /* noop */ }
        window.location.reload()
      }

      if (!cfg) {
        return h('div', { className: '__efs' },
          h('div', { className: '__efs_head' },
            h('span', { className: '__efs_title' }, 'ENDFIELD INDUSTRIES // SECURE BOOT'),
            h('span', { className: '__efs_ver' }, version ? 'v' + version : '')
          ),
          h('div', { className: '__efs_hint' }, status.err || '正在读取启动序列配置…')
        )
      }

      return h('div', { className: '__efs' },
        h('div', { className: '__efs_head' },
          h('span', { className: '__efs_title' }, 'ENDFIELD INDUSTRIES // SECURE BOOT'),
          h('span', { className: '__efs_ver' }, 'v' + version + ' · TALOS-II')
        ),

        h('div', { className: '__efs_group' },
          h('div', { className: '__efs_gt' }, 'PLAYBACK'),
          h(Check, {
            label: '启用启动序列', checked: cfg.enabled,
            hint: '关闭后完全跳过启动层，直接进入 Harness 主界面。',
            onChange: function (v) { set('enabled', v) }
          }),
          h('div', { className: '__efs_row' },
            h('span', { className: '__efs_rowcol' },
              h('span', { className: '__efs_label' }, '播放模式'),
              h('span', { className: '__efs_hint' }, '授权门控不会因模式改变；必须点击或按 Enter/Space 才能进入阶段 D。')
            ),
            h('select', {
              className: '__efs_select', value: cfg.mode,
              onChange: function (e) { set('mode', e.target.value) }
            },
              h('option', { value: 'session' }, '每次会话'),
              h('option', { value: 'always' }, '每次刷新'),
              h('option', { value: 'daily' }, '每天一次')
            )
          )
        ),

        h('div', { className: '__efs_group' },
          h('div', { className: '__efs_gt' }, 'IDENTITY'),
          h('div', { className: '__efs_id' },
            h('span', { className: '__efs_idName' }, 'ENDMINISTRATOR'),
            h('span', { className: '__efs_idTag' }, 'FIXED // CLEARANCE OMEGA')
          ),
          h('div', { className: '__efs_note' }, '身份固定为 ENDMINISTRATOR。Esc / SKIP 只会打开授权遮罩，不能绕过门控。')
        ),

        h('div', { className: '__efs_group' },
          h('div', { className: '__efs_gt' }, 'AUDIO'),
          h(Check, {
            label: '背景环境音', checked: cfg.bgm,
            hint: '首次交互前保持 STANDBY；交互后由右下角按钮切换 ACTIVE / STANDBY。',
            onChange: function (v) { set('bgm', v) }
          }),
          h(Volume, { label: '环境音音量', value: cfg.bgmVolume, onChange: function (v) { set('bgmVolume', v) } }),
          h(Check, {
            label: '界面确认音', checked: cfg.sfx,
            hint: '按钮按压、权限条目确认、授权触发音。',
            onChange: function (v) { set('sfx', v) }
          }),
          h(Volume, { label: '确认音音量', value: cfg.sfxVolume, onChange: function (v) { set('sfxVolume', v) } }),
          h(Check, {
            label: '英文语音', checked: cfg.voice,
            hint: '逐条权限由语音/音效 onended 驱动；语音期间点击不会推进。',
            onChange: function (v) { set('voice', v) }
          }),
          h('div', { className: '__efs_row' },
            h('span', { className: '__efs_label' }, '语音来源'),
            h('select', {
              className: '__efs_select', value: cfg.voiceSource,
              onChange: function (e) { set('voiceSource', e.target.value) }
            },
              h('option', { value: 'asset' }, '内置语音文件（推荐）'),
              h('option', { value: 'tts' }, '系统 Web Speech TTS')
            )
          ),
          h(Volume, { label: '语音音量', value: cfg.voiceVolume, onChange: function (v) { set('voiceVolume', v) } })
        ),

        h('div', { className: '__efs_actions' },
          h('button', { className: '__efs_btn __efs_btnPri', disabled: status.busy, onClick: save }, status.busy ? '处理中…' : '保存配置'),
          h('button', { className: '__efs_btn', disabled: status.busy, onClick: preview }, '立即预览'),
          h('button', { className: '__efs_btn', disabled: status.busy, onClick: reset }, '恢复默认'),
          status.ok ? h('span', { className: '__efs_ok' }, status.ok) : null,
          status.err ? h('span', { className: '__efs_err' }, status.err) : null
        ),
        h('div', { className: '__efs_hint' }, '配置文件：~/.dsh/dsh-endfield-startup.json · 保存后刷新页面生效。')
      )
    }

    var inject = ['slots']
    function apply(ctx) {
      selfBoot()
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          { name: 'settings.section', id: 'endfield-startup', order: 27, label: '启动序列' },
          function () { return h(Panel, {}) }
        )
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
