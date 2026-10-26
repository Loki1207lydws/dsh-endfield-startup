/* ============================================================================
 * dsh-endfield-startup — Host 半侧
 * ----------------------------------------------------------------------------
 * 1) 通过 webserver/index-inject（Electron）与 tapIndex（web）注入启动层
 * 2) 提供 /dsh-endfield-startup/splash.css · splash.js · asset/* 与 config
 * 3) 配置持久化在 ~/.dsh/dsh-endfield-startup.json
 *
 * 运行时完全由 lib/splash.js 接管；Host 只负责首屏兜底、静态资源与配置。
 * ========================================================================== */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const CONFIG_FILE = path.join(DSH_HOME, 'dsh-endfield-startup.json')
const NS = 'dsh-endfield-startup'
const ROUTE_BASE = '/dsh-endfield-startup'
const ROOT_ID = 'dsh-endfield-startup-root'

const PLUGIN_VERSION = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
    return String(pkg.version || '').trim() || '0.0.0'
  } catch (err) {
    return '0.0.0'
  }
})()

const DEFAULTS = {
  enabled: true,
  mode: 'session',          // session | always | daily
  bgm: true,
  bgmVolume: 0.4,
  sfx: true,
  sfxVolume: 0.45,
  voice: true,
  voiceSource: 'asset',     // asset | tts
  voiceVolume: 0.9,
  voiceRate: 0.9,
  voicePitch: 0.9
}

const ENUMS = {
  mode: ['session', 'always', 'daily'],
  voiceSource: ['asset', 'tts']
}
const BOOL_KEYS = ['enabled', 'bgm', 'sfx', 'voice']
const NUM_KEYS = {
  bgmVolume: [0, 1],
  sfxVolume: [0, 1],
  voiceVolume: [0, 1],
  voiceRate: [0.5, 2],
  voicePitch: [0, 2]
}

function normalize(input) {
  const out = { ...DEFAULTS }
  const src = input && typeof input === 'object' ? input : {}
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in src) || src[key] === undefined || src[key] === null) continue
    const value = src[key]
    if (BOOL_KEYS.includes(key)) {
      out[key] = value === true || value === 'true' || value === 1 || value === '1'
    } else if (ENUMS[key]) {
      out[key] = ENUMS[key].includes(value) ? value : DEFAULTS[key]
    } else if (NUM_KEYS[key]) {
      const [lo, hi] = NUM_KEYS[key]
      const n = Number(value)
      out[key] = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : DEFAULTS[key]
    } else {
      out[key] = value
    }
  }
  return out
}

function readConfig() {
  try {
    return normalize(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')))
  } catch (err) {
    return { ...DEFAULTS }
  }
}

function writeConfig(next) {
  const cfg = normalize(next)
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  const tmp = CONFIG_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8')
  fs.renameSync(tmp, CONFIG_FILE)
  return cfg
}

function makeReader(rel) {
  let cache = null
  return function read() {
    const file = path.join(PACKAGE_ROOT, rel)
    try {
      const st = fs.statSync(file)
      if (!cache || cache.mtimeMs !== st.mtimeMs) {
        cache = { mtimeMs: st.mtimeMs, text: fs.readFileSync(file, 'utf8') }
      }
      return cache.text
    } catch (err) {
      return ''
    }
  }
}

const readSplashCss = makeReader('lib/splash.css')
const readSplashJs = makeReader('lib/splash.js')

const CRITICAL_CSS = [
  'html.efs-lock,html.efs-lock body{overflow:hidden!important}',
  '#' + ROOT_ID + '.efs-boot{position:fixed;inset:0;z-index:2147483000;background:#101110;color:#f5f5f0}'
].join('')

const BOOTSTRAP_JS = `(function(){try{
var c=window.__DSH_STARTUP__||{};
var root=document.getElementById('${ROOT_ID}');
var off=!c.enabled;
if(!off&&c.mode==='session'&&sessionStorage.getItem('dsh-endfield-startup:done')==='1')off=true;
if(!off&&c.mode==='daily'&&localStorage.getItem('dsh-endfield-startup:day')===new Date().toISOString().slice(0,10))off=true;
if(off){
  window.__DSH_STARTUP_SKIP__=true;
  if(root&&root.parentNode)root.parentNode.removeChild(root);
  document.documentElement.classList.remove('efs-lock');
  if(document.body)document.body.style.overflow='';
} else {
  window.__DSH_STARTUP_BOOT__='index';
  document.documentElement.classList.add('efs-lock');
  setTimeout(function(){try{
    var r=document.getElementById('${ROOT_ID}');
    if(r&&r.getAttribute('data-mounted')!=='1'){
      if(r.parentNode)r.parentNode.removeChild(r);
      document.documentElement.classList.remove('efs-lock');
      if(document.body)document.body.style.overflow='';
      window.__DSH_STARTUP_FAILED__=true;
    }
  }catch(e){}},9000);
}
}catch(e){}})()`

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '')
}

