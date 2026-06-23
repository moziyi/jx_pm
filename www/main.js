// main.js — 幻兽森林 应用逻辑
import { ELEMENTS, STARTER_PET, INITIAL_ITEMS, SCENES, EVENTS, SPECIAL_EVENTS, weightedPick } from './config.js'
import { checksum, getUUID, loadGame, saveGame } from './storage.js'

(async () => {

const wasmUrl = '/_build/wasm/release/build/main/main.wasm'
let exports, mem, pets = [], storedPets = [], storedPage = 0
let dragSrcIdx = -1, dragSrcStored = -1

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
  for (const p of saved.pets) exports.add_pet(p.hp, p.atk, p.def ?? 0, p.agi ?? 0, p.lv ?? 1, p.exp ?? 0, p.cur_hp, p.el ?? 4)
  exports.set_active(saved.active)
  if (saved.inv) {
    exports.add_herbs(saved.inv.herbs - exports.get_herbs())
    exports.add_revives(saved.inv.revives - exports.get_revives())
    exports.add_charms(saved.inv.charms - exports.get_charms())
    exports.add_great_charms((saved.inv.great_charms || 1) - (exports.get_great_charms ? exports.get_great_charms() : 1))
  }
  pets = saved.pets
  storedPets = saved.stored || []
} else {
  exports.new_game()
  const n = exports.get_owned_count()
  for (let i = 0; i < n; i++) {
    pets.push({ n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)), hp: exports.get_owned_hp(i), atk: exports.get_owned_atk(i), def: exports.get_owned_def(i), agi: exports.get_owned_agi(i), lv: exports.get_owned_lv(i), exp: exports.get_owned_exp(i), cur_hp: exports.get_owned_cur_hp(i), el: exports.get_owned_element(i) })
  }
  saveGame(pets, storedPets, exports)
}

function syncFromMoonBit() {
  const count = exports.get_owned_count()
  for (let i = 0; i < count; i++) {
    if (i >= pets.length) {
      pets.push({ n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)), hp: exports.get_owned_hp(i), atk: exports.get_owned_atk(i), def: exports.get_owned_def(i), agi: exports.get_owned_agi(i), lv: exports.get_owned_lv(i), exp: exports.get_owned_exp(i), cur_hp: exports.get_owned_cur_hp(i), el: exports.get_owned_element(i) })
    } else {
      pets[i].hp = exports.get_owned_hp(i); pets[i].atk = exports.get_owned_atk(i)
      pets[i].def = exports.get_owned_def(i); pets[i].agi = exports.get_owned_agi(i)
      pets[i].lv = exports.get_owned_lv(i); pets[i].exp = exports.get_owned_exp(i)
      pets[i].cur_hp = exports.get_owned_cur_hp(i); pets[i].el = exports.get_owned_element(i)
    }
  }
  pets.length = count
  const sc = exports.get_stored_count ? exports.get_stored_count() : 0
  for (let i = 0; i < sc; i++) {
    if (i >= storedPets.length) {
      storedPets.push({
        n: ds(exports.get_stored_name(i)), e: ds(exports.get_stored_emoji(i)),
        hp: exports.get_stored_hp(i), atk: exports.get_stored_atk(i),
        def: exports.get_stored_def(i), agi: exports.get_stored_agi(i),
        lv: exports.get_stored_lv(i), exp: exports.get_stored_exp(i),
        cur_hp: exports.get_stored_cur_hp(i), el: exports.get_stored_element(i)
      })
    } else {
      const sp = storedPets[i]
      sp.hp = exports.get_stored_hp(i); sp.atk = exports.get_stored_atk(i)
      sp.def = exports.get_stored_def(i); sp.agi = exports.get_stored_agi(i)
      sp.lv = exports.get_stored_lv(i); sp.exp = exports.get_stored_exp(i)
      sp.cur_hp = exports.get_stored_cur_hp(i); sp.el = exports.get_stored_element(i)
    }
  }
  storedPets.length = sc
  updateItemCounts()
  saveGame(pets, storedPets, exports)
  renderPetList()
}

