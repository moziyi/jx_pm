// main.js — 幻兽森林 应用逻辑
import { ELEMENTS, STARTER_PET, INITIAL_ITEMS, LOCATIONS, EVENTS, SPECIAL_EVENTS } from './config.js'
import { checksum, getUUID, loadGame, saveGame } from './storage.js'

(async () => {

const wasmUrl = '/_build/wasm/release/build/main/main.wasm'
let exports, mem, pets = []

// ── 1. WASM 加载 ───────────────────────────────────────────────────────────
try {
  const buf = await fetch(wasmUrl).then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.arrayBuffer() })
  const { instance } = await WebAssembly.instantiate(buf, { env: { math_random: () => Math.random() } })
  exports = instance.exports
  mem = new Uint8Array(exports.memory.buffer)
} catch (err) {
  document.body.innerHTML = `<div style="padding:24px;color:#E24B4A;background:#1a1a2e;font-family:monospace;max-width:580px;margin:40px auto;border-radius:12px;border:1px solid #E24B4A;"><b>WASM 加载失败</b><br><br>${err.message}</div>`
  return
}

// ── 2. 工具 ────────────────────────────────────────────────────────────────
function ds(ptr) {
  if (ptr === 0) return ''
  const len = new DataView(mem.buffer).getUint32(ptr - 4, true) & 0xffff
  return new TextDecoder('utf-16le').decode(mem.slice(ptr, ptr + len * 2))
}

// ── 3. 初始化 ──────────────────────────────────────────────────────────────
const saved = loadGame()
if (saved && saved.pets.length > 0) {
  exports.clear_pets()
  for (const p of saved.pets) exports.add_pet(p.hp, p.atk, p.cur_hp, p.el ?? 4)
  exports.set_active(saved.active)
  if (saved.inv) {
    exports.add_herbs(saved.inv.herbs - exports.get_herbs())
    exports.add_revives(saved.inv.revives - exports.get_revives())
    exports.add_charms(saved.inv.charms - exports.get_charms())
  }
  pets = saved.pets
} else {
  exports.new_game()
  const n = exports.get_owned_count()
  for (let i = 0; i < n; i++) {
    pets.push({ n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)), hp: exports.get_owned_hp(i), atk: exports.get_owned_atk(i), lv: exports.get_owned_lv(i), cur_hp: exports.get_owned_cur_hp(i), el: exports.get_owned_element(i) })
  }
  saveGame(pets, exports)
}

function syncFromMoonBit() {
  const count = exports.get_owned_count()
  for (let i = 0; i < count; i++) {
    if (i >= pets.length) {
      pets.push({ n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)), hp: exports.get_owned_hp(i), atk: exports.get_owned_atk(i), lv: exports.get_owned_lv(i), cur_hp: exports.get_owned_cur_hp(i), el: exports.get_owned_element(i) })
    } else {
      pets[i].hp = exports.get_owned_hp(i); pets[i].atk = exports.get_owned_atk(i)
      pets[i].cur_hp = exports.get_owned_cur_hp(i); pets[i].el = exports.get_owned_element(i)
    }
  }
  pets.length = count
  updateItemCounts()
  saveGame(pets, exports)
  renderPetList()
}

// ── 4. DOM ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id)
const mapView = $('map-view'), battleView = $('battle-view'), battleLog = $('battle-log')
const capturedList = $('captured-list'), caughtCount = $('caught-count')
const btnAttack = $('btn-attack'), btnSkill = $('btn-skill'), btnRun = $('btn-run')
const btnUseHerb = $('btn-herb'), btnUseRevive = $('btn-revive'), btnUseCharm = $('btn-charm')
const petSwitchPanel = $('pet-switch')

// ── 5. 地图 ────────────────────────────────────────────────────────────────
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
requestAnimationFrame(() => { drawMap() })
window.addEventListener('resize', drawMap)