function resolveWebServer(ctx) {
  try {
    const viaGet = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
    if (viaGet) return viaGet
  } catch (err) { /* 取不到就当没有 */ }
  return ctx.webServer
}

function hasRoutes(server) {
  return !!server && typeof server.register === 'function' && typeof server.tapIndex === 'function'
}

function configPayload(base) {
  return { ...readConfig(), routeBase: base }
}

function indexInjectionRows(cfg, base) {
  return [
    { kind: 'style', text: CRITICAL_CSS },
    { kind: 'html', placement: 'head', html: '<link rel="stylesheet" href="' + base + '/splash.css">' },
    { kind: 'html', placement: 'body', html: '<div id="' + ROOT_ID + '" class="efs-root efs-boot"></div>' },
    { kind: 'global', name: '__DSH_STARTUP__', value: cfg },
    { kind: 'global', name: '__DSH_STARTUP_VERSION__', value: PLUGIN_VERSION },
    { kind: 'script', placement: 'body', text: BOOTSTRAP_JS },
    { kind: 'script-src', placement: 'body', src: base + '/splash.js' }
  ]
}

export const name = NS
export const inject = ['webServer', 'connection']

export function apply(ctx) {
  let server = null
  try {
    server = resolveWebServer(ctx)
  } catch (err) {
    server = null
  }

  if (!hasRoutes(server)) {
    try {
      ctx.logger?.warn?.('[' + NS + '] 当前 profile 没有可用的 webServer，跳过首屏注入。')
    } catch (err) { /* 日志失败不影响加载 */ }
    return
  }

  const disposers = []

  /* 资源地址保持同源相对路径：Electron 的 dsh-app:// 页面会经自定义协议
     代理到本插件的 webServer 路由；跨源绝对地址反而可能被连接鉴权拒绝。 */
  const ABS_BASE = ROUTE_BASE

  function rejected(req, res) {
    try {
      const conn = (typeof ctx.get === 'function' ? ctx.get('connection') : undefined) || ctx.connection
      if (!conn || typeof conn.requestRejection !== 'function') return false
      const code = conn.requestRejection(req)
      if (code === undefined || code === null || code === false) return false
      res.statusCode = typeof code === 'number' ? code : 403
      res.end()
      return true
    } catch (err) {
      return false
    }
  }

  function registerRoute(route) {
    const inner = route.handler
    const wrapped = Object.assign({}, route, {
      handler: async (req, res) => {
        if (rejected(req, res)) return
        return inner(req, res)
      }
    })
    return server.register(wrapped)
  }

  function sendText(res, type, text) {
    const body = Buffer.from(text, 'utf8')
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  function sendJson(res, code, payload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8')
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  function readBody(req, limit = 64 * 1024) {
    return new Promise((resolve) => {
      let size = 0
      const chunks = []
      req.on('data', (c) => {
        size += c.length
        if (size > limit) {
          req.destroy()
          resolve('')
          return
        }
        chunks.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', () => resolve(''))
    })
  }

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/splash.css',
    handler: (req, res) => sendText(res, 'text/css; charset=utf-8', readSplashCss())
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/splash.js',
    handler: (req, res) => sendText(res, 'application/javascript; charset=utf-8', readSplashJs())
  }))

  disposers.push(registerRoute({
    kind: 'prefix',
    path: ROUTE_BASE + '/asset',
    handler: (req, res) => {
      const raw = (req.url || '').split('?')[0]
      const name = path.basename(decodeURIComponent(raw))
      if (!/^[a-z0-9._-]+\.(mp3|png|svg|woff2)$/i.test(name) || name.includes('..')) {
        res.writeHead(404)
        res.end()
        return
      }
      const file = path.join(PACKAGE_ROOT, 'lib', 'assets', name)
      let bytes
      try {
        bytes = fs.readFileSync(file)
      } catch (err) {
        res.writeHead(404)
        res.end()
        return
      }
      const type = /\.mp3$/i.test(name) ? 'audio/mpeg'
        : /\.png$/i.test(name) ? 'image/png'
          : /\.svg$/i.test(name) ? 'image/svg+xml'
            : 'font/woff2'
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(bytes.length)
      })
      res.end(bytes)
    }
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/config',
    handler: async (req, res) => {
      const method = (req.method || 'GET').toUpperCase()
      if (method === 'GET') {
        sendJson(res, 200, {
          ok: true,
          version: PLUGIN_VERSION,
          config: readConfig(),
          defaults: DEFAULTS,
          file: CONFIG_FILE
        })
        return
      }
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const text = await readBody(req)
      let payload = {}
      try {
        payload = text ? JSON.parse(text) : {}
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'invalid json' })
        return
      }
      try {
        if (payload && payload.action === 'reset') {
          const cfgNow = writeConfig(DEFAULTS)
          sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfgNow, defaults: DEFAULTS })
          return
        }
        const current = readConfig()
        const patch = payload && typeof payload.patch === 'object' && payload.patch ? payload.patch : payload
        const cfgNow = writeConfig({ ...current, ...patch })
        sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfgNow, defaults: DEFAULTS })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))

  /* 桌面端（Electron）走结构化注入表；web 端 tapIndex 也会应用同样内容。 */
  ctx.effect(() => {
    const dispose = ctx.on('webserver/index-inject', (table) => {
      if (!Array.isArray(table)) return
      if (table.some((row) => row && typeof row === 'object' && String(row.src || '').includes(ROUTE_BASE + '/splash.js'))) return
      const cfg = configPayload(ABS_BASE)
      for (const row of indexInjectionRows(cfg, ABS_BASE)) table.push(row)
    })
    return () => {
      if (typeof dispose === 'function') dispose()
    }
  }, 'dsh-endfield-startup-index-inject')

  disposers.push(server.tapIndex((html) => {
    if (!html || html.includes(ROUTE_BASE + '/splash.js')) return html
    const cfg = configPayload(ROUTE_BASE)
    const head =
      '<link rel="stylesheet" href="' + ROUTE_BASE + '/splash.css">' +
      '<style id="dsh-endfield-startup-critical">' + CRITICAL_CSS + '</style>'
    const body =
      '<div id="' + ROOT_ID + '" class="efs-root efs-boot"></div>' +
      '<script>window.__DSH_STARTUP__=' + safeJson(cfg) + ';window.__DSH_STARTUP_VERSION__=' + safeJson(PLUGIN_VERSION) + ';' + BOOTSTRAP_JS + '</script>' +
      '<script defer src="' + ROUTE_BASE + '/splash.js"></script>'
    let out = html
    if (out.includes('</head>')) out = out.replace('</head>', head + '</head>')
    else out = head + out
    if (out.includes('<body>')) out = out.replace('<body>', '<body>' + body)
    else if (out.includes('</body>')) out = out.replace('</body>', body + '</body>')
    else out = out + body
    return out
  }))

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try { dispose() } catch (err) { /* noop */ }
    }
  })
}
