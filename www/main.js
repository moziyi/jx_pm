// ---------------------------------------------------------------------------
// main.js — JS 胶水层（MoonBit wasm 目标）
// ---------------------------------------------------------------------------

(async () => {

const wasmUrl = '/_build/wasm/release/build/main/main.wasm'
let exports, mem

// ── 1. 加载 WASM ───────────────────────────────────────────────────────────
try {
  const buf = await fetch(wasmUrl).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.arrayBuffer()
  })
  const { instance } = await WebAssembly.instantiate(buf, {
    env: { math_random: () => Math.random() },
  })
  exports = instance.exports
  mem = new Uint8Array(exports.memory.buffer)
  console.log('WASM loaded:', Object.keys(exports).length, 'exports')
} catch (err) {
  document.body.innerHTML =
    '<div style="padding:24px;color:#E24B4A;background:#1a1a2e;font-family:monospace;font-size:14px;max-width:580px;margin:40px auto;border-radius:12px;border:1px solid #E24B4A;">' +
    '<b>WASM 加载失败</b><br><br>' +
    '<b>错误:</b> ' + err.message + '<br><br>' +
    '<b>请检查:</b><br>' +
    '1. 从 projects/ 目录启动: <code>cd projects && python3 -m http.server 3000</code><br>' +
    '2. 访问: <code>http://localhost:3000/www/</code><br>' +
    '3. 已编译: <code>cd projects && moon build --target wasm --release</code>' +
    '</div>'
  return
}

// ── 2. 字符串解码 ──────────────────────────────────────────────────────────
function ds(ptr) {
  if (ptr === 0) return ''
  const len = new DataView(mem.buffer).getUint32(ptr - 4, true) & 0xffff
  return new TextDecoder('utf-16le').decode(mem.slice(ptr, ptr + len * 2))
}

// ── 3. 初始化 ──────────────────────────────────────────────────────────────
exports.new_game()

const $ = (id) => document.getElementById(id)
const mapView      = $('map-view')
const battleView   = $('battle-view')
const battleLog    = $('battle-log')
const capturedList = $('captured-list')
const caughtCount  = $('caught-count')
const btnAttack    = $('btn-attack')
const btnCatch     = $('btn-catch')
const btnRun       = $('btn-run')

// ── 4. 地图 ────────────────────────────────────────────────────────────────
function drawMap() {
  const c = $('map-canvas')
  if (!c) return
  const W = c.width  = c.offsetWidth  || 560
  const H = c.height = c.offsetHeight || 340
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#1e3a12'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#2a5018'
  ;[[0.05,0.1,0.3,0.35],[0.45,0.05,0.35,0.45],[0.55,0.45,0.35,0.4],[0.1,0.5,0.28,0.35]]
    .forEach(([x,y,w,h]) => ctx.fillRect(x*W, y*H, w*W, h*H))
  ctx.fillStyle = '#1a3a5c'
  ctx.beginPath(); ctx.ellipse(0.3*W, 0.72*H, 0.12*W, 0.09*H, 0, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = '#3a3020'
  ;[[0.55,0.12],[0.62,0.07],[0.69,0.12]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.moveTo(x*W, y*H); ctx.lineTo((x+0.05)*W, (y+0.16)*H); ctx.lineTo((x-0.05)*W, (y+0.16)*H); ctx.closePath(); ctx.fill()
  })
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
  for (let i = 0; i < W; i += 28) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke() }
  for (let j = 0; j < H; j += 28) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke() }
}

requestAnimationFrame(() => {
  drawMap()
  console.log('Map drawn')
})
window.addEventListener('resize', drawMap)

// ── 5. 点击事件 ────────────────────────────────────────────────────────────
document.querySelectorAll('.marker').forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('Marker clicked:', btn.dataset.id)
    const id = parseInt(btn.dataset.id, 10)
    exports.start_battle(id)
    syncBattleUI()
    setLog(`遭遇了 ${ds(exports.get_enemy_name())}！选择你的行动。`)
    setButtons(true)
    mapView.hidden    = true
    battleView.hidden = false
  })
})
console.log('Markers bound:', document.querySelectorAll('.marker').length)

// ── 6. 战斗按钮 ────────────────────────────────────────────────────────────
btnAttack.addEventListener('click', () => { setButtons(false); exports.player_attack(); handleResult() })
btnCatch.addEventListener('click', () =>  { setButtons(false); exports.try_catch(); handleResult() })
btnRun.addEventListener('click', () =>    {
  setButtons(false); exports.run_away()
  setLog(ds(exports.get_last_message()))
  setTimeout(exitBattle, 900)
})

function handleResult() {
  syncBattleUI()
  setLog(ds(exports.get_last_message()))
  const won = exports.get_last_enemy_defeated()
  const lost = exports.get_last_player_defeated()
  const caught = exports.get_last_catch_success()
  if (caught || won) { if (caught) syncCaptured(); setTimeout(exitBattle, 1500); return }
  if (lost) { setTimeout(() => { exports.recover_after_defeat(); syncBattleUI(); exitBattle() }, 1600); return }
  setButtons(true)
}

function exitBattle() { syncCaptured(); battleView.hidden = true; mapView.hidden = false }

// ── 7. UI 同步 ─────────────────────────────────────────────────────────────
function syncBattleUI() {
  setHp('player', exports.get_player_hp(), exports.get_player_max_hp())
  setHp('enemy',  exports.get_enemy_hp(),  exports.get_enemy_max_hp())
  $('enemy-avatar').textContent = ds(exports.get_enemy_emoji())
  $('enemy-name').textContent   = ds(exports.get_enemy_name())
}

function setHp(who, cur, max) {
  const pct = Math.max(0, cur / max * 100)
  const bar = $(`${who}-hp-bar`); bar.style.width = pct + '%'
  bar.className = 'hp-fill ' + (pct > 50 ? 'green' : pct > 25 ? 'yellow' : 'red')
  $(`${who}-hp-text`).textContent = `${Math.max(0, cur)}/${max}`
}

function syncCaptured() {
  const count = exports.get_captured_count()
  caughtCount.textContent = count
  if (count === 0) { capturedList.innerHTML = '<span class="empty-tip">还没有捕捉到任何生物</span>'; return }
  let html = ''
  for (let i = 0; i < count; i++) html += `<span class="captured-tag">${ds(exports.get_captured_emoji(i))} ${ds(exports.get_captured_name(i))}</span>`
  capturedList.innerHTML = html
}

function setLog(msg)    { battleLog.textContent = msg }
function setButtons(on) { [btnAttack, btnCatch, btnRun].forEach(b => b.disabled = !on) }

console.log('✅ 就绪')

})()