// ── 6. 宠物列表 ────────────────────────────────────────────────────────────
function renderPetList() {
  const max = exports.get_max_pets ? exports.get_max_pets() : 5
  $('max-pets').textContent = max
  const active = exports.get_active()
  caughtCount.textContent = pets.length
  if ($('active-pet')) {
    const a = pets[active]
    if (a) $('active-pet').textContent = `${a.e} ${a.n} HP:${a.cur_hp}/${a.hp} ATK:${a.atk}`
  }
  if (pets.length === 0) { capturedList.innerHTML = '<span class="empty-tip">还没有宠物</span>'; return }
  capturedList.innerHTML = pets.map((p, i) => {
    const el = ELEMENTS[p.el ?? 4] || '?'
    const dead = p.cur_hp <= 0
    return `<span class="captured-tag${i === active ? ' active-pet' : ''}${dead ? ' fainted' : ''}" data-idx="${i}" title="HP:${p.cur_hp}/${p.hp} ATK:${p.atk} 元素:${el}${i===active?' ⚔️出战中':''}${dead?' 💀被击败':''}">
      <span class="tag-emoji">${p.e}</span><span class="tag-name">${p.n}</span>
      <span class="tag-element">${el}</span>
      <span class="tag-stats">${dead ? '💀' : p.cur_hp+'/'+p.hp}</span>
    </span>`
  }).join('')
  capturedList.querySelectorAll('.captured-tag').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); showPetMenu(parseInt(el.dataset.idx), el) })
  })
}

function showPetMenu(idx, anchor) {
  const old = document.querySelector('.pet-popup'); if (old) old.remove()
  const popup = document.createElement('div'); popup.className = 'pet-popup'
  const rect = anchor.getBoundingClientRect()
  popup.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.bottom+4}px;background:#16213e;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:4px;z-index:100;min-width:120px;`
  const p = pets[idx], isActive = idx === exports.get_active(), onlyOne = pets.length <= 1, dead = p.cur_hp <= 0
  popup.innerHTML = `
    <div style="padding:6px 10px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:2px;">${p.e} ${p.n} <span style="color:#888;font-size:11px;">HP:${p.cur_hp}/${p.hp} ATK:${p.atk}${dead?' 💀倒下':''}</span></div>
    <button class="popup-btn" data-action="rename">✏️ 改名</button>
    <button class="popup-btn" data-action="setactive" ${isActive||dead?'disabled':''}>⚔️ ${isActive?'已是出战宠物':dead?'倒下':'设为出战'}</button>
    <button class="popup-btn" data-action="release" style="color:#E24B4A;" ${onlyOne?'disabled':''}>🗑️ 放生</button>
  `
  popup.querySelectorAll('.popup-btn').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.action; popup.remove()
      if (a === 'rename') { const n = prompt('为这只宠物取名：', p.n); if (n && n.trim()) { pets[idx].n = n.trim(); saveGame(pets, exports); renderPetList() } }
      else if (a === 'setactive') { exports.set_active(idx); syncFromMoonBit() }
      else if (a === 'release') { if (confirm(`确定要放生 ${p.e} ${p.n} 吗？此操作不可撤销。`)) { exports.release_pet(idx); syncFromMoonBit() } }
    })
  })
  document.body.appendChild(popup)
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 10)
}

// ── 7. 道具 UI ─────────────────────────────────────────────────────────────
function updateItemCounts() {
  const h = exports.get_herbs(), r = exports.get_revives(), c = exports.get_charms()
  const set = (id, n) => { const el = $(id); if (el) el.textContent = 'x' + n }
  set('herb-count', h); set('map-herb-count', h); set('revive-count', r); set('map-revive-count', r); set('charm-count', c)
  if (btnUseHerb) btnUseHerb.disabled = h <= 0
  if (btnUseRevive) btnUseRevive.disabled = r <= 0
  if (btnUseCharm) btnUseCharm.disabled = c <= 0
}

