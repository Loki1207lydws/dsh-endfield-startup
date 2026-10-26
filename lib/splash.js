/* ============================================================================
 * ENDFIELD INDUSTRIES // SECURE BOOT — 浏览器端运行时
 * ----------------------------------------------------------------------------
 * 阶段 A 终端唤醒 → B 工业标示 → C 硬门控（authorized === false 时禁止阶段 D）
 * → D 模块加载 → 硬切黑 200ms → 向上折叠退场。
 *
 * 语音/音效全部以 onended 驱动权限揭示；语音期间点击屏幕不会推进。
 * `window.__DSH_STARTUP_API__.replay()` 供设置页或冒烟测试重播。
 * ========================================================================== */
(function () {
  'use strict'

  if (window.__ENDFIELD_STARTUP_LOADED__) return
  window.__ENDFIELD_STARTUP_LOADED__ = true

  var ROOT_ID = 'dsh-endfield-startup-root'
  var SESSION_DONE = 'dsh-endfield-startup:done'
  var DAY_DONE = 'dsh-endfield-startup:day'
  var STANDALONE = window.__ENDFIELD_STANDALONE__ || null
  var RAW = window.__DSH_STARTUP__ || {}

  var DEFAULTS = {
    enabled: true,
    mode: 'session',
    bgm: true,
    bgmVolume: 0.4,
    sfx: true,
    sfxVolume: 0.45,
    voice: true,
    voiceSource: 'asset',
    voiceVolume: 0.9,
    voiceRate: 0.9,
    voicePitch: 0.9,
    routeBase: '/dsh-startup'
  }

  var cfg = {}
  Object.keys(DEFAULTS).forEach(function (k) {
    cfg[k] = RAW[k] === undefined || RAW[k] === null ? DEFAULTS[k] : RAW[k]
  })
  cfg.enabled = cfg.enabled !== false && cfg.enabled !== 'false'
  cfg.bgm = cfg.bgm !== false && cfg.bgm !== 'false'
  cfg.sfx = cfg.sfx !== false && cfg.sfx !== 'false'
  cfg.voice = cfg.voice !== false && cfg.voice !== 'false'
  cfg.mode = ['session', 'always', 'daily'].indexOf(cfg.mode) >= 0 ? cfg.mode : 'session'
  cfg.voiceSource = cfg.voiceSource === 'tts' ? 'tts' : 'asset'
  cfg.bgmVolume = clamp(Number(cfg.bgmVolume), 0, 1, DEFAULTS.bgmVolume)
  cfg.sfxVolume = clamp(Number(cfg.sfxVolume), 0, 1, DEFAULTS.sfxVolume)
  cfg.voiceVolume = clamp(Number(cfg.voiceVolume), 0, 1, DEFAULTS.voiceVolume)
  cfg.voiceRate = clamp(Number(cfg.voiceRate), 0.5, 2, DEFAULTS.voiceRate)
  cfg.voicePitch = clamp(Number(cfg.voicePitch), 0, 2, DEFAULTS.voicePitch)
  cfg.routeBase = typeof cfg.routeBase === 'string' && cfg.routeBase.charAt(0) === '/'
    ? cfg.routeBase.replace(/\/+$/, '')
    : DEFAULTS.routeBase

  var reduceQuery = false
  try {
    var q = new URLSearchParams(window.location.search)
    reduceQuery = q.get('efs-reduced') === '1'
  } catch (e) { /* URLSearchParams 不可用就按系统偏好 */ }
  var reduced = reduceQuery || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  var VOICE = {
    1: 'DeepSeek Harness secure boot. Endministrator authorization required.',
    2: 'Endministrator signature detected. Awaiting authorization.',
    3: 'Administrator access granted. Welcome back, Endministrator.',
    4: 'Loading DeepSeek Harness modules.',
    5: 'All systems nominal. DeepSeek Harness is now under your control.'
  }

  var LINES = [
    { en: '> DEEPSEEK HARNESS // SECURE BOOT', cn: '安全启动' },
    { en: '> ENDFIELD INDUSTRIES TERMINAL ACCESS', cn: '终末地工业终端接入' },
    { en: '> IDENTITY REQUIRED', cn: '需要身份核验' }
  ]

  /* Host 的 bootstrap 已判定本次不播（会话/每日已播过）：不再建根节点。 */
  if (window.__DSH_STARTUP_SKIP__ === true) {
    try {
      var skipped = document.getElementById(ROOT_ID)
      if (skipped && skipped.parentNode) skipped.parentNode.removeChild(skipped)
      document.documentElement.classList.remove('efs-lock')
      if (document.body) document.body.style.overflow = ''
    } catch (e) { /* noop */ }
    return
  }

  var root = document.getElementById(ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = ROOT_ID
    document.body.appendChild(root)
  }
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'DeepSeek Harness secure boot')
  root.setAttribute('data-mounted', '1')

  if (!cfg.enabled) {
    root.parentNode && root.parentNode.removeChild(root)
    document.documentElement.classList.remove('efs-lock')
    if (document.body) document.body.style.overflow = ''
    return
  }

  document.documentElement.classList.add('efs-lock')
  if (document.body) document.body.style.overflow = 'hidden'
  root.className = 'efs-root efs-boot' + (reduced ? ' efs-reduced' : '')
  root.setAttribute('data-phase', 'A')
  root.setAttribute('aria-hidden', 'false')

  /* ── 内联 DOM ─────────────────────────────────────────────────────────── */
  root.innerHTML = [
    '<div class="efs-contours" data-contours aria-hidden="true">',
    '<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"></svg>',
    '</div>',
    '<div class="efs-grid" data-grid aria-hidden="true">',
    '<span class="efs-grid__h"></span>',
    '<span class="efs-grid__v efs-grid__v--l"></span>',
    '<span class="efs-grid__v efs-grid__v--r"></span>',
    '<span class="efs-grid__tick efs-grid__tick--l"></span>',
    '<span class="efs-grid__tick efs-grid__tick--r"></span>',
    '<div class="efs-grid__notches"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
    '</div>',
    '<div class="efs-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>',
    '<div class="efs-rail" aria-hidden="true">ENDFIELD INDUSTRIES / TALOS-II / 安全启动</div>',
    '<div class="efs-rail efs-rail--right" aria-hidden="true">SECTOR 04 / 扇区 04 · GRID 0x4A / 电网 · NODE 0x7F</div>',
    '<aside class="efs-steps" data-steps aria-hidden="true">',
    '<div class="efs-step is-active" data-step="A"><span class="efs-step__no">01</span><span class="efs-step__label">WAKE</span><span class="efs-step__cn">唤醒</span></div>',
    '<div class="efs-step" data-step="B"><span class="efs-step__no">02</span><span class="efs-step__label">LINK</span><span class="efs-step__cn">链路</span></div>',
    '<div class="efs-step" data-step="C"><span class="efs-step__no">03</span><span class="efs-step__label">AUTH</span><span class="efs-step__cn">授权</span></div>',
    '<div class="efs-step" data-step="D"><span class="efs-step__no">04</span><span class="efs-step__label">LOAD</span><span class="efs-step__cn">加载</span></div>',
    '</aside>',
    '<div class="efs-frame">',
    '<header class="efs-top">',
    '<div class="efs-corner-brand">',
    '<span class="efs-corner-brand__logo-wrap">',
    '<img class="efs-corner-brand__logo" src="' + asset('endfield-logo-white.png') + '" alt="">',
    '<i class="efs-corner-brand__scan" aria-hidden="true"></i>',
    '</span>',
    '<span class="efs-corner-brand__accent" aria-hidden="true"></span>',
    '<div class="efs-corner-brand__meta">',
    '<span class="efs-corner-brand__name">DEEPSEEK HARNESS</span>',
    '<span class="efs-corner-brand__sub">SECURE BOOT // 安全启动</span>',
    '<span class="efs-corner-brand__line">ENDFIELD INDUSTRIES · 终末地工业</span>',
    '<span class="efs-corner-brand__line">TALOS-II // 0x7F</span>',
    '</div>',
    '</div>',
    '<div class="efs-top__right">',
    '<span class="efs-live"><i></i>LIVE</span>',
    '<span class="efs-clock" data-clock>----.--.-- // --:--:--</span>',
    '<button class="efs-skip" data-skip type="button"><span class="efs-skip__line"></span>SKIP</button>',
    '</div>',
    '</header>',
    '<main class="efs-stage">',
    /* 阶段 A */
    '<section class="efs-phase efs-phase--a is-active" data-phase="A">',
    '<div class="efs-ghost" data-ghost="A" aria-hidden="true">01</div>',
    '<div class="efs-wake-wrap">',
    '<div class="efs-terminal">',
    '<div class="efs-terminal__bar"><span>SECURE SHELL // 安全终端</span><span>ENDMINISTRATOR LINK // 管理员链路</span></div>',
    '<div class="efs-terminal__body">',
    LINES.map(function (line, i) {
      return '<div class="efs-terminal__line" data-line="' + i + '"><span class="efs-terminal__prompt">&gt;</span><span class="efs-terminal__text"></span><span class="efs-cursor"></span><span class="efs-terminal__cn">' + line.cn + '</span></div>'
    }).join(''),
    '</div>',
    '<div class="efs-terminal__foot"><span>SIGNAL · 信号</span><span class="efs-terminal__signal"><i></i><i></i><i></i><i></i><i></i></span><span>NO CARRIER · 无载波</span></div>',
    '</div>',
    '<button class="efs-wake" data-wake type="button" disabled><span class="efs-wake__copy"><span class="efs-wake__main">WAKE TERMINAL</span><span class="efs-wake__cn">唤醒终端</span></span><span class="efs-wake__meta">ENTER / CLICK<span class="efs-wake__arrow">→</span></span></button>',
    '</div>',
    '<div class="efs-stage-corner">01 / WAKE · 唤醒</div>',
    '</section>',
    /* 阶段 B */
    '<section class="efs-phase efs-phase--b" data-phase="B">',
    '<div class="efs-ghost" data-ghost="B" aria-hidden="true">02</div>',
    '<div class="efs-brand-panel">',
    '<button class="efs-radar" data-radar type="button" disabled aria-label="建立终端链路">',
    '<svg viewBox="0 0 360 360" data-radar-svg aria-hidden="true"></svg>',
    '<span class="efs-radar__core" aria-hidden="true"><span>EF</span><b>02</b><em>TALOS-II</em></span>',
    '</button>',
    '<div class="efs-lockup__rule"></div>',
    '<div class="efs-brand-copy">',
    '<div class="efs-lockup__eyebrow">ARKNIGHTS // ENDFIELD INDUSTRIES · 明日方舟：终末地</div>',
    '<div class="efs-brand-copy__title">TERMINAL ACCESS</div>',
    '<div class="efs-brand-copy__cn">终端接入 · INDUSTRIAL EDITORIAL</div>',
    '<p class="efs-lockup__legal">PROPERTY OF ENDFIELD INDUSTRIES.<br>UNAUTHORIZED ACCESS IS PROHIBITED.<br><span>本资产归终末地工业所有。未经授权禁止接入。</span></p>',
    '<div class="efs-brand-meta">',
    '<div><span>ASSET CLASS</span><span>TALOS-II</span></div>',
    '<div><span>CLEARANCE</span><span>OMEGA</span></div>',
    '<div><span>LINK</span><span>02 / 03</span></div>',
    '</div>',
    '<button class="efs-link" data-link type="button" disabled><span class="efs-link__copy"><span class="efs-link__main" data-link-main>ESTABLISH TERMINAL LINK</span><span class="efs-link__cn" data-link-cn>建立终端链路</span></span><span class="efs-link__meta"><span data-link-step>02 / 03</span><span class="efs-link__arrow">→</span></span></button>',
    '<div class="efs-link__hint" data-link-hint><span class="efs-blink"></span><span data-link-hint-text>LINK STANDBY</span><span class="efs-cn" data-link-hint-cn>链路待建立</span></div>',
    '<div class="efs-barcode" aria-hidden="true"><div class="efs-barcode__bars">' + new Array(28).fill('<i></i>').join('') + '</div><span>EF-02 / TALOS-II / 0x7F</span></div>',
    '</div>',
    '</div>',
    '<div class="efs-stage-corner">02 / IDENTIFY · 识别</div>',
    '</section>',
    /* 阶段 C / D 共用的门控面板 */
    '<section class="efs-phase efs-phase--c" data-phase="C">',
    '<div class="efs-ghost" data-ghost="C" aria-hidden="true">03</div>',
    '<div class="efs-gate is-unauth" data-gate>',
    '<div class="efs-gate__head"><span class="efs-kicker">IDENTITY <em>身份</em></span><span class="efs-kicker">AUTH GATE // 03 <em>授权门控</em></span></div>',
    '<div class="efs-gate__id">',
    '<h2 class="efs-gate__name" data-gate-name>ENDMINISTRATOR</h2>',
    '<div class="efs-gate__meta"><span class="efs-dot" data-auth-dot></span><span class="efs-gate__status" data-auth-status>CLEARANCE LEVEL: PENDING</span><span class="efs-cn" data-auth-status-cn>权限等级：待授权</span></div>',
    '</div>',
    '<div class="efs-gate__rule"></div>',
    '<div class="efs-perms">',
    '<button class="efs-perm" data-perm="0" type="button" disabled><span class="efs-perm__idx">[ 01 ]</span><span class="efs-perm__label">TERMINAL CONTROL <em>终端控制</em></span><span class="efs-perm__leader"></span><span class="efs-perm__state">PENDING <em>待授权</em></span></button>',
    '<button class="efs-perm" data-perm="1" type="button" disabled><span class="efs-perm__idx">[ 02 ]</span><span class="efs-perm__label">ARCHIVE ACCESS <em>档案访问</em></span><span class="efs-perm__leader"></span><span class="efs-perm__state">PENDING <em>待授权</em></span></button>',
    '<button class="efs-perm" data-perm="2" type="button" disabled><span class="efs-perm__idx">[ 03 ]</span><span class="efs-perm__label">HARNESS PROTOCOL <em>协议接管</em></span><span class="efs-perm__leader"></span><span class="efs-perm__state">PENDING <em>待授权</em></span></button>',
    '</div>',
    '<button class="efs-auth" data-auth-btn type="button"><span class="efs-auth__copy"><span class="efs-auth__main" data-auth-label>AUTHORIZE ENDMINISTRATOR ACCESS</span><span class="efs-auth__cn" data-auth-cn>授权终端管理员接入</span></span><span class="efs-auth__meta"><span data-auth-step>01 / 02</span><span class="efs-auth__arrow">→</span></span></button>',
    '<div class="efs-gate__hint" data-auth-hint><span class="efs-blink"></span><span data-auth-hint-text>AWAITING AUTHORIZATION</span><span class="efs-cn" data-auth-hint-cn>等待授权</span></div>',
    '<div class="efs-confirm" data-confirm aria-hidden="true">',
    '<div class="efs-confirm__meta"><span>AUTH WINDOW // 授权窗口</span><span class="efs-confirm__count"><strong data-confirm-count>06</strong>s</span></div>',
    '<div class="efs-confirm__bar"><i data-confirm-fill></i></div>',
    '<div class="efs-confirm__row"><span>SIGNATURE LOCKED · 签名已锁定</span><button class="efs-confirm__cancel" data-confirm-cancel type="button">CANCEL · 取消</button></div>',
    '</div>',
    '<div class="efs-gate__load">',
    '<div class="efs-gate__load-row"><span data-load-text>LOADING DEEPSEEK HARNESS MODULES</span><span class="efs-cn" data-load-cn>正在加载 Harness 模块</span><strong data-load-pct>0%</strong></div>',
    '<div class="efs-gate__load-text" data-load-sub>INDUSTRIAL GRID // 校准工业网格</div>',
    '<div class="efs-modules" data-modules>',
    '<div class="efs-module" data-mod="0"><span>TERM</span><em>终端</em></div>',
    '<div class="efs-module" data-mod="1"><span>ARCH</span><em>档案</em></div>',
    '<div class="efs-module" data-mod="2"><span>PROTO</span><em>协议</em></div>',
    '<div class="efs-module" data-mod="3"><span>LINK</span><em>链路</em></div>',
    '<div class="efs-module" data-mod="4"><span>AUTH</span><em>授权</em></div>',
    '</div>',
    '</div>',
    '</div>',
    '<aside class="efs-readout" data-readout aria-label="系统读数">',
    '<div class="efs-readout__tag">SYSTEM READOUT / 系统读数</div>',
    '<div class="efs-readout__row"><span>LINK / 链路</span><i class="is-on" data-ro-link></i><b>STABLE</b></div>',
    '<div class="efs-readout__row"><span>GRID / 电网</span><i class="is-on" data-ro-grid></i><b>0x4A</b></div>',
    '<div class="efs-readout__row"><span>VOICE / 语音</span><i class="is-on" data-ro-voice></i><b>FEMALE</b></div>',
    '<div class="efs-readout__row"><span>NODE / 节点</span><i data-ro-node></i><b>TALOS-II</b></div>',
    '<button class="efs-readout__btn" data-diag type="button">RUN DIAGNOSTIC<span>运行诊断</span></button>',
    '<div class="efs-readout__status" data-ro-status>STANDBY / 待机</div>',
    '</aside>',
    '<div class="efs-stage-corner">03 / AUTHORIZE · 授权</div>',
    '</section>',
    '</main>',
    '<footer class="efs-bottom">',
    '<div class="efs-bottom__col"><span>SYS.BOOT / 系统引导</span><span class="efs-dim">ENDMINISTRATOR / 终端管理员</span></div>',
    '<div class="efs-bottom__col efs-bottom__col--mid"><span>ENDFIELD INDUSTRIES</span><span class="efs-dim">终末地工业 · TALOS-II</span></div>',
    '<div class="efs-bottom__col efs-bottom__col--right"><span class="efs-dim">v.HARNESS // TALOS-II</span><span class="efs-dim">AUDIO CHANNEL / 音频通道</span><button class="efs-audio" data-audio type="button"><i class="efs-audio__dot"></i><span class="efs-audio__text"><span data-audio-label>AUDIO: STANDBY</span><span class="efs-audio__cn" data-audio-cn>音频待机</span></span></button></div>',
    '</footer>',
    '</div>',
    /* 进度条 */
    '<div class="efs-progress" data-progress aria-hidden="true">',
    '<div class="efs-progress__meta"><span class="efs-progress__label" data-progress-label>LOADING DEEPSEEK HARNESS MODULES <span class="efs-cn">正在加载 Harness 模块</span></span><span>TALOS-II</span></div>',
    '<div class="efs-progress__track"><div class="efs-progress__fill" data-progress-fill></div><div class="efs-progress__ticks"><i></i><i></i><i></i><i></i></div></div>',
    '<div class="efs-progress__foot"><span>HARNESS // TALOS-II · 模块传输</span><span data-progress-pct>0%</span></div>',
    '</div>',
    /* 扫描线 */
    '<div class="efs-scan" aria-hidden="true"></div>',
    /* 授权遮罩 */
    '<div class="efs-modal" data-modal aria-hidden="true">',
    '<div class="efs-modal__panel" role="document">',
    '<div class="efs-modal__tag">AUTHORIZATION // 04 · 授权</div>',
    '<p class="efs-modal__text">ENDMINISTRATOR AUTHORIZATION IS REQUIRED TO PROCEED.<span class="efs-modal__cn">必须完成终端管理员授权后方可继续。</span></p>',
    '<div class="efs-modal__hint">ESC / SKIP CANNOT BYPASS THE IDENTITY GATE. ONLY THE ENDMINISTRATOR CAN RELEASE THIS TERMINAL.<br>ESC / SKIP 不能绕过身份门控，只有终端管理员可以释放本终端。</div>',
    '<button class="efs-modal__btn" data-modal-auth type="button"><span>AUTHORIZE ACCESS</span><span class="efs-modal__btncn">授权接入</span></button>',
    '</div>',
    '</div>',
    '<div class="efs-blackout" aria-hidden="true"></div>',
    '<div class="efs-sr" data-live aria-live="polite"></div>'
  ].join('')

  /* ── DOM 引用 ─────────────────────────────────────────────────────────── */
  var grid = root.querySelector('[data-grid]')
  var phases = root.querySelectorAll('[data-phase]')
  var gate = root.querySelector('[data-gate]')
  var gateName = root.querySelector('[data-gate-name]')
  var authDot = root.querySelector('[data-auth-dot]')
  var authStatus = root.querySelector('[data-auth-status]')
  var authBtn = root.querySelector('[data-auth-btn]')
  var authLabel = root.querySelector('[data-auth-label]')
  var authCn = root.querySelector('[data-auth-cn]')
  var authStep = root.querySelector('[data-auth-step]')
  var authStatusCn = root.querySelector('[data-auth-status-cn]')
  var authHint = root.querySelector('[data-auth-hint]')
  var authHintText = root.querySelector('[data-auth-hint-text]')
  var authHintCn = root.querySelector('[data-auth-hint-cn]')
  var confirm = root.querySelector('[data-confirm]')
  var confirmFill = root.querySelector('[data-confirm-fill]')
  var confirmCount = root.querySelector('[data-confirm-count]')
  var confirmCancel = root.querySelector('[data-confirm-cancel]')
  var perms = root.querySelectorAll('[data-perm]')
  var skipBtn = root.querySelector('[data-skip]')
  var audioBtn = root.querySelector('[data-audio]')
  var audioLabel = root.querySelector('[data-audio-label]')
  var audioCn = root.querySelector('[data-audio-cn]')
  var modal = root.querySelector('[data-modal]')
  var modalBtn = root.querySelector('[data-modal-auth]')
  var loadText = root.querySelector('[data-load-text]')
  var loadCn = root.querySelector('[data-load-cn]')
  var loadPct = root.querySelector('[data-load-pct]')
  var loadSub = root.querySelector('[data-load-sub]')
  var progressLabel = root.querySelector('[data-progress-label]')
  var progressFill = root.querySelector('[data-progress-fill]')
  var progressPct = root.querySelector('[data-progress-pct]')
  var live = root.querySelector('[data-live]')
  var linkBtn = root.querySelector('[data-link]')
  var linkMain = root.querySelector('[data-link-main]')
  var linkCn = root.querySelector('[data-link-cn]')
  var linkStep = root.querySelector('[data-link-step]')
  var linkHintText = root.querySelector('[data-link-hint-text]')
  var linkHintCn = root.querySelector('[data-link-hint-cn]')
  var diagBtn = root.querySelector('[data-diag]')
  var roStatus = root.querySelector('[data-ro-status]')
  var roNode = root.querySelector('[data-ro-node]')
  var ghostC = root.querySelector('[data-ghost="C"]')
  var clockEl = root.querySelector('[data-clock]')
  var stepEls = root.querySelectorAll('[data-step]')
  var radar = root.querySelector('[data-radar]')
  var radarSvg = root.querySelector('[data-radar-svg]')
  var moduleEls = root.querySelectorAll('[data-mod]')
  var wakeBtn = root.querySelector('[data-wake]')
  var logoWrap = root.querySelector('.efs-corner-brand__logo-wrap')

  /* ── 状态 ─────────────────────────────────────────────────────────────── */
  var phase = 'A'
  var authorized = false
  var busy = false
  var exiting = false
  var modalOpen = false
  var stageDStarted = false
  var gateStep = 0          // 0 等待授权 / 1 二次确认 / 2 逐项核验 / 3 已授权待进入 / 4 加载
  var initReady = false
  var wakeReady = false
  var scanned = 0
  var voice05Played = false
  var introActive = false
  var introFlying = false
  var introTimer1 = 0
  var introTimer2 = 0
  var clockTimer = 0
  var confirmRaf = 0
  var confirmStartedAt = 0
  var CONFIRM_MS = 6000
  var timers = []
  var rafId = 0
  var pctTimer = 0
  var lastPct = 0
  var labelMode = 0
  var pointerArmed = false

  /* ── 工具 ─────────────────────────────────────────────────────────────── */
  function clamp(n, lo, hi, fallback) {
    if (!Number.isFinite(n)) return fallback
    return Math.min(hi, Math.max(lo, n))
  }
  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms) })
  }
  function later(fn, ms) {
    var id = setTimeout(function () {
      timers = timers.filter(function (x) { return x !== id })
      fn()
    }, ms)
    timers.push(id)
    return id
  }
  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id) })
    timers = []
  }
  function asset(name) {
    if (STANDALONE && STANDALONE.assets && STANDALONE.assets[name]) return STANDALONE.assets[name]
    return cfg.routeBase + '/asset/' + name
  }
  function pad(n) { return n < 10 ? '0' + n : String(n) }
  function announce(text) {
    if (!live) return
    live.textContent = ''
    live.textContent = text
  }
  function hasClass(el, name) { return !!(el && el.classList && el.classList.contains(name)) }

  /* ── 等高线：程序化生成，低透明度 ─────────────────────────────────────── */
  function mulberry32(seed) {
    return function () {
      seed |= 0
      seed = seed + 0x6d2b79f5 | 0
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed)
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
      return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
  }
  function buildContours() {
    var svg = root.querySelector('[data-contours] svg')
    if (!svg) return
    var NS = 'http://www.w3.org/2000/svg'
    var rand = mulberry32(0xe1d2026)
    var groups = [
      { cx: 0.16, cy: 0.25, rx: 0.035, ry: 0.035, rings: 9, sx: 0.026, sy: 0.030, rot: -0.18 },
      { cx: 0.79, cy: 0.66, rx: 0.030, ry: 0.040, rings: 9, sx: 0.025, sy: 0.028, rot: 0.42 },
      { cx: 0.56, cy: 0.08, rx: 0.020, ry: 0.014, rings: 6, sx: 0.030, sy: 0.024, rot: 0.08 },
      { cx: 0.08, cy: 0.88, rx: 0.026, ry: 0.018, rings: 5, sx: 0.026, sy: 0.026, rot: -0.5 },
      { cx: 0.94, cy: 0.18, rx: 0.018, ry: 0.026, rings: 4, sx: 0.022, sy: 0.030, rot: 0.3 }
    ]
    groups.forEach(function (g, gi) {
      for (var k = 0; k < g.rings; k++) {
        var path = document.createElementNS(NS, 'path')
        path.setAttribute('d', contourPath(g, k, gi, rand))
        svg.appendChild(path)
      }
    })
  }
  function contourPath(g, k, gi, rand) {
    var cx = g.cx * 1600
    var cy = g.cy * 1000
    var rx = (g.rx + k * g.sx) * 1600
    var ry = (g.ry + k * g.sy) * 1000
    var points = []
    var n = 22
    var wob = 0.08 + k * 0.004
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2
      var noise = 1 +
        Math.sin(a * 3 + gi * 1.7 + k * 0.22) * wob +
        Math.cos(a * 5 - gi * 0.9 + k * 0.13) * wob * 0.55 +
        (rand() - 0.5) * wob * 0.5
      var x = Math.cos(a) * rx * noise
      var y = Math.sin(a) * ry * noise
      var cs = Math.cos(g.rot)
      var sn = Math.sin(g.rot)
      points.push({ x: cx + x * cs - y * sn, y: cy + x * sn + y * cs })
    }
    return smoothClosed(points)
  }
  function smoothClosed(p) {
    var n = p.length
    var d = 'M' + p[0].x.toFixed(1) + ' ' + p[0].y.toFixed(1)
    for (var i = 0; i < n; i++) {
      var p0 = p[(i - 1 + n) % n]
      var p1 = p[i]
      var p2 = p[(i + 1) % n]
      var p3 = p[(i + 2) % n]
      var c1x = p1.x + (p2.x - p0.x) / 6
      var c1y = p1.y + (p2.y - p0.y) / 6
      var c2x = p2.x - (p3.x - p1.x) / 6
      var c2y = p2.y - (p3.y - p1.y) / 6
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' +
        c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' +
        p2.x.toFixed(1) + ' ' + p2.y.toFixed(1)
    }
    return d + 'Z'
  }

  /* ── 音频引擎 ─────────────────────────────────────────────────────────── */
  var audio = (function () {
    var armed = false
    var muted = false
    var bgmEl = null
    var bgmTarget = 0
    var bgmFade = 0
    var currentVoice = null
    var voiceResolver = null
    var sfxEls = {}
    var voiceEls = {}

    function init() {
      if (cfg.bgm) {
        bgmEl = new Audio(asset('bgm.mp3'))
        bgmEl.loop = true
        bgmEl.preload = 'auto'
        bgmEl.volume = 0
      }
      sfxEls['ui-confirm'] = new Audio(asset('ui-confirm.mp3'))
      sfxEls['ui-click'] = new Audio(asset('ui-click.mp3'))
      sfxEls['link'] = new Audio(asset('link.mp3'))
      sfxEls['auth-granted'] = new Audio(asset('auth-granted.mp3'))
      for (var i = 1; i <= 5; i++) {
        var el = new Audio(asset('voice-0' + i + '.mp3'))
        el.preload = 'auto'
        el.volume = cfg.voiceVolume
        voiceEls['voice-0' + i] = el
      }
      updateButton()
    }
    function active() { return armed && !muted }
    function updateButton() {
      var on = active()
      audioBtn.classList.toggle('is-active', on)
      audioLabel.textContent = on ? 'AUDIO: ACTIVE' : 'AUDIO: STANDBY'
      if (audioCn) audioCn.textContent = on ? '音频已启用' : '音频待机'
      audioBtn.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
    function fadeTo(target, ms) {
      if (!bgmEl) return
      bgmTarget = target
      if (bgmFade) cancelAnimationFrame(bgmFade)
      var from = bgmEl.volume
      var t0 = performance.now()
      function step(now) {
        var t = Math.min(1, (now - t0) / Math.max(1, ms))
        bgmEl.volume = Math.max(0, Math.min(1, from + (target - from) * t))
        if (t < 1) bgmFade = requestAnimationFrame(step)
        else bgmFade = 0
      }
      bgmFade = requestAnimationFrame(step)
    }
    function startBgm() {
      if (!bgmEl || !cfg.bgm) return
      bgmEl.volume = 0
      var p = bgmEl.play()
      if (p && p.catch) p.catch(function () { /* 自动播放被拦截就保持静音 */ })
      fadeTo(cfg.bgmVolume, 900)
    }
    function stopBgm() {
      if (!bgmEl) return
      fadeTo(0, 380)
      setTimeout(function () {
        if (bgmEl && bgmEl.volume <= 0.01) bgmEl.pause()
      }, 420)
    }
    function arm() {
      if (armed) { muted = false; updateButton(); if (bgmEl && bgmEl.paused) startBgm(); return }
      armed = true
      muted = false
      updateButton()
      startBgm()
    }
    function autostart() {
      if (armed) return
      armed = true
      muted = false
      updateButton()
      if (!bgmEl || !cfg.bgm) return
      bgmEl.volume = 0
      var p = bgmEl.play()
      if (p && p.then) {
        p.then(function () { fadeTo(cfg.bgmVolume, 1200) }).catch(function () {
          armed = false
          updateButton()
        })
      } else {
        fadeTo(cfg.bgmVolume, 1200)
      }
    }
    function toggle() {
      if (!armed) { arm(); return }
      if (!muted) {
        muted = true
        updateButton()
        if (bgmEl) bgmEl.pause()
      } else {
        muted = false
        updateButton()
        startBgm()
      }
    }
    function duck(on) {
      if (!bgmEl || muted) return
      fadeTo(cfg.bgmVolume * (on ? 0.26 : 1), 180)
    }
    function playEl(el, timeout, done) {
      if (!el) { done(false); return }
      var finished = false
      var to = 0
      function finish(ok) {
        if (finished) return
        finished = true
        if (to) clearTimeout(to)
        el.removeEventListener('ended', onEnd)
        el.removeEventListener('error', onErr)
        done(ok)
      }
      function onEnd() { finish(true) }
      function onErr() { finish(false) }
      el.addEventListener('ended', onEnd)
      el.addEventListener('error', onErr)
      to = setTimeout(function () { finish(false) }, timeout)
      try {
        el.currentTime = 0
        el.volume = cfg.voiceVolume
        var p = el.play()
        if (p && p.catch) p.catch(function () { finish(false) })
      } catch (e) { finish(false) }
    }
    function speakTts(text) {
      return new Promise(function (resolve) {
        var synth = window.speechSynthesis
        if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
          wait(600).then(resolve)
          return
        }
        duck(true)
        var finished = false
        var u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-US'
        u.rate = cfg.voiceRate
        u.pitch = cfg.voicePitch
        u.volume = cfg.voiceVolume
        var voices = []
        try { voices = synth.getVoices() || [] } catch (e) { voices = [] }
        var en = voices.filter(function (v) { return /^en[-_]/i.test(v.lang || '') })
        var female = en.filter(function (v) { return /zira|samantha|aria|jenny|female|natural|neural/i.test(v.name || '') })
        var neutral = en.filter(function (v) { return /david|guy|george|daniel|alex|male/i.test(v.name || '') })
        u.voice = female[0] || en[0] || neutral[0] || null
        function finish() {
          if (finished) return
          finished = true
          duck(false)
          currentVoice = null
          voiceResolver = null
          resolve()
        }
        u.onend = finish
        u.onerror = finish
        currentVoice = { tts: true, cancel: function () { try { synth.cancel() } catch (e) {} finish() } }
        voiceResolver = finish
        try { synth.cancel(); synth.speak(u) } catch (e) { finish() }
        setTimeout(function () { if (!finished) { try { synth.cancel() } catch (e) {} finish() } }, Math.max(2600, text.length * 120))
      })
    }
    function speak(name, text) {
      if (!active() || !cfg.voice) return Promise.resolve()
      cancelVoice()
      if (cfg.voiceSource === 'tts') return speakTts(text)
      var el = voiceEls[name]
      if (!el) return speakTts(text)
      return new Promise(function (resolve) {
        duck(true)
        playEl(el, Math.max(6000, text.length * 160), function (ok) {
          currentVoice = null
          voiceResolver = null
          duck(false)
          if (ok) { resolve(); return }
          speakTts(text).then(resolve)
        })
        currentVoice = {
          tts: false,
          cancel: function () {
            try { el.pause() } catch (e) {}
            duck(false)
            resolve()
          }
        }
        voiceResolver = resolve
      })
    }
    function sfx(name) {
      if (!active() || !cfg.sfx) return wait(260)
      var el = sfxEls[name]
      if (!el) return wait(240)
      return new Promise(function (resolve) {
        var finished = false
        function finish() {
          if (finished) return
          finished = true
          resolve()
        }
        el.pause()
        try { el.currentTime = 0 } catch (e) {}
        el.volume = cfg.sfxVolume
        el.addEventListener('ended', finish, { once: true })
        el.addEventListener('error', finish, { once: true })
        var p = el.play()
        if (p && p.catch) p.catch(finish)
        setTimeout(finish, 1300)
      })
    }
    function cancelVoice() {
      if (!currentVoice) return
      var resolver = voiceResolver
      try { currentVoice.cancel() } catch (e) {}
      currentVoice = null
      voiceResolver = null
      if (resolver) { try { resolver() } catch (e) {} }
    }
    function stopAll() {
      cancelVoice()
      if (bgmEl) { try { bgmEl.pause() } catch (e) {} }
      Object.keys(sfxEls).forEach(function (k) { try { sfxEls[k].pause() } catch (e) {} })
    }
    return {
      init: init,
      arm: arm,
      autostart: autostart,
      toggle: toggle,
      updateButton: updateButton,
      active: active,
      speak: speak,
      sfx: sfx,
      duck: duck,
      cancelVoice: cancelVoice,
      stopBgm: stopBgm,
      stopAll: stopAll,
      isArmed: function () { return armed }
    }
  })()

  /* ── 阶段切换 ─────────────────────────────────────────────────────────── */
  var STEP_ORDER = ['A', 'B', 'C', 'D']
  function setStep(next) {
    var active = STEP_ORDER.indexOf(next)
    stepEls.forEach(function (el) {
      var i = STEP_ORDER.indexOf(el.getAttribute('data-step'))
      el.classList.toggle('is-active', i === active)
      el.classList.toggle('is-done', i >= 0 && i < active)
    })
  }

  function setPhase(next) {
    phase = next
    root.setAttribute('data-phase', next)
    phases.forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-phase') === next)
    })
    setStep(next)
  }

  function tickClock() {
    if (!clockEl) return
    var d = new Date()
    clockEl.textContent = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) +
      ' // ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
  }

  function buildRadar() {
    if (!radarSvg) return
    var NS = 'http://www.w3.org/2000/svg'
    function add(tag, attrs, parent) {
      var node = document.createElementNS(NS, tag)
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]) })
      ;(parent || radarSvg).appendChild(node)
      return node
    }
    var rings = add('g', { class: 'efs-radar__rings' })
    ;[176, 150, 114, 72].forEach(function (r) {
      add('circle', { cx: 180, cy: 180, r: r, fill: 'none', stroke: '#4a4d49', 'stroke-width': 1, opacity: r === 114 ? 0.55 : 0.75 }, rings)
    })
    add('circle', { cx: 180, cy: 180, r: 114, fill: 'none', stroke: '#4a4d49', 'stroke-width': 1, 'stroke-dasharray': '2 7', opacity: 0.55 }, rings)

    var ticks = add('g', { class: 'efs-radar__ticks' })
    for (var i = 0; i < 60; i++) {
      var a = (i * 6 - 90) * Math.PI / 180
      var inner = i % 5 === 0 ? 158 : 166
      var outer = 176
      add('line', {
        x1: (180 + Math.cos(a) * inner).toFixed(2),
        y1: (180 + Math.sin(a) * inner).toFixed(2),
        x2: (180 + Math.cos(a) * outer).toFixed(2),
        y2: (180 + Math.sin(a) * outer).toFixed(2),
        stroke: i % 5 === 0 ? '#898d89' : '#4a4d49',
        'stroke-width': 1,
        opacity: i % 5 === 0 ? 0.8 : 0.5
      }, ticks)
    }

    var cross = add('g', { class: 'efs-radar__cross' })
    ;[
      [180, 4, 180, 32], [180, 328, 180, 356],
      [4, 180, 32, 180], [328, 180, 356, 180]
    ].forEach(function (c) {
      add('line', { x1: c[0], y1: c[1], x2: c[2], y2: c[3], stroke: '#f5f5f0', 'stroke-width': 1, opacity: 0.55 }, cross)
    })

    var labels = [
      { x: 180, y: 14, t: '00' }, { x: 350, y: 184, t: '09' },
      { x: 180, y: 356, t: '18' }, { x: 10, y: 184, t: '27' }
    ]
    labels.forEach(function (l) {
      add('text', {
        x: l.x, y: l.y, fill: '#898d89', 'font-size': 7, 'font-family': 'Consolas, monospace',
        'letter-spacing': '0.12em', 'text-anchor': 'middle'
      }, radarSvg).textContent = l.t
    })

    add('circle', {
      class: 'efs-radar__ready-ring', cx: 180, cy: 180, r: 150,
      fill: 'none', stroke: '#fff500', 'stroke-width': 1,
      'stroke-dasharray': 942, 'stroke-dashoffset': 942,
      transform: 'rotate(-90 180 180)'
    }, radarSvg)

    var sweep = add('g', { class: 'efs-radar__sweep' })
    add('path', {
      d: 'M180 180 L180 14 A166 166 0 0 1 298 66 Z',
      fill: 'rgba(255,245,0,0.07)', stroke: 'none'
    }, sweep)
    add('line', { x1: 180, y1: 180, x2: 180, y2: 14, stroke: '#fff500', 'stroke-width': 1, opacity: 0.65 }, sweep)
  }

  function start() {
    audio.init()
    audio.autostart()
    buildContours()
    buildRadar()
    tickClock()
    clockTimer = setInterval(tickClock, 1000)
    requestAnimationFrame(function () { grid.classList.add('is-on') })

    if (reduced) {
      /* reduced motion：跳过绘制与扫屏，直接呈现阶段 C 静态门控 */
      paintTerminal()
      setPhase('C')
      gateEnter()
      return
    }

    setPhase('A')
    runIntro()
  }

  function runIntro() {
    if (!logoWrap) {
      typeTerminal()
      return
    }
    introActive = true
    root.classList.add('is-intro')
    var rect = logoWrap.getBoundingClientRect()
    var scale = Math.min(2.3, Math.max(1.6, (window.innerHeight * 0.36) / Math.max(1, rect.height)))
    var tx = Math.round(window.innerWidth / 2 - (rect.left + rect.width / 2))
    var ty = Math.round(window.innerHeight / 2 - (rect.top + rect.height / 2))
    logoWrap.style.transition = 'none'
    logoWrap.style.transformOrigin = 'center center'
    logoWrap.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')'
    introTimer1 = setTimeout(beginIntroFly, 1250)
  }

  function beginIntroFly() {
    if (!introActive || introFlying) return
    introFlying = true
    if (introTimer1) { clearTimeout(introTimer1); introTimer1 = 0 }
    root.classList.remove('is-intro')
    if (logoWrap) {
      logoWrap.style.transition = 'transform 920ms cubic-bezier(0.22, 0.8, 0.2, 1)'
      logoWrap.style.transform = 'translate3d(0,0,0) scale(1)'
    }
    introTimer2 = setTimeout(finishIntro, 940)
  }

  function finishIntro() {
    if (introTimer2) { clearTimeout(introTimer2); introTimer2 = 0 }
    if (logoWrap) {
      logoWrap.style.transition = ''
      logoWrap.style.transform = ''
    }
    introActive = false
    introFlying = false
    typeTerminal()
  }

  function skipIntro() {
    if (introActive && !introFlying) beginIntroFly()
  }

  function paintTerminal() {
    root.querySelectorAll('[data-line]').forEach(function (line, i) {
      line.querySelector('.efs-terminal__text').textContent = LINES[i].en.replace(/^> /, '')
      line.classList.add('is-done')
      if (i === LINES.length - 1) line.classList.add('is-active')
    })
  }

  function typeTerminal() {
    var lineEls = root.querySelectorAll('[data-line]')
    var lineIndex = 0
    function typeLine() {
      if (lineIndex >= lineEls.length || exiting) return
      var el = lineEls[lineIndex]
      var text = LINES[lineIndex].en.replace(/^> /, '')
      var textEl = el.querySelector('.efs-terminal__text')
      el.classList.add('is-active')
      var i = 0
      function tick() {
        if (exiting) return
        if (i <= text.length) {
          textEl.textContent = text.slice(0, i)
          i++
          later(tick, 11)
        } else {
          el.classList.remove('is-active')
          el.classList.add('is-done')
          lineIndex++
          if (lineIndex < lineEls.length) later(typeLine, 90)
          else {
            el.classList.add('is-active')
            later(enableWake, 180)
          }
        }
      }
      tick()
    }
    typeLine()
  }

  function enableWake() {
    if (wakeReady || exiting) return
    wakeReady = true
    if (wakeBtn) {
      wakeBtn.disabled = false
      wakeBtn.classList.add('is-ready')
    }
    announce('安全终端已就绪。按 Enter 或点击 WAKE TERMINAL 唤醒终端。')
  }

  function wake() {
    if (phase !== 'A' || !wakeReady || busy || authorized || exiting) return
    audio.arm()
    audio.sfx('ui-click')
    audio.speak('voice-01', VOICE[1])
    setPhase('B')
    showB()
  }

  function showB() {
    if (phase !== 'B' || busy || authorized || exiting) return
    linkBtn.disabled = true
    linkBtn.classList.remove('is-ready', 'is-linked')
    if (radar) {
      radar.disabled = true
      radar.classList.remove('is-ready', 'is-locked')
    }
    if (linkMain) linkMain.textContent = 'ESTABLISH TERMINAL LINK'
    if (linkCn) linkCn.textContent = '建立终端链路'
    if (linkHintText) linkHintText.textContent = 'LINK STANDBY'
    if (linkHintCn) linkHintCn.textContent = '链路待建立'
    announce('终末地工业标识已显示。点击链路按钮或雷达建立终端链路。')
    later(enableLink, 900)
  }

  function enableLink() {
    if (phase !== 'B' || busy || authorized || exiting) return
    linkBtn.disabled = false
    linkBtn.classList.add('is-ready')
    if (radar) {
      radar.disabled = false
      radar.classList.add('is-ready')
    }
    if (linkHintText) linkHintText.textContent = 'LINK READY'
    if (linkHintCn) linkHintCn.textContent = '链路就绪'
    announce('终端链路就绪。点击 ESTABLISH TERMINAL LINK 或雷达，进入授权门控。')
  }

  function establishLink() {
    if (phase !== 'B' || busy || authorized || exiting || linkBtn.disabled) return
    if (radar && radar.disabled) return
    audio.arm()
    audio.sfx('link')
    linkBtn.disabled = true
    linkBtn.classList.remove('is-ready')
    linkBtn.classList.add('is-linked')
    if (radar) {
      radar.disabled = true
      radar.classList.remove('is-ready')
      radar.classList.add('is-locked')
    }
    if (linkMain) linkMain.textContent = 'LINK ESTABLISHED'
    if (linkCn) linkCn.textContent = '终端链路已建立'
    if (linkHintText) linkHintText.textContent = 'TERMINAL LINK ESTABLISHED'
    if (linkHintCn) linkHintCn.textContent = '链路已建立，正在进入授权门控'
    announce('终端链路已建立，正在进入 ENDMINISTRATOR 授权门控。')
    later(goC, 420)
  }

  function goC() {
    if (phase !== 'B' || busy || authorized || exiting) return
    clearTimers()
    setPhase('C')
    gateEnter()
  }

  function gateEnter() {
    gateStep = 0
    busy = false
    initReady = false
    scanned = 0
    gate.classList.remove('is-verifying', 'is-granted', 'is-compact')
    gate.classList.add('is-unauth')
    authStatus.textContent = 'CLEARANCE LEVEL: PENDING'
    if (authStatusCn) authStatusCn.textContent = '权限等级：待授权'
    authStatus.classList.remove('is-granted')
    authDot.classList.remove('is-signal')
    authHint.classList.remove('is-signal')
    authHintText.textContent = 'AWAITING AUTHORIZATION'
    if (authHintCn) authHintCn.textContent = '等待授权'
    authBtn.disabled = false
    authBtn.classList.remove('is-confirm', 'is-ready')
    authBtn.removeAttribute('aria-hidden')
    setAuthButton('AUTHORIZE ENDMINISTRATOR ACCESS', '授权终端管理员接入', '01 / 02')
    perms.forEach(function (row) {
      row.disabled = true
      row.classList.remove('is-granted', 'is-scannable')
      var state = row.querySelector('.efs-perm__state')
      if (state) state.innerHTML = 'PENDING <em>待授权</em>'
    })
    hideConfirm()
    if (diagBtn) diagBtn.disabled = false
    if (roStatus) roStatus.textContent = 'STANDBY / 待机'
    announce('身份 ENDMINISTRATOR。权限等级待授权，请完成身份核验。')
  }

  function setAuthButton(main, cn, step) {
    authLabel.textContent = main
    if (authCn) authCn.textContent = cn
    if (authStep) authStep.textContent = step
  }

  function clearConfirmCountdown() {
    if (confirmRaf) {
      cancelAnimationFrame(confirmRaf)
      confirmRaf = 0
    }
  }

  function showConfirmWindow() {
    if (!confirm) return
    confirm.classList.add('is-on')
    confirm.setAttribute('aria-hidden', 'false')
    clearConfirmCountdown()
    confirmStartedAt = performance.now()
    if (confirmFill) confirmFill.style.width = '100%'
    if (confirmCount) confirmCount.textContent = '06'
    function step(now) {
      var remain = Math.max(0, CONFIRM_MS - (now - confirmStartedAt))
      if (confirmFill) confirmFill.style.width = (remain / CONFIRM_MS * 100).toFixed(2) + '%'
      if (confirmCount) confirmCount.textContent = ('0' + Math.ceil(remain / 1000)).slice(-2)
      if (remain <= 0) {
        confirmRaf = 0
        cancelConfirm('AUTHORIZATION WINDOW CLOSED', '授权窗口已关闭')
        return
      }
      confirmRaf = requestAnimationFrame(step)
    }
    confirmRaf = requestAnimationFrame(step)
  }

  function hideConfirm() {
    clearConfirmCountdown()
    if (!confirm) return
    confirm.classList.remove('is-on')
    confirm.setAttribute('aria-hidden', 'true')
  }

  /* ── 两步门控：第一次确认 → 第二次确认才进入核验 ─────────────────────── */
  function requestAuthorization() {
    if (exiting) return
    if (authorized) {
      if (gateStep === 3 && initReady) startLoading()
      return
    }
    if (busy) return
    if (gateStep === 0) { enterConfirmStep(); return }
    if (gateStep === 1) { startVerification(); return }
  }

  function enterConfirmStep() {
    if (authorized || busy || exiting) return
    if (gateStep === 3) { if (initReady) startLoading(); return }
    if (gateStep === 1) { startVerification(); return }
    if (gateStep === 2) return
    if (phase !== 'C') {
      clearTimers()
      audio.cancelVoice()
      setPhase('C')
      gateEnter()
    }
    audio.arm()
    gateStep = 1
    closeModal()
    setAuthButton('CONFIRM ENDMINISTRATOR IDENTITY', '再次确认终端管理员身份', '02 / 02')
    authBtn.disabled = false
    authBtn.classList.add('is-confirm')
    authBtn.classList.remove('is-ready')
    if (diagBtn) diagBtn.disabled = true
    authHint.classList.remove('is-signal')
    authHintText.textContent = 'SECOND CONFIRMATION REQUIRED'
    if (authHintCn) authHintCn.textContent = '需要二次确认'
    showConfirmWindow()
    announce('已捕获终端管理员签名。请再次确认身份，核验才会开始。')
    audio.speak('voice-02', VOICE[2])
  }

  function cancelConfirm(main, cn) {
    if (gateStep !== 1) return
    hideConfirm()
    gateStep = 0
    audio.cancelVoice()
    authBtn.classList.remove('is-confirm', 'is-ready')
    authBtn.disabled = false
    setAuthButton('AUTHORIZE ENDMINISTRATOR ACCESS', '授权终端管理员接入', '01 / 02')
    authHintText.textContent = main || 'AWAITING AUTHORIZATION'
    if (authHintCn) authHintCn.textContent = cn || '等待授权'
    authStatus.textContent = 'CLEARANCE LEVEL: PENDING'
    if (authStatusCn) authStatusCn.textContent = '权限等级：待授权'
    if (diagBtn) diagBtn.disabled = false
    if (roStatus) roStatus.textContent = 'STANDBY / 待机'
    announce('授权已取消，终端仍在等待身份确认。')
  }

  function startVerification() {
    if (gateStep !== 1 || authorized || busy || exiting) return
    hideConfirm()
    gateStep = 2
    busy = true
    scanned = 0
    audio.arm()
    gate.classList.remove('is-unauth', 'is-granted')
    gate.classList.add('is-verifying')
    authBtn.disabled = true
    authBtn.classList.remove('is-confirm', 'is-ready')
    setAuthButton('AUTO-SCANNING 0 / 3', '自动扫描三项权限', '00 / 03')
    authHintText.textContent = 'AUTO-SCANNING PERMISSIONS'
    if (authHintCn) authHintCn.textContent = '自动扫描中 · 每秒一项'
    announce('开始自动扫描三项权限，每秒一项：终端控制、档案访问、协议接管。')
    perms.forEach(function (row) {
      if (row.classList.contains('is-granted')) return
      row.disabled = false
      row.classList.add('is-scannable')
      var state = row.querySelector('.efs-perm__state')
      if (state) state.innerHTML = 'SCAN <em>扫描</em>'
    })
    for (var i = 0; i < 3; i++) {
      (function (idx) {
        later(function () { scanPermission(idx) }, 1000 * (idx + 1))
      })(i)
    }
  }

  function scanPermission(index) {
    if (gateStep !== 2 || authorized || exiting) return
    var row = perms[index]
    if (!row || row.classList.contains('is-granted')) return
    audio.arm()
    scanned++
    row.classList.remove('is-scannable')
    row.classList.add('is-granted')
    row.disabled = true
    var state = row.querySelector('.efs-perm__state')
    if (state) state.innerHTML = 'GRANTED <em>已授权</em>'
    audio.sfx(scanned >= 3 ? 'auth-granted' : 'ui-confirm')
    if (scanned < 3) {
      setAuthButton('AUTO-SCANNING ' + scanned + ' / 3', '自动扫描权限 ' + scanned + ' / 3', pad(scanned) + ' / 03')
    }
    announce('权限 ' + pad(index + 1) + ' 已授权。')
    if (scanned >= 3) grant()
  }

  function grant() {
    if (authorized || exiting) return
    authorized = true
    busy = false
    gateStep = 3
    initReady = true
    gate.classList.remove('is-unauth', 'is-verifying')
    gate.classList.add('is-granted')
    authDot.classList.add('is-signal')
    authStatus.textContent = 'CLEARANCE LEVEL: GRANTED'
    if (authStatusCn) authStatusCn.textContent = '权限等级：已授权'
    authStatus.classList.add('is-granted')
    authBtn.disabled = false
    authBtn.classList.add('is-ready')
    setAuthButton('INITIALIZE DEEPSEEK HARNESS', '初始化 Harness 终端', '03 / 03')
    authHint.classList.add('is-signal')
    authHintText.textContent = 'READY TO ENTER HARNESS'
    if (authHintCn) authHintCn.textContent = '点击进入 Harness'
    perms.forEach(function (row) {
      row.classList.remove('is-scannable')
      row.disabled = true
    })
    announce('授权完成。点击 INITIALIZE DEEPSEEK HARNESS 进入加载阶段。')
    audio.speak('voice-03', VOICE[3])
  }

  /* ── 阶段 D：加载与退场 ───────────────────────────────────────────────── */
  function startLoading() {
    if (!authorized || !initReady || gateStep !== 3 || exiting || stageDStarted) return
    stageDStarted = true
    gateStep = 4
    hideConfirm()
    root.classList.add('is-loading')
    gate.classList.add('is-compact')
    setStep('D')
    var corner = root.querySelector('.efs-phase--c .efs-stage-corner')
    if (corner) corner.textContent = '04 / LOAD · 加载'
    if (ghostC) ghostC.textContent = '04'
    authBtn.disabled = true
    authBtn.setAttribute('aria-hidden', 'true')
    root.classList.add('is-scanning')
    later(function () { root.classList.remove('is-scanning') }, 1600)
    loadText.textContent = 'LOADING DEEPSEEK HARNESS MODULES'
    if (loadCn) loadCn.textContent = '正在加载 Harness 模块'
    loadPct.textContent = '0%'
    loadSub.textContent = 'INDUSTRIAL GRID // 校准工业网格'
    announce('终端管理员授权已确认，正在加载 DeepSeek Harness 模块。')
    audio.cancelVoice()
    audio.speak('voice-04', VOICE[4])

    var duration = reduced ? 480 : 3350
    var startedAt = performance.now()
    var last = -1
    labelMode = 0
    pctTimer = setInterval(function () {
      labelMode = labelMode ? 0 : 1
      renderLoading(lastPct)
    }, 900)

    function frame(now) {
      var t = Math.min(1, (now - startedAt) / duration)
      var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      var pct = Math.round(eased * 100)
      if (pct !== last) {
        last = pct
        lastPct = pct
        renderLoading(pct)
      }
      if (!voice05Played && pct >= 90) {
        voice05Played = true
        audio.speak('voice-05', VOICE[5])
      }
      if (t < 1) {
        rafId = requestAnimationFrame(frame)
      } else {
        lastPct = 100
        renderLoading(100)
        if (!voice05Played) {
          voice05Played = true
          audio.speak('voice-05', VOICE[5])
        }
        root.classList.add('is-complete')
        later(function () { finish(false) }, reduced ? 260 : 760)
      }
    }
    rafId = requestAnimationFrame(frame)
  }

  function renderLoading(pct) {
    if (!isFinite(pct)) pct = 0
    progressFill.style.width = pct + '%'
    progressPct.textContent = pct + '%'
    loadPct.textContent = pct + '%'
    var activeMods = pct >= 100 ? 5 : Math.floor(pct / 20)
    moduleEls.forEach(function (el, i) {
      el.classList.toggle('is-on', i < activeMods)
    })
    if (pct >= 100) {
      progressLabel.innerHTML = 'ALL SYSTEMS NOMINAL <span class="efs-cn">全部系统正常</span> <strong>// 100%</strong>'
      loadText.textContent = 'ALL SYSTEMS NOMINAL'
      if (loadCn) loadCn.textContent = '全部系统正常'
      loadSub.textContent = 'HARNESS PROTOCOL // 协议接管完成'
      return
    }
    if (labelMode === 1) {
      progressLabel.innerHTML = '<strong>' + pct + '%</strong> // CALIBRATING INDUSTRIAL GRID <span class="efs-cn">校准工业网格</span>'
      loadSub.textContent = 'CALIBRATING INDUSTRIAL GRID // 校准工业网格'
    } else {
      progressLabel.innerHTML = 'LOADING DEEPSEEK HARNESS MODULES <span class="efs-cn">正在加载 Harness 模块</span>'
      loadSub.textContent = 'INDUSTRIAL GRID // 校准工业网格'
    }
  }

  /* ── 遮罩 / SKIP ──────────────────────────────────────────────────────── */
  function openModal() {
    if (authorized || exiting) return
    modal.classList.add('is-open')
    modal.setAttribute('aria-hidden', 'false')
    modalOpen = true
    announce('必须完成 ENDMINISTRATOR 授权后才能继续。')
    setTimeout(function () {
      try { modalBtn.focus({ preventScroll: true }) } catch (e) { /* noop */ }
    }, 40)
  }
  function closeModal() {
    if (!modalOpen) return
    modal.classList.remove('is-open')
    modal.setAttribute('aria-hidden', 'true')
    modalOpen = false
  }
  function requestSkip() {
    if (exiting) return
    if (!authorized) { openModal(); return }
    finish(true)
  }

  function finish(skipped) {
    if (exiting) return
    if (!authorized) { openModal(); return }
    exiting = true
    busy = false
    gateStep = 5
    clearTimers()
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    if (pctTimer) { clearInterval(pctTimer); pctTimer = 0 }
    closeModal()
    if (skipped) audio.stopAll()
    else audio.stopBgm()
    root.classList.add('is-blackout')
    announce('DeepSeek Harness is now under Endministrator control.')
    if (reduced) {
      setTimeout(teardown, 210)
      return
    }
    setTimeout(function () {
      root.classList.add('is-exit')
      setTimeout(teardown, 780)
    }, 200)
  }

  function teardown() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = 0 }
    if (confirmRaf) { cancelAnimationFrame(confirmRaf); confirmRaf = 0 }
    if (introTimer1) { clearTimeout(introTimer1); introTimer1 = 0 }
    if (introTimer2) { clearTimeout(introTimer2); introTimer2 = 0 }
    try {
      var done = new Date().toISOString().slice(0, 10)
      if (cfg.mode === 'session') window.sessionStorage.setItem(SESSION_DONE, '1')
      if (cfg.mode === 'daily') window.localStorage.setItem(DAY_DONE, done)
    } catch (e) { /* 隐私模式忽略 */ }
    try { window.__ENDFIELD_STARTUP_DONE__ = true } catch (e) { /* noop */ }
    try {
      document.documentElement.classList.remove('efs-lock')
      document.documentElement.style.overflow = ''
      if (document.body) {
        document.body.style.overflow = ''
        document.body.style.overflowX = ''
      }
    } catch (e) { /* noop */ }
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('pointerdown', onFirstGesture, true)
    try {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
    } catch (e) { /* noop */ }
    if (root.parentNode) root.parentNode.removeChild(root)
  }

  /* ── 事件 ─────────────────────────────────────────────────────────────── */
  function onFirstGesture(e) {
    if (e && e.target && e.target.closest && e.target.closest('[data-audio]')) return
    if (introActive) skipIntro()
    audio.arm()
    pointerArmed = true
    document.removeEventListener('pointerdown', onFirstGesture, true)
    document.removeEventListener('keydown', onFirstGesture, true)
  }

  function onKey(e) {
    if (exiting) return
    var key = e.key
    if (introActive) {
      if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Escape') {
        e.preventDefault()
        skipIntro()
      }
      return
    }
    if (modalOpen) {
      if (key === 'Escape') { e.preventDefault(); return }
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault()
        modalBtn.click()
      }
      return
    }
    if (key === 'Escape') {
      e.preventDefault()
      requestSkip()
      return
    }
    if (phase === 'A') {
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        if (e.target && e.target.closest && e.target.closest('button')) return
        e.preventDefault()
        wake()
      }
      return
    }
    if (phase === 'B') {
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        if (e.target && e.target.closest && e.target.closest('button')) return
        e.preventDefault()
        if (!linkBtn.disabled) establishLink()
      }
      return
    }
    if (!authorized && !busy && (key === 'Enter' || key === ' ' || key === 'Spacebar')) {
      if (e.target && e.target.closest && e.target.closest('button')) return
      e.preventDefault()
      requestAuthorization()
      return
    }
    if (authorized && !stageDStarted && (key === 'Enter' || key === ' ' || key === 'Spacebar')) {
      if (e.target && e.target.closest && e.target.closest('button')) return
      e.preventDefault()
      if (initReady) startLoading()
    }
  }

  function runDiagnostic() {
    if (exiting || gateStep !== 0 || busy) return
    audio.arm()
    audio.sfx('ui-click')
    diagBtn.disabled = true
    roStatus.textContent = 'SCANNING... / 扫描中'
    if (roNode) roNode.classList.add('is-on')
    later(function () { audio.sfx('ui-confirm') }, 320)
    later(function () { audio.sfx('link') }, 720)
    later(function () {
      roStatus.textContent = 'NOMINAL / 正常'
      if (gateStep === 0) diagBtn.disabled = false
    }, 1150)
  }

  skipBtn.addEventListener('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    audio.arm()
    audio.sfx('ui-click')
    requestSkip()
  })
  authBtn.addEventListener('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    audio.arm()
    audio.sfx('ui-click')
    requestAuthorization()
  })
  modalBtn.addEventListener('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    audio.arm()
    audio.sfx('ui-click')
    if (busy) { closeModal(); return }
    if (!authorized && gateStep === 1) { closeModal(); return }
    closeModal()
    if (!authorized && gateStep === 0) enterConfirmStep()
  })
  confirmCancel.addEventListener('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    audio.arm()
    audio.sfx('ui-click')
    cancelConfirm('AUTHORIZATION CANCELLED', '授权已取消')
  })
  if (linkBtn) {
    linkBtn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      establishLink()
    })
  }
  if (radar) {
    radar.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      establishLink()
    })
  }
  if (wakeBtn) {
    wakeBtn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      wake()
    })
  }
  perms.forEach(function (row, i) {
    row.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      scanPermission(i)
    })
  })
  if (diagBtn) {
    diagBtn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      runDiagnostic()
    })
  }
  audioBtn.addEventListener('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    if (!pointerArmed) {
      pointerArmed = true
      document.removeEventListener('pointerdown', onFirstGesture, true)
      document.removeEventListener('keydown', onFirstGesture, true)
    }
    var wasActive = audio.active()
    if (wasActive) audio.sfx('ui-click')
    audio.toggle()
    if (!wasActive) audio.sfx('ui-click')
  })
  document.addEventListener('pointerdown', onFirstGesture, true)
  document.addEventListener('keydown', onFirstGesture, true)
  document.addEventListener('keydown', onKey, true)

  /* ── 对外 API ─────────────────────────────────────────────────────────── */
  function replay() {
    try {
      window.sessionStorage.removeItem(SESSION_DONE)
      window.localStorage.removeItem(DAY_DONE)
    } catch (e) { /* noop */ }
    window.location.reload()
  }
  window.__DSH_STARTUP_API__ = {
    replay: replay,
    skip: requestSkip,
    finish: function () { finish(false) },
    mute: function () { audio.toggle() },
    voice: function () { return audio.active() ? 'ACTIVE' : 'STANDBY' }
  }
  window.__ENDFIELD_STARTUP_API__ = window.__DSH_STARTUP_API__

  /* ── 启动 ─────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
})()
