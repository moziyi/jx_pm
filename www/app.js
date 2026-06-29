// @ts-check
// app.js — 幻兽森林 应用入口

import { loadWasm } from "./wasm.js";
import { createUI } from "./ui.js";
import { createPokedex } from "./pokedex.js";
import { createPets } from "./pets.js";
import { createBattle } from "./battle.js";
import { createItems } from "./items.js";
import { createMap } from "./map.js";
import { loadGame, saveGame, parseWasmState } from "./storage.js";

(async () => {
  const $ = (id) => document.getElementById(id);

  // WASM
  const wasmUrl = "./main.wasm";
  let { exports, ds } = {};
  try {
    const wasm = await loadWasm(wasmUrl);
    exports = wasm.exports; ds = wasm.ds;
  } catch (err) {
    document.body.innerHTML = `<div style="padding:24px;color:#E24B4A;background:#1a1a2e;font-family:monospace;max-width:580px;margin:40px auto;border-radius:12px;border:1px solid #E24B4A;"><b>WASM 加载失败</b><br><br>${err.message}</div>`;
    return;
  }

  // Modules
  const pokedexMod = createPokedex();
  const petsMod = createPets($, exports, ds);
  const battleView = $("battle-view"), battleLog = $("battle-log");
  const btnAttack = $("btn-attack"), btnSkill = $("btn-skill"), btnRun = $("btn-run");
  const btnItems = $("btn-items");
  const ui = createUI($, battleView, battleLog, btnAttack, btnRun, btnSkill, btnItems);

  // Items (needed by battle)
  const itemsMod = createItems($, exports, ds, petsMod, syncFromMoonBit);

  const battleMod = createBattle($, exports, ds, petsMod, ui, pokedexMod, itemsMod);

  // Map
  const mapMod = createMap($, exports, ds, battleMod, ui, pokedexMod);

  // Shared context
  const ctx = {
    exports, ds, $,
    get pets() { return petsMod.getPets(); },
    get storedPets() { return petsMod.getStoredPets(); },
    pokedex: pokedexMod, ui, pets: petsMod, battle: battleMod, items: itemsMod, map: mapMod,
    syncFromMoonBit,
    syncBattleUI: () => battleMod.syncBattleUI(ctx),
    exitBattle: () => battleMod.exitBattle(ctx),
    trySpawnSpecial: () => mapMod.trySpawnSpecial(ctx),
    saveGame: (pets, stored) => saveGame(pets, stored, exports),
  };

  // syncFromMoonBit — 用 export_save 一次拿全量数据
  function syncFromMoonBit() {
    const raw = ds(exports.export_save());
    const state = parseWasmState(raw);
    if (!state) return;
    // 保留 JS 侧名字/emoji（WASM 侧可能是"未知"）
    const petById = {}; for (const p of petsMod.getPets()) petById[p.id] = p;
    const storedById = {}; for (const p of petsMod.getStoredPets()) storedById[p.id] = p;
    for (const p of state.pets) {
      const old = petById[p.id] || storedById[p.id];
      if (old) { p.n = old.n; p.e = old.e; }
    }
    for (const p of state.stored) {
      const old = storedById[p.id] || petById[p.id];
      if (old) { p.n = old.n; p.e = old.e; }
    }
    petsMod.setPets(state.pets, state.stored);
    saveGame(state.pets, state.stored, exports);
    petsMod.renderPetList(ctx);
  }

  // Setup
  battleMod.setupButtons(ctx);
  mapMod.setupMarkers(ctx);
  $("btn-items")?.addEventListener("click", () => itemsMod.openMenu('map'));

  // Init: load save or new game
  const saved = loadGame();
  if (saved && saved.pets.length > 0) {
    exports.clear_pets();
    const allPets = [...saved.pets, ...(saved.stored || [])];
    for (const p of allPets) exports.add_pet_with_id(p.id??0, p.hp, p.atk, p.def??0, p.agi??0, p.lv??1, p.exp??0, p.cur_hp, p.el??4);
    let maxId = 0; for (const p of allPets) if ((p.id??0) > maxId) maxId = p.id;
    exports.reset_next_id(maxId + 1); exports.set_active(saved.active);
    if (saved.stored && saved.stored.length > 0 && saved.pets.length > 0) { const si = saved.pets.length; for (let i=0;i<saved.stored.length;i++) exports.store_pet(si); }
    if (saved.inv) {
      exports.add_herbs(saved.inv.herbs - exports.get_herbs()); exports.add_revives(saved.inv.revives - exports.get_revives());
      exports.add_charms(saved.inv.charms - exports.get_charms()); exports.add_great_charms((saved.inv.great_charms||1) - (exports.get_great_charms?exports.get_great_charms():1));
      if (exports.add_herb50) exports.add_herb50((saved.inv.herb50||1) - (exports.get_herb50?exports.get_herb50():1));
      if (exports.add_herb_half) exports.add_herb_half((saved.inv.herb_half||1) - (exports.get_herb_half?exports.get_herb_half():1));
      if (exports.add_herb_full) exports.add_herb_full((saved.inv.herb_full||0) - (exports.get_herb_full?exports.get_herb_full():0));
      if (exports.add_revive_full) exports.add_revive_full((saved.inv.revive_full||0) - (exports.get_revive_full?exports.get_revive_full():0));
    }
    petsMod.setPets(saved.pets, saved.stored || []);
  } else {
    exports.new_game();
    petsMod.showStarterPick(ctx);
  }

  // Bootstrap
  $("btn-pokedex")?.addEventListener("click", () => { const panel = $("pokedex-panel"); if (panel) { panel.hidden = !panel.hidden; if (!panel.hidden) pokedexMod.render($); } });
  petsMod.renderPetList(ctx);
  battleMod.syncBattleUI(ctx);
  pokedexMod.render($);
  $("btn-items").hidden = false;
  console.log("✅ 幻兽森林已就绪");
})();
