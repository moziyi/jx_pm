// map.js — 地图事件/特殊点位

import { EVENTS, SCENES, SPECIAL_EVENTS, weightedPick } from "./config.js";

export function createMap($, exports, ds, battleMod, ui, pokedexMod) {

  function triggerEvent(sceneKey) {
    const pool = EVENTS[sceneKey]; if (!pool) return { type: "none" };
    return Math.random() < 1 / 3 ? { type: "battle", enemy: weightedPick(pool.battles).enemy } : { type: "event", evt: weightedPick(pool.events) };
  }

  function handleEvent(evt, ctx) {
    if (evt.type === "item") { exports["add_" + evt.item](evt.n); if (evt.extra) exports["add_" + evt.extra.item](evt.extra.n); }
    else if (evt.type === "heal_active") exports.heal_active(evt.n);
    else if (evt.type === "heal_active_full") exports.heal_active_full();
    else if (evt.type === "revive_one") exports.revive_one();
    else if (evt.type === "hurt_active") exports.hurt_active(evt.n);
    else if (evt.type === "heal_all") exports.heal_all(evt.n);
    else if (evt.type === "hurt_all") exports.hurt_all(evt.n);
    ctx.syncFromMoonBit(); ui.showEventPopup(evt.msg);
  }

  function setupMarkers(ctx) {
    document.querySelectorAll(".marker").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sceneKey = btn.dataset.scene; const result = triggerEvent(sceneKey);
        if (result.type === "none") return;
        if (result.type === "battle") battleMod.enterBattle(ctx, sceneKey);
        else if (result.type === "event") handleEvent(result.evt, ctx);
      });
    });
  }

  function trySpawnSpecial(ctx) {
    removeSpecialMarker();
    if (Math.random() > 0.3) return;
    const types = Object.keys(SPECIAL_EVENTS).map(Number);
    const etype = types[Math.floor(Math.random() * types.length)];
    const x = 15 + Math.floor(Math.random() * 70), y = 20 + Math.floor(Math.random() * 55);
    exports.place_event(etype, x, y); createSpecialMarker(etype, x, y, ctx);
  }

  function createSpecialMarker(etype, x, y, ctx) {
    const cfg = SPECIAL_EVENTS[etype]; if (!cfg) return;
    const btn = document.createElement("button"); btn.id = "special-marker";
    btn.className = `marker ${cfg.cls}`; btn.style.cssText = `left:${x}%;top:${y}%;`;
    btn.dataset.type = String(etype);
    btn.innerHTML = `<span class="marker-dot"></span><span class="marker-label">${cfg.emoji} ${cfg.name}</span>`;
    btn.addEventListener("click", () => handleSpecialEvent(etype, ctx));
    document.querySelector(".map-bg").appendChild(btn);
  }

  function removeSpecialMarker() { const el = document.getElementById("special-marker"); if (el) el.remove(); exports.clear_event(); }

  function handleSpecialEvent(etype, ctx) {
    removeSpecialMarker(); exports.clear_event(); ui.showEventPopup(SPECIAL_EVENTS[etype].name);
    if (etype === 1) {
      const r = Math.floor(Math.random()*3);
      if (r===0) { exports.add_herbs(2); ui.showEventPopup("获得 🧪 药草 x2！"); }
      else if (r===1) { exports.add_revives(1); ui.showEventPopup("获得 🌿 醒神草 x1！"); }
      else { exports.add_charms(2); ui.showEventPopup("获得 🔮 幻兽符 x2！"); }
    } else if (etype === 2) {
      const keys = Object.keys(SCENES); const locId = SCENES[keys[Math.floor(Math.random()*keys.length)]].id;
      exports.start_battle(locId); battleMod.syncBattleUI(ctx); ui.setButtons(true, exports);
      battleMod.petSwitchPanel.hidden = false; $("battle-items").hidden = false; $("btn-items").hidden = true;
      $("map-view").hidden = true; $("battle-view").hidden = false; ui.setLog("⭐ 遭遇了稀有敌人！属性大幅提升…");
    } else if (etype === 3) {
      exports.hurt_active(15); const r = Math.floor(Math.random()*2);
      if (r===0) { exports.add_charms(3); ui.showEventPopup("🧙 神秘商人用幻兽符 x3 交换了你 15 HP"); }
      else { exports.add_herbs(3); exports.add_revives(1); ui.showEventPopup("🧙 神秘商人留下了药草 x3 和醒神草 x1，收走了你 15 HP"); }
    }
    ctx.syncFromMoonBit();
  }

  return { setupMarkers, trySpawnSpecial, removeSpecialMarker };
}