// ── 4. DOM ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id)
const mapView = $('map-view'), battleView = $('battle-view'), battleLog = $('battle-log')
const capturedList = $('captured-list'), caughtCount = $('caught-count')
const btnAttack = $('btn-attack'), btnSkill = $('btn-skill'), btnRun = $('btn-run')
const btnUseHerb = $('btn-herb'), btnUseRevive = $('btn-revive'), btnUseCharm = $('btn-charm'), btnUseGreatCharm = $('btn-great-charm')
const petSwitchPanel = $('pet-switch')

// ── 5. 动画 ────────────────────────────────────────────────────────────────
function showDamageFloat(el, value, isHeal) {
  if (!el) return
  const span = document.createElement('span')
  span.className = 'dmg-float' + (isHeal ? ' heal' : '')
  span.textContent = (isHeal ? '+' : '') + value
  el.appendChild(span)
  setTimeout(() => span.remove(), 900)
}

function shakeScreen() {
  const view = $('battle-view')
  if (!view) return
  view.classList.add('shaking')
  setTimeout(() => view.classList.remove('shaking'), 350)
}

function showEventPopup(msg) {
  const old = document.querySelector('.event-toast')
  if (old) old.remove()
  const el = document.createElement('div')
  el.className = 'event-toast'; el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 400) }, 1500)
}

// ── 6. 宠物列表 ────────────────────────────────────────────────────────────
function renderPetTagHTML(p, idx, isStored, isActive) {
  const el = ELEMENTS[p.el ?? 4] || '?'
  const dead = p.cur_hp <= 0
  const lv = p.lv ?? 1
  const exp = p.exp ?? 0
  const expNext = exports.exp_to_next ? exports.exp_to_next(lv) : 999
  const expPct = expNext > 0 ? Math.min(100, exp / expNext * 100) : 100
  const expBar = dead ? '' : `<span class="tag-exp-wrap"><span class="tag-exp-fill" style="width:${expPct}%"></span></span>`
  const maxLv = exports.get_max_level ? exports.get_max_level() : 50
  const cls = isStored ? ' stored-pet' : (isActive ? ' active-pet' : '') + (dead ? ' fainted' : '')
  const extra = isStored ? ' 📦寄存中' : (isActive ? ' ⚔️出战中' : '') + (dead ? ' 💀被击败' : '')
  return `<span class="captured-tag${cls}" draggable="true" data-idx="${idx}" data-stored="${isStored ? 1 : 0}" title="HP:${p.cur_hp}/${p.hp} ATK:${p.atk} DEF:${p.def??0} AGI:${p.agi??0} 元素:${el}${extra}">
    <span class="tag-emoji">${p.e}</span><span class="tag-name">${p.n}</span>
    <span class="tag-lv">Lv${lv}${lv >= maxLv ? ' MAX' : ''}</span>
    <span class="tag-element">${el}</span>
    <span class="tag-stats">${dead ? '💀' : p.cur_hp+'/'+p.hp}</span>
    ${expBar}
  </span>`
}