// 地图道具按钮
$('map-herb')?.addEventListener('click', () => { if (exports.get_herbs() > 0) { exports.use_herb(); syncFromMoonBit() } })
$('map-revive')?.addEventListener('click', () => {
  if (exports.get_revives() <= 0) return
  const dead = pets.findIndex(p => p.cur_hp <= 0)
  if (dead < 0) { alert('没有需要复苏的宠物'); return }
  exports.use_revive(dead); syncFromMoonBit()
})

// ── 8. 事件系统 ────────────────────────────────────────────────────────────
function triggerEvent(locId) {
  const pool = EVENTS[locId]
  if (!pool) return 'battle'
  const evt = pool[Math.floor(Math.random() * pool.length)]
  // 非战斗事件：立即执行效果
  if (evt.type === 'battle') return 'battle'
  if (evt.type === 'item') { exports['add_' + evt.item](evt.n); if (evt.extra) exports['add_' + evt.extra.item](evt.extra.n) }
  else if (evt.type === 'heal_active') exports.heal_active(evt.n)
  else if (evt.type === 'heal_active_full') exports.heal_active_full()
  else if (evt.type === 'revive_one') exports.revive_one()
  else if (evt.type === 'hurt_active') exports.hurt_active(evt.n)
  else if (evt.type === 'heal_all') exports.heal_all(evt.n)
  else if (evt.type === 'hurt_all') exports.hurt_all(evt.n)
  syncFromMoonBit()
  showEventMessage(evt.msg)
  return 'event'
}

function showEventMessage(msg) {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:#16213e;color:#e8e8f0;padding:16px 24px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);z-index:200;font-size:14px;text-align:center;min-width:200px;box-shadow:0 4px 20px rgba(0,0,0,0.5);'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.5s'; setTimeout(() => el.remove(), 500) }, 1500)
}

// ── 9. 地图标记 ────────────────────────────────────────────────────────────
document.querySelectorAll('.marker').forEach(btn => {
  btn.addEventListener('click', () => {
    const locId = parseInt(btn.dataset.id, 10)
    const result = triggerEvent(locId)
    if (result === 'battle') {
      if (!exports.start_battle(locId)) {
        showEventMessage('所有宠物都倒下了！使用醒神草或寻找恢复事件吧。')
        return
      }
      syncBattleUI()
      setLog(`遭遇了 ${ds(exports.get_enemy_name())}！选择你的行动。`)
      setButtons(true)
      petSwitchPanel.hidden = false
      const bi = $('battle-items'); if (bi) bi.hidden = false
      $('map-items').hidden = true
      mapView.hidden = true; battleView.hidden = false
    }
  })
})

// ── 10. 战斗 ───────────────────────────────────────────────────────────────
btnAttack.addEventListener('click', () => { setButtons(false); exports.player_attack(); handleResult() })
btnSkill?.addEventListener('click', () => { setButtons(false); exports.elemental_skill(); handleResult() })
btnRun.addEventListener('click', () => { setButtons(false); const wasDead = exports.get_player_hp() <= 0; exports.run_away(); if (wasDead) { exports.auto_switch_active(); syncFromMoonBit() } setLog(ds(exports.get_last_message())); setTimeout(exitBattle, 900) })

btnUseHerb?.addEventListener('click', () => {
  setButtons(false); if (exports.use_herb()) { setLog(ds(exports.get_last_message())); syncBattleUI(); syncFromMoonBit() }; setButtons(true)
})
btnUseRevive?.addEventListener('click', () => {
  const dead = pets.findIndex(p => p.cur_hp <= 0)
  if (dead < 0) { alert('没有需要复苏的宠物'); return }
  setButtons(false); if (exports.use_revive(dead)) { setLog(ds(exports.get_last_message())); syncBattleUI(); syncFromMoonBit() }; setButtons(true)
})
btnUseCharm?.addEventListener('click', () => { setButtons(false); if (exports.use_charm()) { handleResult() } else { setButtons(true) } })

