// app.js — 幻兽森林 应用入口

import { loadWasm } from "./wasm.js";
import { createUI } from "./ui.js";
import { createPokedex } from "./pokedex.js";
import { createPets } from "./pets.js";
import { createBattle } from "./battle.js";
import { createItems } from "./items.js";
import { createMap } from "./map.js";
import { loadGame, saveGame } from "./storage.js";

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
  const btnUseHerb = $("btn-herb"), btnUseRevive = $("btn-revive"), btnUseHerb50 = $("btn-herb50"), btnUseHerbHalf = $("btn-herb-half"), btnUseHerbFull = $("btn-herb-full"), btnUseReviveFull = $("btn-revive-full");
  const btnUseCharm = $("btn-charm"), btnUseGreatCharm = $("btn-great-charm");
  const ui = createUI($, battleView, battleLog, btnAttack, btnRun, btnSkill, btnUseHerb, btnUseRevive, btnUseHerb50, btnUseHerbHalf, btnUseHerbFull, btnUseReviveFull, btnUseCharm, btnUseGreatCharm);
  const battleMod = createBattle($, exports, ds, petsMod, ui, pokedexMod);

  // Items
  const itemsMod = createItems($, exports, null, null); // will wire after context

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

  // Wire items with context
  itemsMod.updateCounts = () => {
    const { updateCounts } = createItems($, exports, syncFromMoonBit, null);
    const fn = updateCounts;
    return () => fn(btnUseHerb, btnUseRevive, btnUseHerb50, btnUseHerbHalf, btnUseHerbFull, btnUseReviveFull, btnUseCharm);
  }();

  // syncFromMoonBit
  function syncFromMoonBit() {
    const petById = {}; for (const p of petsMod.getPets()) petById[p.id] = p;
    const storedById = {}; for (const p of petsMod.getStoredPets()) storedById[p.id] = p;
    const count = exports.get_owned_count(); const newPets = [];
    for (let i = 0; i < count; i++) {
      const id = exports.get_owned_id(i); let p = petById[id] || storedById[id];
      if (p) { delete petById[id]; delete storedById[id]; }
      else { p = { id, n: ds(exports.get_owned_name(i)), e: ds(exports.get_owned_emoji(i)) }; }
      p.hp = exports.get_owned_hp(i); p.atk = exports.get_owned_atk(i); p.def = exports.get_owned_def(i); p.agi = exports.get_owned_agi(i);
      p.lv = exports.get_owned_lv(i); p.exp = exports.get_owned_exp(i); p.cur_hp = exports.get_owned_cur_hp(i); p.el = exports.get_owned_element(i);
      newPets.push(p);
    }
    const sc = exports.get_stored_count ? exports.get_stored_count() : 0; const newStored = [];
    for (let i = 0; i < sc; i++) {
      const id = exports.get_stored_id(i); let p = storedById[id] || petById[id];
      if (p) { delete storedById[id]; delete petById[id]; }
      else { p = { id, n: ds(exports.get_stored_name(i)), e: ds(exports.get_stored_emoji(i)) }; }
      p.hp = exports.get_stored_hp(i); p.atk = exports.get_stored_atk(i); p.def = exports.get_stored_def(i); p.agi = exports.get_stored_agi(i);
      p.lv = exports.get_stored_lv(i); p.exp = exports.get_stored_exp(i); p.cur_hp = exports.get_stored_cur_hp(i); p.el = exports.get_stored_element(i);
      newStored.push(p);
    }
    petsMod.setPets(newPets, newStored);
    itemsMod.updateCounts();
    saveGame(newPets, newStored, exports);
    petsMod.renderPetList(ctx);
  }

  // Setup
  battleMod.setupButtons(ctx);
  mapMod.setupMarkers(ctx);
  itemsMod.setupMapButtons(ctx);

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
  itemsMod.updateCounts();
  pokedexMod.render($);
  $("map-items").hidden = false;
  console.log("✅ 幻兽森林已就绪");
})();