function renderPetList() {
  const max = exports.get_max_pets ? exports.get_max_pets() : 5
  const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10
  $('max-pets').textContent = max
  const active = exports.get_active()
  caughtCount.textContent = pets.length
  if ($('active-pet')) {
    const a = pets[active]
    if (a) $('active-pet').textContent = `${a.e} ${a.n} Lv${a.lv ?? 1} HP:${a.cur_hp}/${a.hp} ATK:${a.atk}`
  }
  $('stored-count').textContent = storedPets.length
  $('max-stored').textContent = maxStored
  if (pets.length === 0) {
    capturedList.innerHTML = '<span class="empty-tip">还没有宠物</span>'
  } else {
    capturedList.innerHTML = pets.map((p, i) => renderPetTagHTML(p, i, false, i === active)).join('')
  }
  const STORED_PAGE_SIZE = 20
  const storedList = $('stored-list')
  const storedPager = $('stored-pager')
  if (storedList) {
    if (storedPets.length === 0) {
      storedList.innerHTML = '<span class="empty-tip">寄存空间为空</span>'
      if (storedPager) storedPager.innerHTML = ''
    } else {
      const totalPages = Math.ceil(storedPets.length / STORED_PAGE_SIZE)
      if (storedPage >= totalPages) storedPage = totalPages - 1
      if (storedPage < 0) storedPage = 0
      const start = storedPage * STORED_PAGE_SIZE
      const page = storedPets.slice(start, start + STORED_PAGE_SIZE)
      storedList.innerHTML = page.length === 0
        ? '<span class="empty-tip">寄存空间为空</span>'
        : page.map((p, i) => renderPetTagHTML(p, start + i, true, false)).join('')
      if (storedPager && totalPages > 1) {
        storedPager.innerHTML = `<button class="page-btn" data-page="prev" ${storedPage===0?'disabled':''}>◀</button><span class="page-info">${storedPage+1}/${totalPages}</span><button class="page-btn" data-page="next" ${storedPage>=totalPages-1?'disabled':''}>▶</button>`
        storedPager.querySelectorAll('.page-btn').forEach(b => {
          b.addEventListener('click', () => {
            if (b.dataset.page === 'prev' && storedPage > 0) storedPage--
            else if (b.dataset.page === 'next' && storedPage < totalPages - 1) storedPage++
            renderPetList()
          })
        })
      } else if (storedPager) {
        storedPager.innerHTML = ''
      }
    }
  }
  document.querySelectorAll('.captured-tag').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); showPetMenu(parseInt(el.dataset.idx), parseInt(el.dataset.stored), el) })
  })
  // 拖拽排序
  ;[capturedList, $('stored-list')].forEach(list => {
    if (!list) return
    list.ondragstart = (e) => {
      const tag = e.target.closest('.captured-tag')
      if (!tag) return
      dragSrcIdx = parseInt(tag.dataset.idx)
      dragSrcStored = parseInt(tag.dataset.stored)
      e.dataTransfer.effectAllowed = 'move'
      tag.style.opacity = '0.4'
    }
    list.ondragend = (e) => {
      const tag = e.target.closest('.captured-tag')
      if (tag) tag.style.opacity = ''
      dragSrcIdx = -1; dragSrcStored = -1
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
    }
    list.ondragover = (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const tag = e.target.closest('.captured-tag')
      if (!tag || parseInt(tag.dataset.stored) !== dragSrcStored) return
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
      tag.classList.add('drag-over')
    }
    list.ondragleave = (e) => {
      const tag = e.target.closest('.captured-tag')
      if (tag) tag.classList.remove('drag-over')
    }
    list.ondrop = (e) => {
      e.preventDefault()
      const tag = e.target.closest('.captured-tag')
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
      if (!tag || dragSrcIdx < 0) return
      const dstIdx = parseInt(tag.dataset.idx)
      const dstStored = parseInt(tag.dataset.stored)
      if (dragSrcStored !== dstStored || dragSrcIdx === dstIdx) return
      if (dragSrcStored) {
        exports.reorder_stored(dragSrcIdx, dstIdx)
      } else {
        exports.reorder_owned(dragSrcIdx, dstIdx)
      }
      syncFromMoonBit()
    }
  })
}

