// ---------------------------------------------------------------------------
// main.js — 幻兽森林 JS 胶水层
// ---------------------------------------------------------------------------

(async () => {

const wasmUrl = '/_build/wasm/release/build/main/main.wasm'
let exports, mem, pets = []

// ── 1. 加载 WASM ───────────────────────────────────────────────────────────
try {
  const buf = await fetch(wasmUrl).then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.arrayBuffer() })
  const { instance } = await WebAssembly.instantiate(buf, { env: { math_random: () => Math.random() } })
  exports = instance.exports
  mem = new Uint8Array(exports.memory.buffer)
} catch (err) {
  document.body.innerHTML = `<div style="padding:24px;color:#E24B4A;background:#1a1a2e;font-family:monospace;font-size:14px;max-width:580px;margin:40px auto;border-radius:12px;border:1px solid #E24B4A;"><b>WASM 加载失败</b><br><br><b>错误:</b> ${err.message}<br><br>请从 projects/ 目录启动服务器并确保已编译</div>`
  return
}

// ── 2. 工具 ────────────────────────────────────────────────────────────────
function ds(ptr) {
  if (ptr === 0) return ''
  const len = new DataView(mem.buffer).getUint32(ptr - 4, true) & 0xffff
  return new TextDecoder('utf-16le').decode(mem.slice(ptr, ptr + len * 2))
}

function checksum(s) { let sum = 0; for (let i = 0; i < s.length; i++) sum = (sum + s.charCodeAt(i)) % 65536; return sum }

// ── 3. 存档 ────────────────────────────────────────────────────────────────
const SAVE_KEY = 'phantom_forest_v3'

function getUUID() {
  let id = localStorage.getItem('phantom_uuid')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('phantom_uuid', id) }
  return id
}

function loadPets() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const lines = raw.split('\n')
    const ver = parseInt(lines[0])
    // v3: 3\nchecksum\nuuid\nactive\npetdata... (6/pet)
    // v2: 2\nchecksum\npetdata... (5/pet, upgrade to v3)
    let uuid, active = 0, dataStart
    if (ver >= 3) {
      const data = lines.slice(2).join('\n')
      if (String(checksum(data)) !== lines[1]) { console.warn('存档校验失败'); return null }
      uuid = lines[2]; active = parseInt(lines[3]) || 0; dataStart = 4
    } else if (ver === 2) {
      uuid = getUUID(); active = 0; dataStart = 2
      const data = lines.slice(dataStart).join('\n')
      if (String(checksum(data)) !== lines[1]) { console.warn('存档校验失败'); return null }
    } else return null
    const n = ver >= 4 ? 7 : 6
    const r = []
    for (let i = dataStart; i + n - 1 < lines.length; i += n) {
      r.push({
        n: lines[i], e: lines[i+1],
        hp: parseInt(lines[i+2]), atk: parseInt(lines[i+3]),
        lv: parseInt(lines[i+4]), cur_hp: parseInt(lines[i+5]),
        el: ver >= 4 ? (parseInt(lines[i+6]) || 0) : 4  // v3默认火
      })
    }
    return { uuid, active, pets: r }
  } catch { return null }
}

function savePets() {
  const data = `${getUUID()}\n${exports.get_active()}\n` + pets.map(p => `${p.n}\n${p.e}\n${p.hp}\n${p.atk}\n${p.lv}\n${p.cur_hp}\n${p.el ?? 4}`).join('\n') + '\n'
  localStorage.setItem(SAVE_KEY, `4\n${checksum(data)}\n${data}`)
}

// ── 4. 初始化 ──────────────────────────────────────────────────────────────
const saved = loadPets()
if (saved && saved.pets.length > 0) {
  exports.clear_pets()
  for (const p of saved.pets) exports.add_pet(p.hp, p.atk, p.cur_hp, p.el ?? 4)
  exports.set_active(saved.active)
  pets = saved.pets
} else {
  exports.new_game()
  const n = exports.get_owned_count()
  for (let i = 0; i < n; i++) {
    pets.push({ n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)), hp: exports.get_owned_hp(i), atk: exports.get_owned_atk(i), lv: exports.get_owned_lv(i), cur_hp: exports.get_owned_cur_hp(i), el: exports.get_owned_element(i) })
  }
  savePets()
}

