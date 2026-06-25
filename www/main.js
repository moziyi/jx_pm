// main.js — 幻兽森林 应用逻辑
import {
  ELEMENTS,
  STARTER_PET,
  INITIAL_ITEMS,
  SCENES,
  EVENTS,
  SPECIAL_EVENTS,
  POKEDEX,
  STARTERS,
  weightedPick,
} from "./config.js";
import { checksum, getUUID, loadGame, saveGame } from "./storage.js";

(async () => {
  const wasmUrl = "./main.wasm";
  let exports,
    mem,
    pets = [],
    storedPets = [],
    storedPage = 0;
  let dragSrcIdx = -1,
    dragSrcStored = -1,
    wasDragging = false;

  // ── 图鉴 ──
  const POKEDEX_KEY = "phantom_pokedex";
  let pokedex = {};
  try {
    pokedex = JSON.parse(localStorage.getItem(POKEDEX_KEY)) || {};
  } catch {
    pokedex = {};
  }
  function savePokedex() {
    localStorage.setItem(POKEDEX_KEY, JSON.stringify(pokedex));
  }
  function pokedexState(name) {
    return pokedex[name] || "";
  }
  function markEncountered(name) {
    if (!pokedex[name]) {
      pokedex[name] = "seen";
      savePokedex();
    }
  }
  function markCaught(name) {
    pokedex[name] = "caught";
    savePokedex();
  }
  function countDiscovered() {
    return Object.keys(pokedex).length;
  }

  // ── 1. WASM 加载 ───────────────────────────────────────────────────────────
  try {
    const buf = await fetch(wasmUrl).then((r) => {
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
    const { instance } = await WebAssembly.instantiate(buf, {
      env: { math_random: () => Math.random() },
    });
    exports = instance.exports;
    mem = new Uint8Array(exports.memory.buffer);
  } catch (err) {
    document.body.innerHTML = `<div style="padding:24px;color:#E24B4A;background:#1a1a2e;font-family:monospace;max-width:580px;margin:40px auto;border-radius:12px;border:1px solid #E24B4A;"><b>WASM 加载失败</b><br><br>${err.message}</div>`;
    return;
  }

  // ── 2. 工具 ────────────────────────────────────────────────────────────────
  function ds(ptr) {
    if (ptr === 0) return "";
    const len = new DataView(mem.buffer).getUint32(ptr - 4, true) & 0xffff;
    return new TextDecoder("utf-16le").decode(mem.slice(ptr, ptr + len * 2));
  }

  // ── 3. DOM ─────────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const mapView = $("map-view");

  // ── 4. 初始化 ──────────────────────────────────────────────────────────────
  const saved = loadGame();
  if (saved && saved.pets.length > 0) {
    exports.clear_pets();
    // 恢复所有宠物到队伍中（包含寄存的）
    const allPets = [...saved.pets, ...(saved.stored || [])];
    for (const p of allPets)
      exports.add_pet_with_id(
        p.id ?? 0,
        p.hp,
        p.atk,
        p.def ?? 0,
        p.agi ?? 0,
        p.lv ?? 1,
        p.exp ?? 0,
        p.cur_hp,
        p.el ?? 4,
      );
    // 同步 id 计数器
    let maxId = 0;
    for (const p of allPets) if ((p.id ?? 0) > maxId) maxId = p.id;
    exports.reset_next_id(maxId + 1);
    exports.set_active(saved.active);
    // 把寄存的宠物移到寄存空间
    if (saved.stored && saved.stored.length > 0 && saved.pets.length > 0) {
      const storeIdx = saved.pets.length;
      for (let i = 0; i < saved.stored.length; i++) {
        exports.store_pet(storeIdx);
      }
    }
    if (saved.inv) {
      exports.add_herbs(saved.inv.herbs - exports.get_herbs());
      exports.add_revives(saved.inv.revives - exports.get_revives());
      exports.add_charms(saved.inv.charms - exports.get_charms());
      exports.add_great_charms(
        (saved.inv.great_charms || 1) -
          (exports.get_great_charms ? exports.get_great_charms() : 1),
      );
      if (exports.add_herb50) exports.add_herb50((saved.inv.herb50 || 1) - (exports.get_herb50 ? exports.get_herb50() : 1));
      if (exports.add_herb_half) exports.add_herb_half((saved.inv.herb_half || 1) - (exports.get_herb_half ? exports.get_herb_half() : 1));
      if (exports.add_herb_full) exports.add_herb_full((saved.inv.herb_full || 0) - (exports.get_herb_full ? exports.get_herb_full() : 0));
      if (exports.add_revive_full) exports.add_revive_full((saved.inv.revive_full || 0) - (exports.get_revive_full ? exports.get_revive_full() : 0));
    }
    pets = saved.pets;
    storedPets = saved.stored || [];
  } else {
    // 新游戏 → 先初始化 WASM，再显示选择面板
    exports.new_game();
    showStarterPick();
  }

  function showStarterPick() {
    const panel = $("starter-pick");
    const cardsEl = $("starter-cards");
    if (!panel || !cardsEl || !Array.isArray(STARTERS)) return;
    panel.style.display = "flex";
    $("map-view").hidden = true;
    cardsEl.innerHTML = STARTERS.map((s, i) => {
      const el = ELEMENTS[s.el] || "?";
      return `<button class="starter-card" data-idx="${i}">
      <span class="starter-emoji">${s.e}</span>
      <span class="starter-name">${s.n}</span>
      <span class="starter-el">${el}</span>
      <span class="starter-desc">${s.desc}</span>
      <span class="starter-stats">HP:${s.hp} ATK:${s.atk} DEF:${s.def} AGI:${s.agi}</span>
    </button>`;
    }).join("");
    cardsEl.querySelectorAll(".starter-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = STARTERS[parseInt(btn.dataset.idx)];
        exports.clear_pets();
        exports.add_pet(s.hp, s.atk, s.def, s.agi, 1, 0, s.hp, s.el);
        exports.set_active(0);
        markCaught(s.n);
        panel.style.display = "none";
        $("map-view").removeAttribute("hidden");
        syncFromMoonBit();
        // add_pet 创建时名为"未知"，此处修正
        pets[0].n = s.n;
        pets[0].e = s.e;
        saveGame(pets, storedPets, exports);
        renderPetList();
      });
    });
  }

  function syncFromMoonBit() {
    // 按 id 匹配：先建映射
    const petById = {};
    for (const p of pets) petById[p.id] = p;
    const storedById = {};
    for (const p of storedPets) storedById[p.id] = p;

    const count = exports.get_owned_count();
    const newPets = [];
    for (let i = 0; i < count; i++) {
      const id = exports.get_owned_id(i);
      let p = petById[id] || storedById[id];
      if (p) {
        delete petById[id];
        delete storedById[id];
      } else {
        p = { id, n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)) };
      }
      p.hp = exports.get_owned_hp(i);
      p.atk = exports.get_owned_atk(i);
      p.def = exports.get_owned_def(i);
      p.agi = exports.get_owned_agi(i);
      p.lv = exports.get_owned_lv(i);
      p.exp = exports.get_owned_exp(i);
      p.cur_hp = exports.get_owned_cur_hp(i);
      p.el = exports.get_owned_element(i);
      newPets.push(p);
    }
    pets = newPets;

    const sc = exports.get_stored_count ? exports.get_stored_count() : 0;
    const newStored = [];
    for (let i = 0; i < sc; i++) {
      const id = exports.get_stored_id(i);
      let p = storedById[id] || petById[id];
      if (p) {
        delete storedById[id];
        delete petById[id];
      } else {
        p = { id, n: ds(exports.get_stored_name(i)), e: ds(exports.get_stored_emoji(i)) };
      }
      p.hp = exports.get_stored_hp(i);
      p.atk = exports.get_stored_atk(i);
      p.def = exports.get_stored_def(i);
      p.agi = exports.get_stored_agi(i);
      p.lv = exports.get_stored_lv(i);
      p.exp = exports.get_stored_exp(i);
      p.cur_hp = exports.get_stored_cur_hp(i);
      p.el = exports.get_stored_element(i);
      newStored.push(p);
    }
    storedPets = newStored;

    updateItemCounts();
    saveGame(pets, storedPets, exports);
    renderPetList();
  }

  // ── 4. DOM（续） ────────────────────────────────────────────────────────────
  const battleView = $("battle-view"),
    battleLog = $("battle-log");
  const capturedList = $("captured-list"),
    caughtCount = $("caught-count");
  const btnAttack = $("btn-attack"),
    btnSkill = $("btn-skill"),
    btnRun = $("btn-run");
  const btnUseHerb = $("btn-herb"),
    btnUseRevive = $("btn-revive"),
    btnUseHerb50 = $("btn-herb50"),
    btnUseHerbHalf = $("btn-herb-half"),
    btnUseHerbFull = $("btn-herb-full"),
    btnUseReviveFull = $("btn-revive-full"),
    btnUseCharm = $("btn-charm"),
    btnUseGreatCharm = $("btn-great-charm");
  const petSwitchPanel = $("pet-switch");

  // ── 5. 动画 ────────────────────────────────────────────────────────────────
  const EL_COLORS = ['#d4af37', '#4caf50', '#b8956a', '#4da6d9', '#e85d3a'];

  function showDamageFloat(el, value, isHeal, crit) {
    if (!el) return;
    const span = document.createElement("span");
    span.className = "dmg-float" + (isHeal ? " heal" : "") + (crit ? " crit" : "");
    span.textContent = (crit ? "💥" : "") + (isHeal ? "+" : "") + value;
    el.appendChild(span);
    setTimeout(() => span.remove(), 900);
  }

  function showMissText(el) {
    if (!el) return;
    const span = document.createElement("span");
    span.className = "miss-float";
    span.textContent = "MISS";
    el.appendChild(span);
    setTimeout(() => span.remove(), 600);
  }

  function playAttackAnim(el, cls) {
    if (!el) return;
    el.classList.add("attacking", cls);
    setTimeout(() => { el.classList.remove("attacking", cls); }, 250);
  }

  function playHitAnim(el) {
    if (!el) return;
    el.classList.add("hit-shake");
    setTimeout(() => el.classList.remove("hit-shake"), 300);
  }

  function playDodgeAnim(el) {
    if (!el) return;
    el.classList.add("dodge-pop");
    setTimeout(() => el.classList.remove("dodge-pop"), 400);
  }

  function playDefeatAnim(el) {
    if (!el) return;
    el.classList.add("defeat-fade");
    setTimeout(() => el.classList.remove("defeat-fade"), 500);
  }

  function screenCritFlash() {
    const view = $("battle-view");
    if (!view) return;
    view.classList.add("crit-flash");
    setTimeout(() => view.classList.remove("crit-flash"), 500);
  }

  function playLevelGlow(el) {
    if (!el) return;
    const pet = el.closest ? el : document.querySelector(el);
    if (!pet) return;
    pet.classList.add("level-glow");
    setTimeout(() => pet.classList.remove("level-glow"), 2400);
  }

  function playChargeGlow(el) {
    if (!el) return;
    el.classList.add("charge-glow");
    setTimeout(() => el.classList.remove("charge-glow"), 400);
  }

  function spawnParticles(el, color, count) {
    if (!el) return;
    count = count || 6;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "particle";
      p.style.cssText = `
        left:${cx}px; top:${cy}px; color:${color};
        --dx:${(Math.random()-0.5)*120}px;
        --dy:${(Math.random()-0.5)*100 - 30}px;
        font-size:${10 + Math.random()*10}px;
      `;
      p.textContent = ['✦','✧','•','·'][Math.floor(Math.random()*4)];
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  function screenShake() {
    const view = $("battle-view");
    if (!view) return;
    view.classList.add("shaking");
    setTimeout(() => view.classList.remove("shaking"), 350);
  }

  function playCatchFlash() {
    const enemy = $("enemy-avatar");
    if (!enemy) return;
    enemy.classList.add("catch-flash");
    setTimeout(() => enemy.classList.remove("catch-flash"), 600);
  }

  function showEventPopup(msg) {
    const old = document.querySelector(".event-toast");
    if (old) old.remove();
    const el = document.createElement("div");
    el.className = "event-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.classList.add("fade-out");
      setTimeout(() => el.remove(), 400);
    }, 1500);
  }

  // ── 6. 宠物列表 ────────────────────────────────────────────────────────────
  function renderPetTagHTML(p, idx, isStored, isActive) {
    const el = ELEMENTS[p.el ?? 4] || "?";
    const dead = p.cur_hp <= 0;
    const lv = p.lv ?? 1;
    const exp = p.exp ?? 0;
    const expNext = exports.exp_to_next ? exports.exp_to_next(lv) : 999;
    const expPct = expNext > 0 ? Math.min(100, (exp / expNext) * 100) : 100;
    const hpPct = Math.max(0, (p.cur_hp / p.hp) * 100);
    const hpColor = hpPct > 50 ? "green" : hpPct > 25 ? "yellow" : "red";
    const maxLv = exports.get_max_level ? exports.get_max_level() : 50;
    const cls = isStored
      ? " stored-pet"
      : (isActive ? " active-pet" : "") + (dead ? " fainted" : "");
    const extra = isStored
      ? " 寄存中"
      : (isActive ? " 出战中" : "") + (dead ? " 被击败" : "");
    return `<span class="captured-tag${cls}" draggable="true" data-idx="${idx}" data-stored="${isStored ? 1 : 0}" title="HP:${p.cur_hp}/${p.hp} ATK:${p.atk} DEF:${p.def??0} AGI:${p.agi??0} 元素:${el}${extra}">
      <div class="tag-top">
        <span class="tag-emoji">${p.e}</span><span class="tag-name">${p.n}</span>
        <span class="tag-lv">Lv${lv}${lv >= maxLv ? " MAX" : ""}</span>
        <span class="tag-element">${el}</span>
      </div>
      <div class="tag-bottom">
        <span class="tag-hp-text">${dead ? "💀" : p.cur_hp + "/" + p.hp}</span>
        <span class="tag-hp-bar"><span class="tag-hp-fill ${hpColor}" style="width:${hpPct}%"></span></span>
        <span class="tag-exp-bar"><span class="tag-exp-fill" style="width:${expPct}%"></span></span>
      </div>
    </span>`;
  }

  function renderPetList() {
    const max = exports.get_max_pets ? exports.get_max_pets() : 5;
    const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10;
    $("max-pets").textContent = max;
    const active = exports.get_active();
    caughtCount.textContent = pets.length;
    if ($("active-pet")) {
      const a = pets[active];
      if (a)
        $("active-pet").textContent =
          `${a.e} ${a.n} Lv${a.lv ?? 1} HP:${a.cur_hp}/${a.hp} ATK:${a.atk}`;
    }
    $("stored-count").textContent = storedPets.length;
    $("max-stored").textContent = maxStored;
    if (pets.length === 0) {
      capturedList.innerHTML = '<span class="empty-tip">还没有宠物</span>';
    } else {
      capturedList.innerHTML = pets
        .map((p, i) => renderPetTagHTML(p, i, false, i === active))
        .join("");
    }
    const STORED_PAGE_SIZE = 20;
    const storedList = $("stored-list");
    const storedPager = $("stored-pager");
    if (storedList) {
      if (storedPets.length === 0) {
        storedList.innerHTML = '<span class="empty-tip">寄存空间为空</span>';
        if (storedPager) storedPager.innerHTML = "";
      } else {
        const totalPages = Math.ceil(storedPets.length / STORED_PAGE_SIZE);
        if (storedPage >= totalPages) storedPage = totalPages - 1;
        if (storedPage < 0) storedPage = 0;
        const start = storedPage * STORED_PAGE_SIZE;
        const page = storedPets.slice(start, start + STORED_PAGE_SIZE);
        storedList.innerHTML =
          page.length === 0
            ? '<span class="empty-tip">寄存空间为空</span>'
            : page
                .map((p, i) => renderPetTagHTML(p, start + i, true, false))
                .join("");
        if (storedPager && totalPages > 1) {
          storedPager.innerHTML = `<button class="page-btn" data-page="prev" ${storedPage === 0 ? "disabled" : ""}>◀</button><span class="page-info">${storedPage + 1}/${totalPages}</span><button class="page-btn" data-page="next" ${storedPage >= totalPages - 1 ? "disabled" : ""}>▶</button>`;
          storedPager.querySelectorAll(".page-btn").forEach((b) => {
            b.addEventListener("click", () => {
              if (b.dataset.page === "prev" && storedPage > 0) storedPage--;
              else if (b.dataset.page === "next" && storedPage < totalPages - 1)
                storedPage++;
              renderPetList();
            });
          });
        } else if (storedPager) {
          storedPager.innerHTML = "";
        }
      }
    }
    document.querySelectorAll(".captured-tag").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (wasDragging) {
          wasDragging = false;
          return;
        }
        e.stopPropagation();
        showPetMenu(parseInt(el.dataset.idx), parseInt(el.dataset.stored), el);
      });
    });
    // 拖拽排序
    [capturedList, $("stored-list")].forEach((list) => {
      if (!list) return;
      list.ondragstart = (e) => {
        const tag = e.target.closest(".captured-tag");
        if (!tag) return;
        dragSrcIdx = parseInt(tag.dataset.idx);
        dragSrcStored = parseInt(tag.dataset.stored);
        wasDragging = true;
        e.dataTransfer.effectAllowed = "move";
        tag.style.opacity = "0.4";
      };
      list.ondragend = (e) => {
        const tag = e.target.closest(".captured-tag");
        if (tag) tag.style.opacity = "";
        dragSrcIdx = -1;
        dragSrcStored = -1;
        list
          .querySelectorAll(".drag-over")
          .forEach((el) => el.classList.remove("drag-over"));
      };
      list.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const tag = e.target.closest(".captured-tag");
        if (!tag || parseInt(tag.dataset.stored) !== dragSrcStored) return;
        list
          .querySelectorAll(".drag-over")
          .forEach((el) => el.classList.remove("drag-over"));
        tag.classList.add("drag-over");
      };
      list.ondragleave = (e) => {
        const tag = e.target.closest(".captured-tag");
        if (tag) tag.classList.remove("drag-over");
      };
      list.ondrop = (e) => {
        e.preventDefault();
        const tag = e.target.closest(".captured-tag");
        list
          .querySelectorAll(".drag-over")
          .forEach((el) => el.classList.remove("drag-over"));
        if (!tag || dragSrcIdx < 0) return;
        const dstIdx = parseInt(tag.dataset.idx);
        const dstStored = parseInt(tag.dataset.stored);
        if (dragSrcStored !== dstStored || dragSrcIdx === dstIdx) return;
        if (dragSrcStored) {
          exports.reorder_stored(dragSrcIdx, dstIdx);
        } else {
          exports.reorder_owned(dragSrcIdx, dstIdx);
        }
        syncFromMoonBit();
      };
    });
  }

  function showPetMenu(idx, stored, anchor) {
    const old = document.querySelector(".pet-popup");
    if (old) old.remove();
    const popup = document.createElement("div");
    popup.className = "pet-popup";
    const rect = anchor.getBoundingClientRect();
    popup.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.bottom + 4}px;background:#16213e;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:4px;z-index:100;min-width:140px;`;
    const list = stored ? storedPets : pets;
    const p = list[idx];
    const isActive = !stored && idx === exports.get_active();
    const onlyOne = !stored && pets.length <= 1;
    const dead = p.cur_hp <= 0;
    const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10;
    const expNext = exports.exp_to_next ? exports.exp_to_next(p.lv ?? 1) : 999;
    const maxTeam = exports.get_max_pets ? exports.get_max_pets() : 5;
    let menuHtml = `
    <div style="padding:6px 10px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:2px;">${p.e} ${p.n} <span style="color:#a78bfa;font-size:11px;">Lv${p.lv ?? 1}</span> <span style="color:#888;font-size:11px;">HP:${p.cur_hp}/${p.hp} ATK:${p.atk} DEF:${p.def ?? 0} AGI:${p.agi ?? 0} EXP:${p.exp ?? 0}/${expNext}${dead ? " 💀倒下" : ""}${stored ? " 📦寄存中" : ""}</span></div>
    <button class="popup-btn" data-action="rename">✏️ 改名</button>`;
    if (stored) {
      menuHtml += `<button class="popup-btn" data-action="withdraw" ${pets.length >= maxTeam ? "disabled" : ""}>📤 ${pets.length >= maxTeam ? "队伍已满" : "取回队伍"}</button>`;
      menuHtml += `<button class="popup-btn" data-action="release" style="color:#E24B4A;">🗑️ 放生</button>`;
    } else {
      menuHtml += `<button class="popup-btn" data-action="setactive" ${isActive || dead ? "disabled" : ""}>⚔️ ${isActive ? "已是出战宠物" : dead ? "倒下" : "设为出战"}</button>`;
      menuHtml += `<button class="popup-btn" data-action="store" ${onlyOne || storedPets.length >= maxStored ? "disabled" : ""}>📦 ${storedPets.length >= maxStored ? "寄存已满" : "寄存"}</button>`;
      menuHtml += `<button class="popup-btn" data-action="release" style="color:#E24B4A;" ${onlyOne ? "disabled" : ""}>🗑️ 放生</button>`;
    }
    popup.innerHTML = menuHtml;
    popup.querySelectorAll(".popup-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const a = b.dataset.action;
        popup.remove();
        if (a === "rename") {
          const n = prompt("为这只宠物取名：", p.n);
          if (n && n.trim()) {
            list[idx].n = n.trim();
            saveGame(pets, storedPets, exports);
            renderPetList();
          }
        } else if (a === "setactive") {
          exports.set_active(idx);
          syncFromMoonBit();
        } else if (a === "release") {
          if (confirm(`确定要放生 ${p.e} ${p.n} 吗？此操作不可撤销。`)) {
            if (stored) {
              exports.release_stored_pet(idx);
            } else {
              exports.release_pet(idx);
            }
            syncFromMoonBit();
          }
        } else if (a === "store") {
          if (exports.store_pet(idx)) {
            syncFromMoonBit();
          }
        } else if (a === "withdraw") {
          if (exports.withdraw_pet(idx)) {
            syncFromMoonBit();
          }
        }
      });
    });
    document.body.appendChild(popup);
    setTimeout(
      () =>
        document.addEventListener("click", () => popup.remove(), {
          once: true,
        }),
      10,
    );
  }

  // ── 7. 道具 UI ─────────────────────────────────────────────────────────────
  function updateItemCounts() {
    const h = exports.get_herbs(),
      r = exports.get_revives(),
      c = exports.get_charms(),
      gc = exports.get_great_charms ? exports.get_great_charms() : 0,
      h50 = exports.get_herb50 ? exports.get_herb50() : 0,
      hh = exports.get_herb_half ? exports.get_herb_half() : 0,
      hf = exports.get_herb_full ? exports.get_herb_full() : 0,
      rf = exports.get_revive_full ? exports.get_revive_full() : 0;
    const set = (id, n) => {
      const el = $(id);
      if (el) el.textContent = "x" + n;
    };
    set("herb-count", h);
    set("map-herb-count", h);
    set("revive-count", r);
    set("map-revive-count", r);
    set("herb50-count", h50);
    set("map-herb50-count", h50);
    set("herb-half-count", hh);
    set("map-herb-half-count", hh);
    set("herb-full-count", hf);
    set("map-herb-full-count", hf);
    set("revive-full-count", rf);
    set("map-revive-full-count", rf);
    set("charm-count", c);
    set("great-charm-count", gc);
    if (btnUseHerb) btnUseHerb.disabled = h <= 0;
    if (btnUseRevive) btnUseRevive.disabled = r <= 0;
    if (btnUseHerb50) btnUseHerb50.disabled = h50 <= 0;
    if (btnUseHerbHalf) btnUseHerbHalf.disabled = hh <= 0;
    if (btnUseHerbFull) btnUseHerbFull.disabled = hf <= 0;
    if (btnUseReviveFull) btnUseReviveFull.disabled = rf <= 0;
    if (btnUseCharm) btnUseCharm.disabled = c <= 0;
  }

  // 地图道具按钮
  $("map-herb")?.addEventListener("click", () => {
    if (exports.get_herbs() > 0) {
      exports.use_herb();
      syncFromMoonBit();
    }
  });
  $("map-revive")?.addEventListener("click", () => {
    if (exports.get_revives() <= 0) return;
    const dead = pets.findIndex((p) => p.cur_hp <= 0);
    if (dead < 0) {
      alert("没有需要复苏的宠物");
      return;
    }
    exports.use_revive(dead);
    syncFromMoonBit();
  });
  $("map-herb50")?.addEventListener("click", () => {
    if (exports.get_herb50 ? exports.get_herb50() > 0 : false) {
      exports.use_herb50();
      syncFromMoonBit();
    }
  });
  $("map-herb-half")?.addEventListener("click", () => {
    if (exports.get_herb_half ? exports.get_herb_half() > 0 : false) {
      exports.use_herb_half();
      syncFromMoonBit();
    }
  });
  $("map-herb-full")?.addEventListener("click", () => {
    if (exports.get_herb_full ? exports.get_herb_full() > 0 : false) {
      exports.use_herb_full();
      syncFromMoonBit();
    }
  });
  $("map-revive-full")?.addEventListener("click", () => {
    if (exports.get_revive_full ? exports.get_revive_full() <= 0 : true) return;
    const dead = pets.findIndex((p) => p.cur_hp <= 0);
    if (dead < 0) {
      alert("没有需要复苏的宠物");
      return;
    }
    exports.use_revive_full(dead);
    syncFromMoonBit();
  });

  // ── 8. 事件系统 ────────────────────────────────────────────────────────────
  function triggerEvent(sceneKey) {
    const pool = EVENTS[sceneKey];
    if (!pool) return { type: "none" };
    return Math.random() < 1 / 3
      ? { type: "battle", enemy: weightedPick(pool.battles).enemy }
      : { type: "event", evt: weightedPick(pool.events) };
  }

  function handleEvent(evt) {
    if (evt.type === "item") {
      exports["add_" + evt.item](evt.n);
      if (evt.extra) exports["add_" + evt.extra.item](evt.extra.n);
    } else if (evt.type === "heal_active") exports.heal_active(evt.n);
    else if (evt.type === "heal_active_full") exports.heal_active_full();
    else if (evt.type === "revive_one") exports.revive_one();
    else if (evt.type === "hurt_active") exports.hurt_active(evt.n);
    else if (evt.type === "heal_all") exports.heal_all(evt.n);
    else if (evt.type === "hurt_all") exports.hurt_all(evt.n);
    syncFromMoonBit();
    showEventPopup(evt.msg);
  }

  // ── 9. 地图标记 ────────────────────────────────────────────────────────────
  document.querySelectorAll(".marker").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sceneKey = btn.dataset.scene;
      const result = triggerEvent(sceneKey);
      if (result.type === "none") return;
      if (result.type === "battle") {
        const locId = SCENES[sceneKey].id;
        if (!exports.start_battle(locId)) {
          showEventPopup("所有宠物都倒下了！使用醒神草或寻找恢复事件吧。");
          return;
        }
        syncBattleUI();
        markEncountered(ds(exports.get_enemy_name()));
        setLog(`遭遇了 ${ds(exports.get_enemy_name())}！选择你的行动。`);
        setButtons(true);
        petSwitchPanel.hidden = false;
        const bi = $("battle-items");
        if (bi) bi.hidden = false;
        $("map-items").hidden = true;
        mapView.hidden = true;
        battleView.hidden = false;
      } else if (result.type === "event") {
        handleEvent(result.evt);
      }
    });
  });

  // ── 10. 战斗 ───────────────────────────────────────────────────────────────
  btnAttack.addEventListener("click", () => {
    setButtons(false);
    exports.player_attack();
    handleResult();
  });
  btnSkill?.addEventListener("click", () => {
    setButtons(false);
    exports.elemental_skill();
    handleResult();
  });
  btnRun.addEventListener("click", () => {
    setButtons(false);
    const wasDead = exports.get_player_hp() <= 0;
    exports.run_away();
    if (wasDead) {
      exports.auto_switch_active();
      syncFromMoonBit();
    }
    setLog(ds(exports.get_last_message()));
    setTimeout(exitBattle, 900);
  });

  btnUseHerb?.addEventListener("click", () => {
    setButtons(false);
    if (exports.use_herb()) {
      setLog(ds(exports.get_last_message()));
      syncBattleUI();
      syncFromMoonBit();
      showDamageFloat($("player-avatar"), 20, true); // heal animation
    }
    setButtons(true);
  });
  btnUseRevive?.addEventListener("click", () => {
    const dead = pets.findIndex((p) => p.cur_hp <= 0);
    if (dead < 0) {
      alert("没有需要复苏的宠物");
      return;
    }
    setButtons(false);
    if (exports.use_revive(dead)) {
      setLog(ds(exports.get_last_message()));
      syncBattleUI();
      syncFromMoonBit();
    }
    setButtons(true);
  });
  btnUseHerb50?.addEventListener("click", () => {
    setButtons(false);
    if (exports.use_herb50()) {
      setLog(ds(exports.get_last_message()));
      syncBattleUI();
      syncFromMoonBit();
      showDamageFloat($("player-avatar"), 50, true);
    }
    setButtons(true);
  });
  btnUseHerbHalf?.addEventListener("click", () => {
    setButtons(false);
    if (exports.use_herb_half()) {
      setLog(ds(exports.get_last_message()));
      syncBattleUI();
      syncFromMoonBit();
      showDamageFloat($("player-avatar"), 25, true);
    }
    setButtons(true);
  });
  btnUseHerbFull?.addEventListener("click", () => {
    setButtons(false);
    if (exports.use_herb_full()) {
      setLog(ds(exports.get_last_message()));
      syncBattleUI();
      syncFromMoonBit();
      showDamageFloat($("player-avatar"), 999, true);
    }
    setButtons(true);
  });
  btnUseReviveFull?.addEventListener("click", () => {
    const dead = pets.findIndex((p) => p.cur_hp <= 0);
    if (dead < 0) {
      alert("没有需要复苏的宠物");
      return;
    }
    setButtons(false);
    if (exports.use_revive_full(dead)) {
      setLog(ds(exports.get_last_message()));
      syncBattleUI();
      syncFromMoonBit();
    }
    setButtons(true);
  });
  btnUseCharm?.addEventListener("click", () => {
    setButtons(false);
    if (exports.use_charm()) {
      handleResult();
    } else {
      setButtons(true);
    }
  });
  btnUseGreatCharm?.addEventListener("click", () => {
    setButtons(false);
    if (exports.use_great_charm()) {
      handleResult();
    } else {
      setButtons(true);
    }
  });

  function renderSwitchPanel() {
    if (!petSwitchPanel) return;
    const cur = exports.get_active();
    petSwitchPanel.innerHTML = pets
      .map((p, i) => {
        const dead = p.cur_hp <= 0;
        return `<button class="switch-pet-btn" data-idx="${i}" ${dead || i === cur ? "disabled" : ""}>${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">${p.cur_hp}/${p.hp}</span>${i === cur ? " ⚔️" : ""}</button>`;
      })
      .join("");
    petSwitchPanel
      .querySelectorAll(".switch-pet-btn:not([disabled])")
      .forEach((b) => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.dataset.idx);
          if (exports.switch_pet(idx)) {
            const taken = exports.get_last_damage_taken();
            setLog(
              `换上了 ${pets[idx].e} ${pets[idx].n}！受到 ${taken} 点反击。`,
            );
            syncBattleUI();
            syncFromMoonBit();
            renderSwitchPanel();
            setButtons(true);
            if (exports.get_last_player_defeated()) {
              setTimeout(() => {
                exports.recover_after_defeat();
                syncBattleUI();
                exitBattle();
              }, 1600);
            }
          }
        });
      });
  }

  function handleResult() {
    const dealt = exports.get_last_damage_dealt();
    const taken = exports.get_last_damage_taken();
    const msgText = ds(exports.get_last_message());
    const isCrit = msgText.includes("暴击");
    const isDodge = exports.get_last_dodged ? exports.get_last_dodged() : msgText.includes("闪避");
    const isSkill = msgText.includes("元素技");
    syncBattleUI();

    // 攻击动作
    if (dealt > 0) {
      playAttackAnim($("player-avatar"), "player-av");
      if (isSkill) playChargeGlow($("player-avatar"));
    }

    // 敌人伤害
    if (dealt > 0) {
      showDamageFloat($("enemy-avatar"), dealt, false, isCrit);
      playHitAnim($("enemy-avatar"));
      if (isSkill) spawnParticles($("enemy-avatar"), EL_COLORS[exports.get_player_element()] || "#fff", 6);
    }

    // 暴击
    if (isCrit) {
      screenCritFlash();
      screenShake();
    } else if (dealt > 0 && !isCrit) {
      screenShake();
    }

    // 玩家受伤
    if (taken > 0 && !exports.get_last_catch_success()) {
      if (isDodge) {
        showMissText($("player-avatar"));
        playDodgeAnim($("player-avatar"));
      } else {
        showDamageFloat($("player-avatar"), taken, false, false);
        playHitAnim($("player-avatar"));
        playAttackAnim($("enemy-avatar"), "enemy-av");
      }
    }

    setLog(msgText);
    const won = exports.get_last_enemy_defeated(),
      lost = exports.get_last_player_defeated(),
      caught = exports.get_last_catch_success();

    if (caught || won) {
      if (caught) {
        syncFromMoonBit();
        markCaught(ds(exports.get_enemy_name()));
        playCatchFlash();
        spawnParticles($("enemy-avatar"), "#ffd700", 10);
      }
      if (won) {
        playDefeatAnim($("enemy-avatar"));
      }
      const max = exports.get_max_pets ? exports.get_max_pets() : 5;
      const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10;
      if (pets.length > max) {
        if (storedPets.length < maxStored) {
          exports.store_pet(pets.length - 1);
          syncFromMoonBit();
          setLog(msgText + ` 队伍已满，新宠物已自动寄存。`);
        } else {
          showReleasePicker(() => {
            exitBattle();
          });
          return;
        }
      }
      setTimeout(exitBattle, 1500);
      return;
    }
    if (lost) {
      syncFromMoonBit();
      exports.auto_switch_active();
      syncFromMoonBit();
      if (exports.all_fainted()) {
        setLog(`所有宠物都无法出战了…逃离了战斗。`);
        setTimeout(exitBattle, 1800);
        return;
      }
      if (exports.has_other_pet()) {
        const dead = pets.findIndex((p) => p.cur_hp <= 0);
        setLog(`${pets[dead]?.n || "宠物"} 倒下了！请切换宠物或逃跑。`);
        // 只启用切换和逃跑
        [
          btnAttack,
          btnSkill,
          btnUseHerb,
          btnUseRevive,
          btnUseHerb50,
          btnUseHerbHalf,
          btnUseHerbFull,
          btnUseReviveFull,
          btnUseCharm,
          btnUseGreatCharm,
        ].forEach((b) => {
          if (b) b.disabled = true;
        });
        btnRun.disabled = false;
        renderSwitchPanel();
        return;
      }
    }
    setButtons(true);
  }

  function showReleasePicker(onDone) {
    const max = exports.get_max_pets ? exports.get_max_pets() : 5;
    setLog(`队伍已满（${pets.length}/${max}），请选择一只放生的宠物：`);
    setButtons(false);
    const panel = document.createElement("div");
    panel.id = "release-picker";
    panel.style.cssText =
      "display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--border);";
    panel.innerHTML = pets
      .map(
        (p, i) =>
          `<button class="switch-pet-btn release-option" data-idx="${i}">${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">HP:${p.cur_hp}/${p.hp} ATK:${p.atk}</span></button>`,
      )
      .join("");
    const actions = document.querySelector(".battle-actions");
    actions.parentNode.insertBefore(panel, actions);
    panel.querySelectorAll(".release-option").forEach((b) => {
      b.addEventListener("click", () => {
        exports.release_pet(parseInt(b.dataset.idx));
        syncFromMoonBit();
        panel.remove();
        setButtons(true);
        onDone();
      });
    });
  }

  function exitBattle() {
    const rp = document.getElementById("release-picker");
    if (rp) rp.remove();
    exports.commit_battle();
    syncFromMoonBit();
    // Level-up notification
    if (exports.get_last_leveled_up && exports.get_last_leveled_up()) {
      const pet = pets[exports.get_active()];
      if (pet) {
        showEventPopup(`🎉 ${pet.e} ${pet.n} 升级到 Lv${pet.lv}！`);
        // 找到对应宠物标签加光效
        const tag = document.querySelector(`.captured-tag[data-idx="${exports.get_active()}"]:not([data-stored="1"])`);
        if (tag) playLevelGlow(tag);
      }
    }
    petSwitchPanel.hidden = true;
    const bi = $("battle-items");
    if (bi) bi.hidden = true;
    $("map-items").hidden = false;
    battleView.hidden = true;
    mapView.hidden = false;
    trySpawnSpecialEvent();
  }

  // ── 特殊点位 ──────────────────────────────────────────────────────────────
  function trySpawnSpecialEvent() {
    // 清除过期的特殊点位
    removeSpecialMarker();
    // 30% 概率刷新
    if (Math.random() > 0.3) return;
    const types = Object.keys(SPECIAL_EVENTS).map(Number);
    const etype = types[Math.floor(Math.random() * types.length)];
    const x = 15 + Math.floor(Math.random() * 70); // 15-85%
    const y = 20 + Math.floor(Math.random() * 55); // 20-75%
    exports.place_event(etype, x, y);
    createSpecialMarker(etype, x, y);
  }

  function createSpecialMarker(etype, x, y) {
    const cfg = SPECIAL_EVENTS[etype];
    if (!cfg) return;
    const btn = document.createElement("button");
    btn.id = "special-marker";
    btn.className = `marker ${cfg.cls}`;
    btn.style.cssText = `left:${x}%;top:${y}%;`;
    btn.dataset.type = String(etype);
    btn.innerHTML = `<span class="marker-dot"></span><span class="marker-label">${cfg.emoji} ${cfg.name}</span>`;
    btn.addEventListener("click", () => handleSpecialEvent(etype));
    document.querySelector(".map-bg").appendChild(btn);
  }

  function removeSpecialMarker() {
    const el = document.getElementById("special-marker");
    if (el) el.remove();
    exports.clear_event();
  }

  function handleSpecialEvent(etype) {
    removeSpecialMarker();
    exports.clear_event();
    const cfg = SPECIAL_EVENTS[etype];
    showEventPopup(cfg.desc);
    if (etype === 1) {
      const r = Math.floor(Math.random() * 3);
      if (r === 0) {
        exports.add_herbs(2);
        showEventPopup("获得 🧪 药草 x2！");
      } else if (r === 1) {
        exports.add_revives(1);
        showEventPopup("获得 🌿 醒神草 x1！");
      } else {
        exports.add_charms(2);
        showEventPopup("获得 🔮 幻兽符 x2！");
      }
    } else if (etype === 2) {
      const keys = Object.keys(SCENES);
      const locId = SCENES[keys[Math.floor(Math.random() * keys.length)]].id;
      exports.start_battle(locId);
      syncBattleUI();
      setButtons(true);
      petSwitchPanel.hidden = false;
      $("battle-items").hidden = false;
      $("map-items").hidden = true;
      mapView.hidden = true;
      battleView.hidden = false;
      setLog("⭐ 遭遇了稀有敌人！属性大幅提升…");
    } else if (etype === 3) {
      exports.hurt_active(15);
      const r = Math.floor(Math.random() * 2);
      if (r === 0) {
        exports.add_charms(3);
        showEventPopup("🧙 神秘商人用幻兽符 x3 交换了你 15 HP");
      } else {
        exports.add_herbs(3);
        exports.add_revives(1);
        showEventPopup("🧙 神秘商人留下了药草 x3 和醒神草 x1，收走了你 15 HP");
      }
    }
    syncFromMoonBit();
  }

  function syncBattleUI() {
    setHp("player", exports.get_player_hp(), exports.get_player_max_hp());
    setHp("enemy", exports.get_enemy_hp(), exports.get_enemy_max_hp());
    $("enemy-avatar").textContent = ds(exports.get_enemy_emoji());
    const elv = exports.get_enemy_lv ? exports.get_enemy_lv() : 1;
    const edef = exports.get_enemy_def ? exports.get_enemy_def() : 0;
    const eagi = exports.get_enemy_agi ? exports.get_enemy_agi() : 0;
    const eName = ds(exports.get_enemy_name());
    const eState = pokedexState(eName);
    const badge = eState === "caught" ? "📸" : eState === "seen" ? "📷" : "";
    $("enemy-name").textContent =
      (badge ? badge + " " : "") +
      eName +
      " Lv" +
      elv +
      " " +
      (ELEMENTS[exports.get_enemy_element()] || "?");
    const enemyStats = $("enemy-stats");
    if (enemyStats) enemyStats.textContent = "DEF:" + edef + " AGI:" + eagi;
    const active = exports.get_active();
    if (pets[active]) {
      $("player-avatar").textContent = pets[active].e;
      $("player-name").textContent =
        pets[active].n +
        " Lv" +
        (pets[active].lv ?? 1) +
        " " +
        (ELEMENTS[pets[active].el ?? 4] || "?");
      const playerStats = $("player-stats");
      if (playerStats)
        playerStats.textContent =
          "DEF:" + (pets[active].def ?? 0) + " AGI:" + (pets[active].agi ?? 0);
    }
    renderSwitchPanel();
  }

  function renderPokedex() {
    const panel = $("pokedex-panel");
    if (!panel) return;
    const total = 24;
    const discovered = countDiscovered();
    $("pokedex-count").textContent = `${discovered}/${total}`;
    let html = "";
    for (const [scene, monsters] of Object.entries(POKEDEX)) {
      const sceneInfo = SCENES[scene];
      html += `<div class="dex-group"><div class="dex-group-title">${sceneInfo.emoji} ${sceneInfo.name}</div><div class="dex-grid">`;
      for (const m of monsters) {
        const state = pokedexState(m.n);
        if (!state) {
          html += `<span class="dex-entry unknown" title="???"><span class="dex-silhouette">⚫</span></span>`;
        } else if (state === "seen") {
          html += `<span class="dex-entry seen" title="???"><span class="dex-icon-sm">${m.e}</span></span>`;
        } else {
          html += `<span class="dex-entry caught"><span class="dex-icon-sm">${m.e}</span><span class="dex-name">${m.n}</span><span class="dex-el">${ELEMENTS[m.el]}</span></span>`;
        }
      }
      html += `</div></div>`;
    }
    panel.innerHTML = html;
  }

  function setHp(who, cur, max) {
    const pct = Math.max(0, (cur / max) * 100);
    const bar = $(`${who}-hp-bar`);
    bar.style.width = pct + "%";
    bar.className =
      "hp-fill " + (pct > 50 ? "green" : pct > 25 ? "yellow" : "red");
    $(`${who}-hp-text`).textContent = `${Math.max(0, cur)}/${max}`;
  }
  function setLog(msg) {
    battleLog.textContent = msg;
  }
  function setButtons(on) {
    [
      btnAttack,
      btnRun,
      btnUseHerb,
      btnUseRevive,
      btnUseHerb50,
      btnUseHerbHalf,
      btnUseHerbFull,
      btnUseReviveFull,
      btnUseCharm,
      btnUseGreatCharm,
    ].forEach((b) => {
      if (b) b.disabled = !on;
    });
    if (btnSkill) {
      const cd = exports.get_skill_cooldown ? exports.get_skill_cooldown() : 0;
      btnSkill.disabled = !on || cd > 0;
      const sub = btnSkill.querySelector(".btn-sub");
      if (sub) sub.textContent = cd > 0 ? "冷却中…" : "五行克制";
    }
  }

  // ── 11. 启动 ───────────────────────────────────────────────────────────────
  $("btn-pokedex")?.addEventListener("click", () => {
    const panel = $("pokedex-panel");
    if (panel) {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderPokedex();
    }
  });
  renderPetList();
  renderSwitchPanel();
  updateItemCounts();
  renderPokedex();
  $("map-items").hidden = false;
  console.log("✅ 幻兽森林已就绪");
})();