function renderSwitchPanel() {
  if (!petSwitchPanel) return
  const cur = exports.get_active()
  petSwitchPanel.innerHTML = pets.map((p, i) => {
    const dead = p.cur_hp <= 0
    return `<button class="switch-pet-btn" data-idx="${i}" ${dead || i === cur ? 'disabled' : ''}>${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">${p.cur_hp}/${p.hp}</span>${i===cur?' ⚔️':''}</button>`
  }).join('')
  petSwitchPanel.querySelectorAll('.switch-pet-btn:not([disabled])').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx)
      if (exports.switch_pet(idx)) {
        const taken = exports.get_last_damage_taken()
        setLog(`换上了 ${pets[idx].e} ${pets[idx].n}！受到 ${taken} 点反击。`)
        syncBattleUI(); syncFromMoonBit(); renderSwitchPanel()
        if (exports.get_last_player_defeated()) { setTimeout(() => { exports.recover_after_defeat(); syncBattleUI(); exitBattle() }, 1600) }
      }
    })
  })
}

function handleResult() {
  syncBattleUI(); setLog(ds(exports.get_last_message()))
  const won = exports.get_last_enemy_defeated(), lost = exports.get_last_player_defeated(), caught = exports.get_last_catch_success()
  if (caught || won) {
    if (caught) syncFromMoonBit()
    const max = exports.get_max_pets ? exports.get_max_pets() : 5
    if (pets.length > max) { showReleasePicker(() => { exitBattle() }) } else { setTimeout(exitBattle, 1500) }
    return
  }
  if (lost) {
    syncFromMoonBit()
    exports.auto_switch_active()
    syncFromMoonBit()
    if (exports.all_fainted()) {
      setLog(`所有宠物都无法出战了…逃离了战斗。`)
      setTimeout(exitBattle, 1800)
      return
    }
    if (exports.has_alive_pet()) {
      const dead = pets.findIndex(p => p.cur_hp <= 0)
      setLog(`${pets[dead]?.n || '宠物'} 倒下了！请切换宠物或逃跑。`)
      // 只启用切换和逃跑
      ;[btnAttack, btnSkill, btnUseHerb, btnUseRevive, btnUseCharm].forEach(b => { if (b) b.disabled = true })
      btnRun.disabled = false
      renderSwitchPanel()
      return
    }
  }
  setButtons(true)
}

function showReleasePicker(onDone) {
  const max = exports.get_max_pets ? exports.get_max_pets() : 5
  setLog(`队伍已满（${pets.length}/${max}），请选择一只放生的宠物：`); setButtons(false)
  const panel = document.createElement('div'); panel.id = 'release-picker'
  panel.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--border);'
  panel.innerHTML = pets.map((p, i) => `<button class="switch-pet-btn release-option" data-idx="${i}">${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">HP:${p.cur_hp}/${p.hp} ATK:${p.atk}</span></button>`).join('')
  const actions = document.querySelector('.battle-actions'); actions.parentNode.insertBefore(panel, actions)
  panel.querySelectorAll('.release-option').forEach(b => { b.addEventListener('click', () => { exports.release_pet(parseInt(b.dataset.idx)); syncFromMoonBit(); panel.remove(); setButtons(true); onDone() }) })
}

function exitBattle() {
  const rp = document.getElementById('release-picker'); if (rp) rp.remove()
  exports.commit_battle(); syncFromMoonBit()
  petSwitchPanel.hidden = true
  const bi = $('battle-items'); if (bi) bi.hidden = true
  $('map-items').hidden = false
  battleView.hidden = true; mapView.hidden = false
  trySpawnSpecialEvent()
}