function showPetMenu(idx, stored, anchor) {
  const old = document.querySelector('.pet-popup'); if (old) old.remove()
  const popup = document.createElement('div'); popup.className = 'pet-popup'
  const rect = anchor.getBoundingClientRect()
  popup.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.bottom+4}px;background:#16213e;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:4px;z-index:100;min-width:140px;`
  const list = stored ? storedPets : pets
  const p = list[idx]
  const isActive = !stored && idx === exports.get_active()
  const onlyOne = !stored && pets.length <= 1
  const dead = p.cur_hp <= 0
  const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10
  const expNext = exports.exp_to_next ? exports.exp_to_next(p.lv ?? 1) : 999
  const maxTeam = exports.get_max_pets ? exports.get_max_pets() : 5
  let menuHtml = `
    <div style="padding:6px 10px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:2px;">${p.e} ${p.n} <span style="color:#a78bfa;font-size:11px;">Lv${p.lv ?? 1}</span> <span style="color:#888;font-size:11px;">HP:${p.cur_hp}/${p.hp} ATK:${p.atk} DEF:${p.def??0} AGI:${p.agi??0} EXP:${p.exp??0}/${expNext}${dead?' 💀倒下':''}${stored?' 📦寄存中':''}</span></div>
    <button class="popup-btn" data-action="rename">✏️ 改名</button>`
  if (stored) {
    menuHtml += `<button class="popup-btn" data-action="withdraw" ${pets.length >= maxTeam ? 'disabled' : ''}>📤 ${pets.length >= maxTeam ? '队伍已满' : '取回队伍'}</button>`
    menuHtml += `<button class="popup-btn" data-action="release" style="color:#E24B4A;">🗑️ 放生</button>`
  } else {
    menuHtml += `<button class="popup-btn" data-action="setactive" ${isActive||dead?'disabled':''}>⚔️ ${isActive?'已是出战宠物':dead?'倒下':'设为出战'}</button>`
    menuHtml += `<button class="popup-btn" data-action="store" ${onlyOne||storedPets.length>=maxStored?'disabled':''}>📦 ${storedPets.length>=maxStored?'寄存已满':'寄存'}</button>`
    menuHtml += `<button class="popup-btn" data-action="release" style="color:#E24B4A;" ${onlyOne?'disabled':''}>🗑️ 放生</button>`
  }
  popup.innerHTML = menuHtml
  popup.querySelectorAll('.popup-btn').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.action; popup.remove()
      if (a === 'rename') { const n = prompt('为这只宠物取名：', p.n); if (n && n.trim()) { list[idx].n = n.trim(); saveGame(pets, storedPets, exports); renderPetList() } }
      else if (a === 'setactive') { exports.set_active(idx); syncFromMoonBit() }
      else if (a === 'release') { if (confirm(`确定要放生 ${p.e} ${p.n} 吗？此操作不可撤销。`)) { if (stored) { exports.release_stored_pet(idx) } else { exports.release_pet(idx) }; syncFromMoonBit() } }
      else if (a === 'store') { if (exports.store_pet(idx)) { syncFromMoonBit() } }
      else if (a === 'withdraw') { if (exports.withdraw_pet(idx)) { syncFromMoonBit() } }
    })
  })
  document.body.appendChild(popup)
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 10)
}

