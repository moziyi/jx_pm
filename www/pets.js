// @ts-check
// pets.js — 宠物列表/菜单/拖拽/初始选择

import { ELEMENTS, STARTERS } from "./config.js";

export function createPets($, exports, ds) {

  let pets = [], storedPets = [], storedPage = 0;
  let dragSrcIdx = -1, dragSrcStored = -1, wasDragging = false;

  function setPets(p, s) {
    pets.length = 0; pets.push(...p);
    storedPets.length = 0; storedPets.push(...s);
  }
  function getPets() { return pets; }
  function getStoredPets() { return storedPets; }

  const capturedList = $("captured-list"), caughtCount = $("caught-count");

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
    const cls = isStored ? " stored-pet" : (isActive ? " active-pet" : "") + (dead ? " fainted" : "");
    const extra = isStored ? " 寄存中" : (isActive ? " 出战中" : "") + (dead ? " 被击败" : "");
    return `<span class="captured-tag${cls}" draggable="true" data-idx="${idx}" data-stored="${isStored ? 1 : 0}" title="HP:${p.cur_hp}/${p.hp} ATK:${p.atk} DEF:${p.def??0} AGI:${p.agi??0} 元素:${el}${extra}">
      <div class="tag-top"><span class="tag-emoji">${p.e}</span><span class="tag-name">${p.n}</span><span class="tag-lv">Lv${lv}${lv >= maxLv ? " MAX" : ""}</span><span class="tag-element">${el}</span></div>
      <div class="tag-bottom"><span class="tag-hp-text">${dead ? "💀" : p.cur_hp + "/" + p.hp}</span><span class="tag-hp-bar"><span class="tag-hp-fill ${hpColor}" style="width:${hpPct}%"></span></span><span class="tag-exp-bar"><span class="tag-exp-fill" style="width:${expPct}%"></span></span></div>
    </span>`;
  }

  function renderPetList(ctx) {
    const { saveGame, exports } = ctx;
    const max = exports.get_max_pets ? exports.get_max_pets() : 5;
    const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10;
    $("max-pets").textContent = max;
    const active = exports.get_active();
    caughtCount.textContent = pets.length;
    if ($("active-pet")) {
      const a = pets[active];
      if (a) $("active-pet").textContent = `${a.e} ${a.n} Lv${a.lv ?? 1} HP:${a.cur_hp}/${a.hp} ATK:${a.atk}`;
    }
    $("stored-count").textContent = storedPets.length;
    $("max-stored").textContent = maxStored;
    if (pets.length === 0) {
      capturedList.innerHTML = '<span class="empty-tip">还没有宠物</span>';
    } else {
      capturedList.innerHTML = pets.map((p, i) => renderPetTagHTML(p, i, false, i === active)).join("");
    }
    const STORED_PAGE_SIZE = 20;
    const storedList = $("stored-list"), storedPager = $("stored-pager");
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
        storedList.innerHTML = page.length === 0 ? '<span class="empty-tip">寄存空间为空</span>' : page.map((p, i) => renderPetTagHTML(p, start + i, true, false)).join("");
        if (storedPager && totalPages > 1) {
          storedPager.innerHTML = `<button class="page-btn" data-page="prev" ${storedPage === 0 ? "disabled" : ""}>◀</button><span class="page-info">${storedPage + 1}/${totalPages}</span><button class="page-btn" data-page="next" ${storedPage >= totalPages - 1 ? "disabled" : ""}>▶</button>`;
          storedPager.querySelectorAll(".page-btn").forEach((b) => {
            b.addEventListener("click", () => {
              if (b.dataset.page === "prev" && storedPage > 0) storedPage--;
              else if (b.dataset.page === "next" && storedPage < totalPages - 1) storedPage++;
              renderPetList(ctx);
            });
          });
        } else if (storedPager) storedPager.innerHTML = "";
      }
    }
    document.querySelectorAll(".captured-tag").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (wasDragging) { wasDragging = false; return; }
        e.stopPropagation();
        showPetMenu(parseInt(el.dataset.idx), parseInt(el.dataset.stored), el, ctx);
      });
    });
    [capturedList, $("stored-list")].forEach((list) => {
      if (!list) return;
      list.ondragstart = (e) => {
        const tag = e.target.closest(".captured-tag"); if (!tag) return;
        dragSrcIdx = parseInt(tag.dataset.idx); dragSrcStored = parseInt(tag.dataset.stored);
        wasDragging = true; e.dataTransfer.effectAllowed = "move"; tag.style.opacity = "0.4";
      };
      list.ondragend = (e) => {
        const tag = e.target.closest(".captured-tag"); if (tag) tag.style.opacity = "";
        dragSrcIdx = -1; dragSrcStored = -1; list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
      };
      list.ondragover = (e) => {
        e.preventDefault(); e.dataTransfer.dropEffect = "move";
        const tag = e.target.closest(".captured-tag"); if (!tag || parseInt(tag.dataset.stored) !== dragSrcStored) return;
        list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over")); tag.classList.add("drag-over");
      };
      list.ondragleave = (e) => { const tag = e.target.closest(".captured-tag"); if (tag) tag.classList.remove("drag-over"); };
      list.ondrop = (e) => {
        e.preventDefault(); const tag = e.target.closest(".captured-tag");
        list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
        if (!tag || dragSrcIdx < 0) return;
        const dstIdx = parseInt(tag.dataset.idx), dstStored = parseInt(tag.dataset.stored);
        if (dragSrcStored !== dstStored || dragSrcIdx === dstIdx) return;
        if (dragSrcStored) exports.reorder_stored(dragSrcIdx, dstIdx); else exports.reorder_owned(dragSrcIdx, dstIdx);
        ctx.syncFromMoonBit();
      };
    });
  }

  function showPetMenu(idx, stored, anchor, ctx) {
    const { exports, saveGame, syncFromMoonBit } = ctx;
    const old = document.querySelector(".pet-popup"); if (old) old.remove();
    const popup = document.createElement("div"); popup.className = "pet-popup";
    const rect = anchor.getBoundingClientRect();
    popup.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.bottom + 4}px;background:#16213e;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:4px;z-index:100;min-width:140px;`;
    const list = stored ? storedPets : pets; const p = list[idx];
    const isActive = !stored && idx === exports.get_active();
    const onlyOne = !stored && pets.length <= 1; const dead = p.cur_hp <= 0;
    const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10;
    const expNext = exports.exp_to_next ? exports.exp_to_next(p.lv ?? 1) : 999;
    const maxTeam = exports.get_max_pets ? exports.get_max_pets() : 5;
    let menuHtml = `<div style="padding:6px 10px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:2px;">${p.e} ${p.n} <span style="color:#a78bfa;font-size:11px;">Lv${p.lv??1}</span> <span style="color:#888;font-size:11px;">HP:${p.cur_hp}/${p.hp} ATK:${p.atk} DEF:${p.def??0} AGI:${p.agi??0} EXP:${p.exp??0}/${expNext}${dead?" 💀倒下":""}${stored?" 📦寄存中":""}</span></div><button class="popup-btn" data-action="rename">✏️ 改名</button>`;
    if (stored) {
      menuHtml += `<button class="popup-btn" data-action="withdraw" ${pets.length>=maxTeam?"disabled":""}>📤 ${pets.length>=maxTeam?"队伍已满":"取回队伍"}</button>`;
      menuHtml += `<button class="popup-btn" data-action="release" style="color:#E24B4A;">🗑️ 放生</button>`;
    } else {
      menuHtml += `<button class="popup-btn" data-action="setactive" ${isActive||dead?"disabled":""}>⚔️ ${isActive?"已是出战宠物":dead?"倒下":"设为出战"}</button>`;
      menuHtml += `<button class="popup-btn" data-action="store" ${onlyOne||storedPets.length>=maxStored?"disabled":""}>📦 ${storedPets.length>=maxStored?"寄存已满":"寄存"}</button>`;
      menuHtml += `<button class="popup-btn" data-action="release" style="color:#E24B4A;" ${onlyOne?"disabled":""}>🗑️ 放生</button>`;
    }
    popup.innerHTML = menuHtml;
    popup.querySelectorAll(".popup-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const a = b.dataset.action; popup.remove();
        if (a === "rename") { const n = prompt("为这只宠物取名：",p.n); if (n&&n.trim()) { list[idx].n=n.trim(); saveGame(pets, storedPets, exports); renderPetList(ctx); } }
        else if (a === "setactive") { exports.set_active(idx); syncFromMoonBit(); }
        else if (a === "release") { if (confirm(`确定要放生 ${p.e} ${p.n} 吗？此操作不可撤销。`)) { if (stored) exports.release_stored_pet(idx); else exports.release_pet(idx); syncFromMoonBit(); } }
        else if (a === "store") { if (exports.store_pet(idx)) syncFromMoonBit(); }
        else if (a === "withdraw") { if (exports.withdraw_pet(idx)) syncFromMoonBit(); }
      });
    });
    document.body.appendChild(popup);
    setTimeout(() => document.addEventListener("click", () => popup.remove(), { once: true }), 10);
  }

  function showStarterPick(ctx) {
    const { exports, pokedex, syncFromMoonBit, saveGame } = ctx;
    const panel = $("starter-pick"), cardsEl = $("starter-cards");
    if (!panel||!cardsEl||!Array.isArray(STARTERS)) return;
    panel.style.display="flex"; $("map-view").hidden=true;
    cardsEl.innerHTML = STARTERS.map((s,i) => { const el = ELEMENTS[s.el]||"?"; return `<button class="starter-card" data-idx="${i}"><span class="starter-emoji">${s.e}</span><span class="starter-name">${s.n}</span><span class="starter-el">${el}</span><span class="starter-desc">${s.desc}</span><span class="starter-stats">HP:${s.hp} ATK:${s.atk} DEF:${s.def} AGI:${s.agi}</span></button>`; }).join("");
    cardsEl.querySelectorAll(".starter-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = STARTERS[parseInt(btn.dataset.idx)];
        exports.clear_pets(); exports.add_pet(s.hp,s.atk,s.def,s.agi,1,0,s.hp,s.el);
        exports.set_active(0); pokedex.markCaught(s.n);
        panel.style.display="none"; $("map-view").removeAttribute("hidden");
        syncFromMoonBit();
        pets[0].n=s.n; pets[0].e=s.e;
        saveGame(pets,storedPets,exports); renderPetList(ctx);
      });
    });
  }

  function renderSwitchPanel(panel, ctx) {
    if (!panel) return; const cur = exports.get_active();
    panel.innerHTML = pets.map((p,i) => { const dead=p.cur_hp<=0; return `<button class="switch-pet-btn" data-idx="${i}" ${dead||i===cur?"disabled":""}>${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">${p.cur_hp}/${p.hp}</span>${i===cur?" ⚔️":""}</button>`; }).join("");
    panel.querySelectorAll(".switch-pet-btn:not([disabled])").forEach((b) => {
      b.addEventListener("click", () => {
        const idx = parseInt(b.dataset.idx);
        if (exports.switch_pet(idx)) {
          const msg1 = ds(exports.get_last_message());
          const msg2 = ds(exports.get_last_message2 ? exports.get_last_message2() : "");
          ctx.ui.setLog(msg1);
          ctx.syncBattleUI(); ctx.syncFromMoonBit();
          if (msg2 !== "") {
            setTimeout(() => { ctx.ui.setLog(msg2); ctx.syncBattleUI(); afterSwitch(); }, 700);
          } else { afterSwitch(); }
        }
      });
      function afterSwitch() {
        if (exports.get_last_player_defeated()) {
          setTimeout(() => { exports.recover_after_defeat(); ctx.syncBattleUI(); ctx.exitBattle(); }, 1600);
          return;
        }
        renderSwitchPanel(panel, ctx); ctx.ui.setButtons(true, exports);
      }
    });
  }

  function showReleasePicker(ctx) {
    const { exports, syncFromMoonBit, ui } = ctx;
    const max = exports.get_max_pets ? exports.get_max_pets() : 5;
    ui.setLog(`队伍已满（${pets.length}/${max}），请选择一只放生的宠物：`);
    ui.setButtons(false, exports);
    const panel = document.createElement("div"); panel.id="release-picker";
    panel.style.cssText="display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-bottom:0.5px solid var(--border);";
    panel.innerHTML = pets.map((p,i) => `<button class="switch-pet-btn release-option" data-idx="${i}">${p.e} ${p.n} <span style="font-size:10px;color:var(--muted)">HP:${p.cur_hp}/${p.hp} ATK:${p.atk}</span></button>`).join("");
    const actions = document.querySelector(".battle-actions");
    actions.parentNode.insertBefore(panel, actions);
    panel.querySelectorAll(".release-option").forEach((b) => {
      b.addEventListener("click", () => {
        exports.release_pet(parseInt(b.dataset.idx)); syncFromMoonBit(); panel.remove(); ui.setButtons(true, exports);
        ctx.exitBattle();
      });
    });
  }

  return { setPets, getPets, getStoredPets, renderPetTagHTML, renderPetList, showPetMenu, showStarterPick, renderSwitchPanel, showReleasePicker };
}