function syncPetsFromMoonBit() {
  const count = exports.get_owned_count()
  for (let i = 0; i < count; i++) {
    if (i >= pets.length) {
      pets.push({ n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)), hp: exports.get_owned_hp(i), atk: exports.get_owned_atk(i), lv: exports.get_owned_lv(i), cur_hp: exports.get_owned_cur_hp(i), el: exports.get_owned_element(i) })
    } else {
      pets[i].hp = exports.get_owned_hp(i)
      pets[i].atk = exports.get_owned_atk(i)
      pets[i].cur_hp = exports.get_owned_cur_hp(i)
      pets[i].el = exports.get_owned_element(i)
    }
  }
  pets.length = count
  savePets()
  renderPetList()
}

// ── 5. DOM ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id)
const mapView = $('map-view'), battleView = $('battle-view'), battleLog = $('battle-log')
const capturedList = $('captured-list'), caughtCount = $('caught-count')
const btnAttack = $('btn-attack'), btnSkill = $('btn-skill'), btnCatch = $('btn-catch'), btnRun = $('btn-run')
const petSwitchPanel = $('pet-switch')
const activePetInfo = $('active-pet')

// ── 6. 地图 ────────────────────────────────────────────────────────────────
function drawMap() {
  const c = $('map-canvas'); if (!c) return
  const W = c.width = c.offsetWidth || 560, H = c.height = c.offsetHeight || 340
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1e3a12'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#2a5018'; [[0.05,0.1,0.3,0.35],[0.45,0.05,0.35,0.45],[0.55,0.45,0.35,0.4],[0.1,0.5,0.28,0.35]].forEach(([x,y,w,h]) => ctx.fillRect(x*W,y*H,w*W,h*H))
  ctx.fillStyle = '#1a3a5c'; ctx.beginPath(); ctx.ellipse(0.3*W,0.72*H,0.12*W,0.09*H,0,0,Math.PI*2); ctx.fill()
  ctx.fillStyle = '#3a3020'; [[0.55,0.12],[0.62,0.07],[0.69,0.12]].forEach(([x,y]) => { ctx.beginPath(); ctx.moveTo(x*W,y*H); ctx.lineTo((x+0.05)*W,(y+0.16)*H); ctx.lineTo((x-0.05)*W,(y+0.16)*H); ctx.closePath(); ctx.fill() })
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
  for (let i=0;i<W;i+=28){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke()}
  for (let j=0;j<H;j+=28){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(W,j);ctx.stroke()}
}
requestAnimationFrame(() => { drawMap(); console.log('Map drawn') })
window.addEventListener('resize', drawMap)

// ── 7. 元素 ────────────────────────────────────────────────────────────────
const ELEMENTS = ['金','木','土','水','火']

// ── 8. 宠物列表 UI ─────────────────────────────────────────────────────────
function renderPetList() {
  const max = exports.get_max_pets ? exports.get_max_pets() : 5
  $('max-pets').textContent = max
  const active = exports.get_active()
  caughtCount.textContent = pets.length
  if (activePetInfo) {
    const a = pets[active]
    if (a) activePetInfo.textContent = `${a.e} ${a.n} HP:${a.cur_hp}/${a.hp} ATK:${a.atk}`
  }
  if (pets.length === 0) { capturedList.innerHTML = '<span class="empty-tip">还没有宠物</span>'; return }
  capturedList.innerHTML = pets.map((p, i) => {
    const isActive = i === active
    const el = ELEMENTS[p.el ?? 4] || '?'
    return `<span class="captured-tag${isActive ? ' active-pet' : ''}" data-idx="${i}" title="HP:${p.cur_hp}/${p.hp} ATK:${p.atk} 元素:${el}${isActive ? ' ⚔️出战中' : ''}">
      <span class="tag-emoji">${p.e}</span><span class="tag-name">${p.n}</span>
      <span class="tag-element">${el}</span>
      <span class="tag-stats">${p.cur_hp}/${p.hp}</span>
    </span>`
  }).join('')
  // 点击弹出菜单
  capturedList.querySelectorAll('.captured-tag').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const idx = parseInt(el.dataset.idx)
      showPetMenu(idx, el)
    })
  })
}