// ── 7. 道具 UI ─────────────────────────────────────────────────────────────
function updateItemCounts() {
  const h = exports.get_herbs(), r = exports.get_revives(), c = exports.get_charms(), gc = exports.get_great_charms ? exports.get_great_charms() : 0
  const set = (id, n) => { const el = $(id); if (el) el.textContent = 'x' + n }
  set('herb-count', h); set('map-herb-count', h); set('revive-count', r); set('map-revive-count', r)
  set('charm-count', c); set('great-charm-count', gc)
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
function triggerEvent(sceneKey) {
  const pool = EVENTS[sceneKey]
  if (!pool) return { type: 'none' }
  return Math.random() < 1/3
    ? { type: 'battle', enemy: weightedPick(pool.battles).enemy }
    : { type: 'event', evt: weightedPick(pool.events) }
}

function handleEvent(evt) {
  if (evt.type === 'item') { exports['add_' + evt.item](evt.n); if (evt.extra) exports['add_' + evt.extra.item](evt.extra.n) }
  else if (evt.type === 'heal_active') exports.heal_active(evt.n)
  else if (evt.type === 'heal_active_full') exports.heal_active_full()
  else if (evt.type === 'revive_one') exports.revive_one()
  else if (evt.type === 'hurt_active') exports.hurt_active(evt.n)
  else if (evt.type === 'heal_all') exports.heal_all(evt.n)
  else if (evt.type === 'hurt_all') exports.hurt_all(evt.n)
  syncFromMoonBit()
  showEventPopup(evt.msg)
}

// ── 9. 地图标记 ────────────────────────────────────────────────────────────
document.querySelectorAll('.marker').forEach(btn => {
  btn.addEventListener('click', () => {
    const sceneKey = btn.dataset.scene
    const result = triggerEvent(sceneKey)
    if (result.type === 'none') return
    if (result.type === 'battle') {
      const locId = SCENES[sceneKey].id
      if (!exports.start_battle(locId)) {
        showEventPopup('所有宠物都倒下了！使用醒神草或寻找恢复事件吧。')
        return
      }
      syncBattleUI()
      setLog(`遭遇了 ${ds(exports.get_enemy_name())}！选择你的行动。`)
      setButtons(true)
      petSwitchPanel.hidden = false
      const bi = $('battle-items'); if (bi) bi.hidden = false
      $('map-items').hidden = true
      mapView.hidden = true; battleView.hidden = false
    } else if (result.type === 'event') {
      handleEvent(result.evt)
    }
  })
})

// ── 10. 战斗 ───────────────────────────────────────────────────────────────
btnAttack.addEventListener('click', () => { setButtons(false); exports.player_attack(); handleResult() })
btnSkill?.addEventListener('click', () => { setButtons(false); exports.elemental_skill(); handleResult() })
btnRun.addEventListener('click', () => { setButtons(false); const wasDead = exports.get_player_hp() <= 0; exports.run_away(); if (wasDead) { exports.auto_switch_active(); syncFromMoonBit() } setLog(ds(exports.get_last_message())); setTimeout(exitBattle, 900) })

btnUseHerb?.addEventListener('click', () => {
  setButtons(false)
  if (exports.use_herb()) {
    setLog(ds(exports.get_last_message())); syncBattleUI(); syncFromMoonBit()
    showDamageFloat($('player-avatar'), 20, true) // heal animation
  }
  setButtons(true)
})
btnUseRevive?.addEventListener('click', () => {
  const dead = pets.findIndex(p => p.cur_hp <= 0)
  if (dead < 0) { alert('没有需要复苏的宠物'); return }
  setButtons(false); if (exports.use_revive(dead)) { setLog(ds(exports.get_last_message())); syncBattleUI(); syncFromMoonBit() }; setButtons(true)
})
btnUseCharm?.addEventListener('click', () => { setButtons(false); if (exports.use_charm()) { handleResult() } else { setButtons(true) } })
btnUseGreatCharm?.addEventListener('click', () => { setButtons(false); if (exports.use_great_charm()) { handleResult() } else { setButtons(true) } })

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
        setButtons(true)
        if (exports.get_last_player_defeated()) { setTimeout(() => { exports.recover_after_defeat(); syncBattleUI(); exitBattle() }, 1600) }
      }
    })
  })
}