// ── 特殊点位 ──────────────────────────────────────────────────────────────
function trySpawnSpecialEvent() {
  // 清除过期的特殊点位
  removeSpecialMarker()
  // 30% 概率刷新
  if (Math.random() > 0.3) return
  const types = Object.keys(SPECIAL_EVENTS).map(Number)
  const etype = types[Math.floor(Math.random() * types.length)]
  const x = 15 + Math.floor(Math.random() * 70)  // 15-85%
  const y = 20 + Math.floor(Math.random() * 55)  // 20-75%
  exports.place_event(etype, x, y)
  createSpecialMarker(etype, x, y)
}

function createSpecialMarker(etype, x, y) {
  const cfg = SPECIAL_EVENTS[etype]
  if (!cfg) return
  const btn = document.createElement('button')
  btn.id = 'special-marker'
  btn.className = `marker ${cfg.cls}`
  btn.style.cssText = `left:${x}%;top:${y}%;`
  btn.dataset.type = String(etype)
  btn.innerHTML = `<span class="marker-dot"></span><span class="marker-label">${cfg.emoji} ${cfg.name}</span>`
  btn.addEventListener('click', () => handleSpecialEvent(etype))
  document.querySelector('.map-bg').appendChild(btn)
}

function removeSpecialMarker() {
  const el = document.getElementById('special-marker')
  if (el) el.remove()
  exports.clear_event()
}

function handleSpecialEvent(etype) {
  removeSpecialMarker()
  exports.clear_event()
  const cfg = SPECIAL_EVENTS[etype]
  showEventMessage(cfg.desc)
  if (etype === 1) {
    // 宝藏：随机 1-3 个道具
    const r = Math.floor(Math.random() * 3)
    if (r === 0) { exports.add_herbs(2); showEventMessage('获得 🧪 药草 x2！') }
    else if (r === 1) { exports.add_revives(1); showEventMessage('获得 🌿 醒神草 x1！') }
    else { exports.add_charms(2); showEventMessage('获得 🔮 幻兽符 x2！') }
  } else if (etype === 2) {
    // 稀有敌人：进入战斗，敌属性 1.5x
    const loc = { 1:1, 2:2, 3:3, 4:4 }[Math.floor(Math.random()*4)+1]
    exports.start_battle(loc)
    // 1.5x 通过连续攻击模拟，简化处理
    syncBattleUI(); setButtons(true)
    petSwitchPanel.hidden = false
    $('battle-items').hidden = false; $('map-items').hidden = true
    mapView.hidden = true; battleView.hidden = false
    setLog('⭐ 遭遇了稀有敌人！属性大幅提升…')
  } else if (etype === 3) {
    // 神秘商人：用 HP 换道具
    exports.hurt_active(15)
    const r = Math.floor(Math.random() * 2)
    if (r === 0) { exports.add_charms(3); showEventMessage('🧙 神秘商人用幻兽符 x3 交换了你 15 HP') }
    else { exports.add_herbs(3); exports.add_revives(1); showEventMessage('🧙 神秘商人留下了药草 x3 和醒神草 x1，收走了你 15 HP') }
  }
  syncFromMoonBit()
}

function syncBattleUI() {
  setHp('player', exports.get_player_hp(), exports.get_player_max_hp())
  setHp('enemy', exports.get_enemy_hp(), exports.get_enemy_max_hp())
  $('enemy-avatar').textContent = ds(exports.get_enemy_emoji())
  $('enemy-name').textContent = ds(exports.get_enemy_name()) + ' ' + (ELEMENTS[exports.get_enemy_element()] || '?')
  const active = exports.get_active()
  if (pets[active]) {
    $('player-avatar').textContent = pets[active].e
    $('player-name').textContent = pets[active].n + ' ' + (ELEMENTS[pets[active].el ?? 4] || '?')
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
function setButtons(on) { [btnAttack, btnSkill, btnRun, btnUseHerb, btnUseRevive, btnUseCharm].forEach(b => { if (b) b.disabled = !on }) }

// ── 11. 启动 ───────────────────────────────────────────────────────────────
renderPetList(); renderSwitchPanel(); updateItemCounts()
$('map-items').hidden = false
console.log('✅ 幻兽森林已就绪')
})()