function showPetMenu(idx, anchor) {
  const old = document.querySelector('.pet-popup')
  if (old) old.remove()
  const popup = document.createElement('div')
  popup.className = 'pet-popup'
  const rect = anchor.getBoundingClientRect()
  popup.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.bottom+4}px;background:#16213e;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:4px;z-index:100;min-width:120px;`
  const isActive = idx === exports.get_active()
  const p = pets[idx]
  const onlyOne = pets.length <= 1
  popup.innerHTML = `
    <div style="padding:6px 10px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:2px;">${p.e} ${p.n} <span style="color:#888;font-size:11px;">HP:${p.cur_hp}/${p.hp} ATK:${p.atk}</span></div>
    <button class="popup-btn" data-action="rename">✏️ 改名</button>
    <button class="popup-btn" data-action="setactive" ${isActive?'disabled':''}>⚔️ ${isActive?'已是出战宠物':'设为出战'}</button>
    <button class="popup-btn" data-action="release" style="color:#E24B4A;" ${onlyOne?'disabled':''}>🗑️ 放生</button>
  `
  popup.querySelectorAll('.popup-btn').forEach(b => {
    b.addEventListener('click', () => {
      const action = b.dataset.action
      popup.remove()
      if (action === 'rename') {
        const name = prompt('为这只宠物取名：', p.n)
        if (name && name.trim()) { pets[idx].n = name.trim(); savePets(); renderPetList() }
      } else if (action === 'setactive') {
        exports.set_active(idx)
        syncPetsFromMoonBit()
      } else if (action === 'release') {
        if (confirm(`确定要放生 ${p.e} ${p.n} 吗？此操作不可撤销。`)) {
          exports.release_pet(idx)
          syncPetsFromMoonBit()
        }
      }
    })
  })
  document.body.appendChild(popup)
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 10)
}

// ── 8. 地图标记点击 ────────────────────────────────────────────────────────
document.querySelectorAll('.marker').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = parseInt(btn.dataset.id, 10)
    exports.start_battle(id)
    syncBattleUI()
    setLog(`遭遇了 ${ds(exports.get_enemy_name())}！选择你的行动。`)
    setButtons(true)
    petSwitchPanel.hidden = false
    mapView.hidden = true; battleView.hidden = false
  })
})

// ── 9. 战斗按钮 ────────────────────────────────────────────────────────────
btnAttack.addEventListener('click', () => { setButtons(false); exports.player_attack(); handleResult() })
if (btnSkill) btnSkill.addEventListener('click', () => { setButtons(false); exports.elemental_skill(); handleResult() })
btnCatch.addEventListener('click', () => { setButtons(false); exports.try_catch(); handleResult() })
btnRun.addEventListener('click', () => { setButtons(false); exports.run_away(); setLog(ds(exports.get_last_message())); setTimeout(exitBattle, 900) })

function renderSwitchPanel() {
  if (!petSwitchPanel) return
  const cur = exports.get_active()
  petSwitchPanel.innerHTML = pets.map((p, i) => {
    const dead = p.cur_hp <= 0
    return `<button class="switch-pet-btn" data-idx="${i}" ${dead || i === cur ? 'disabled' : ''}>
      ${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">${p.cur_hp}/${p.hp}</span>${i===cur?' ⚔️':''}
    </button>`
  }).join('')
  // 绑定事件
  petSwitchPanel.querySelectorAll('.switch-pet-btn:not([disabled])').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx)
      if (exports.switch_pet(idx)) {
        setLog(ds(exports.get_last_message()))
        syncBattleUI()
        syncPetsFromMoonBit()
        renderSwitchPanel()
        if (exports.get_last_player_defeated()) {
          setTimeout(() => { exports.recover_after_defeat(); syncBattleUI(); exitBattle() }, 1600)
        }
      }
    })
  })
}