function handleResult() {
  const dealt = exports.get_last_damage_dealt()
  const taken = exports.get_last_damage_taken()
  syncBattleUI()
  if (dealt > 0) { showDamageFloat($('enemy-avatar'), dealt, false); shakeScreen() }
  if (taken > 0 && !exports.get_last_catch_success()) { showDamageFloat($('player-avatar'), taken, false) }
  setLog(ds(exports.get_last_message()))
  const won = exports.get_last_enemy_defeated(), lost = exports.get_last_player_defeated(), caught = exports.get_last_catch_success()
  if (caught || won) {
    if (caught) syncFromMoonBit()
    const max = exports.get_max_pets ? exports.get_max_pets() : 5
    const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10
    if (pets.length > max) {
      if (storedPets.length < maxStored) {
        exports.store_pet(pets.length - 1)
        syncFromMoonBit()
        setLog(ds(exports.get_last_message()) + ` 队伍已满，${pets[pets.length-1]?.n || '新宠物'} 已自动寄存。`)
      } else {
        showReleasePicker(() => { exitBattle() })
        return
      }
    }
    setTimeout(exitBattle, 1500)
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
    if (exports.has_other_pet()) {
      const dead = pets.findIndex(p => p.cur_hp <= 0)
      setLog(`${pets[dead]?.n || '宠物'} 倒下了！请切换宠物或逃跑。`)
      // 只启用切换和逃跑
      ;[btnAttack, btnSkill, btnUseHerb, btnUseRevive, btnUseCharm, btnUseGreatCharm].forEach(b => { if (b) b.disabled = true })
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
  // Level-up notification
  if (exports.get_last_leveled_up && exports.get_last_leveled_up()) {
    const pet = pets[exports.get_active()]
    if (pet) showEventPopup(`🎉 ${pet.e} ${pet.n} 升级到 Lv${pet.lv}！`)
  }
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
  showEventPopup(cfg.desc)
  if (etype === 1) {
    const r = Math.floor(Math.random() * 3)
    if (r === 0) { exports.add_herbs(2); showEventPopup('获得 🧪 药草 x2！') }
    else if (r === 1) { exports.add_revives(1); showEventPopup('获得 🌿 醒神草 x1！') }
    else { exports.add_charms(2); showEventPopup('获得 🔮 幻兽符 x2！') }
  } else if (etype === 2) {
    const keys = Object.keys(SCENES)
    const locId = SCENES[keys[Math.floor(Math.random() * keys.length)]].id
    exports.start_battle(locId)
    syncBattleUI(); setButtons(true)
    petSwitchPanel.hidden = false
    $('battle-items').hidden = false; $('map-items').hidden = true
    mapView.hidden = true; battleView.hidden = false
    setLog('⭐ 遭遇了稀有敌人！属性大幅提升…')
  } else if (etype === 3) {
    exports.hurt_active(15)
    const r = Math.floor(Math.random() * 2)
    if (r === 0) { exports.add_charms(3); showEventPopup('🧙 神秘商人用幻兽符 x3 交换了你 15 HP') }
    else { exports.add_herbs(3); exports.add_revives(1); showEventPopup('🧙 神秘商人留下了药草 x3 和醒神草 x1，收走了你 15 HP') }
  }
  syncFromMoonBit()
}

function syncBattleUI() {
  setHp('player', exports.get_player_hp(), exports.get_player_max_hp())
  setHp('enemy', exports.get_enemy_hp(), exports.get_enemy_max_hp())
  $('enemy-avatar').textContent = ds(exports.get_enemy_emoji())
  const elv = exports.get_enemy_lv ? exports.get_enemy_lv() : 1
  const edef = exports.get_enemy_def ? exports.get_enemy_def() : 0
  const eagi = exports.get_enemy_agi ? exports.get_enemy_agi() : 0
  $('enemy-name').textContent = ds(exports.get_enemy_name()) + ' Lv' + elv + ' ' + (ELEMENTS[exports.get_enemy_element()] || '?')
  const enemyStats = $('enemy-stats')
  if (enemyStats) enemyStats.textContent = 'DEF:' + edef + ' AGI:' + eagi
  const active = exports.get_active()
  if (pets[active]) {
    $('player-avatar').textContent = pets[active].e
    $('player-name').textContent = pets[active].n + ' Lv' + (pets[active].lv ?? 1) + ' ' + (ELEMENTS[pets[active].el ?? 4] || '?')
    const playerStats = $('player-stats')
    if (playerStats) playerStats.textContent = 'DEF:' + (pets[active].def ?? 0) + ' AGI:' + (pets[active].agi ?? 0)
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
function setButtons(on) {
  [btnAttack, btnRun, btnUseHerb, btnUseRevive, btnUseCharm, btnUseGreatCharm].forEach(b => { if (b) b.disabled = !on })
  if (btnSkill) {
    const cd = exports.get_skill_cooldown ? exports.get_skill_cooldown() : 0
    btnSkill.disabled = !on || cd > 0
    const sub = btnSkill.querySelector('.btn-sub')
    if (sub) sub.textContent = cd > 0 ? '冷却中…' : '五行克制'
  }
}

// ── 11. 启动 ───────────────────────────────────────────────────────────────
renderPetList(); renderSwitchPanel(); updateItemCounts()
$('map-items').hidden = false
console.log('✅ 幻兽森林已就绪')
})()