function handleResult() {
  syncBattleUI()
  setLog(ds(exports.get_last_message()))
  const won = exports.get_last_enemy_defeated()
  const lost = exports.get_last_player_defeated()
  const caught = exports.get_last_catch_success()
  if (caught || won) {
    if (caught) syncPetsFromMoonBit()
    const max = exports.get_max_pets ? exports.get_max_pets() : 5
    if (pets.length > max) {
      showReleasePicker(() => { exitBattle() })
    } else {
      setTimeout(exitBattle, 1500)
    }
    return
  }
  if (lost) { setTimeout(() => { exports.recover_after_defeat(); syncBattleUI(); exitBattle() }, 1600); return }
  setButtons(true)
}

function showReleasePicker(onDone) {
  const max = exports.get_max_pets ? exports.get_max_pets() : 5
  setLog(`队伍已满（${pets.length}/${max}），请选择一只放生的宠物：`)
  setButtons(false)
  // 显示选择面板
  const panel = document.createElement('div')
  panel.id = 'release-picker'
  panel.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--border);'
  panel.innerHTML = pets.map((p, i) => `
    <button class="switch-pet-btn release-option" data-idx="${i}">
      ${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">HP:${p.cur_hp}/${p.hp} ATK:${p.atk}</span>
    </button>
  `).join('')
  const actions = document.querySelector('.battle-actions')
  actions.parentNode.insertBefore(panel, actions)
  // 绑定点击
  panel.querySelectorAll('.release-option').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx)
      exports.release_pet(idx)
      syncPetsFromMoonBit()
      panel.remove()
      setButtons(true)
      onDone()
    })
  })
}

function exitBattle() {
  const rp = document.getElementById('release-picker')
  if (rp) rp.remove()
  exports.commit_battle()
  syncPetsFromMoonBit()
  petSwitchPanel.hidden = true
  battleView.hidden = true; mapView.hidden = false
}

// ── 10. UI 同步 ────────────────────────────────────────────────────────────
function syncBattleUI() {
  setHp('player', exports.get_player_hp(), exports.get_player_max_hp())
  setHp('enemy', exports.get_enemy_hp(), exports.get_enemy_max_hp())
  const enemyEl = ELEMENTS[exports.get_enemy_element()] || '?'
  $('enemy-avatar').textContent = ds(exports.get_enemy_emoji())
  $('enemy-name').textContent = ds(exports.get_enemy_name()) + ' ' + enemyEl
  const active = exports.get_active()
  if (pets[active]) {
    const petEl = ELEMENTS[pets[active].el ?? 4] || '?'
    $('player-avatar').textContent = pets[active].e
    $('player-name').textContent = pets[active].n + ' ' + petEl
  }
  renderSwitchPanel()
}

function setHp(who, cur, max) {
  const pct = Math.max(0, cur / max * 100)
  const bar = $(`${who}-hp-bar`); bar.style.width = pct + '%'
  bar.className = 'hp-fill ' + (pct > 50 ? 'green' : pct > 25 ? 'yellow' : 'red')
  $(`${who}-hp-text`).textContent = `${Math.max(0, cur)}/${max}`
}

function setLog(msg) { battleLog.textContent = msg }
function setButtons(on) { [btnAttack, btnSkill, btnCatch, btnRun].forEach(b => { if (b) b.disabled = !on }) }

// ── 11. 启动 ───────────────────────────────────────────────────────────────
renderPetList()
renderSwitchPanel()
console.log('✅ 幻兽森林已就绪')

})()
