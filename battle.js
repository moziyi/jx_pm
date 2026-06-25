// battle.js — 战斗：按钮/回合处理/切换/释放/退场

import { SCENES } from "./config.js";
import { EL_COLORS } from "./ui.js";

export function createBattle($, exports, ds, petsMod, ui, pokedexMod) {

  const battleView = $("battle-view"), battleLog = $("battle-log"), petSwitchPanel = $("pet-switch");
  const btnAttack = $("btn-attack"), btnSkill = $("btn-skill"), btnRun = $("btn-run");
  const btnUseHerb = $("btn-herb"), btnUseRevive = $("btn-revive"), btnUseHerb50 = $("btn-herb50"), btnUseHerbHalf = $("btn-herb-half"), btnUseHerbFull = $("btn-herb-full"), btnUseReviveFull = $("btn-revive-full");
  const btnUseCharm = $("btn-charm"), btnUseGreatCharm = $("btn-great-charm");
  const mapView = $("map-view");

  function getPets() { return petsMod.getPets(); }
  function getStored() { return petsMod.getStoredPets(); }

  function syncBattleUI(ctx) {
    const pets = getPets();
    ui.setHp("player", exports.get_player_hp(), exports.get_player_max_hp());
    ui.setHp("enemy", exports.get_enemy_hp(), exports.get_enemy_max_hp());
    $("enemy-avatar").textContent = ds(exports.get_enemy_emoji());
    const elv = exports.get_enemy_lv ? exports.get_enemy_lv() : 1;
    const edef = exports.get_enemy_def ? exports.get_enemy_def() : 0;
    const eagi = exports.get_enemy_agi ? exports.get_enemy_agi() : 0;
    const eName = ds(exports.get_enemy_name());
    const eState = pokedexMod.state(eName);
    const badge = eState === "caught" ? "📸" : eState === "seen" ? "📷" : "";
    $("enemy-name").textContent = (badge ? badge + " " : "") + eName + " Lv" + elv + " " + (["金","木","土","水","火"][exports.get_enemy_element()] || "?");
    const enemyStats = $("enemy-stats"); if (enemyStats) enemyStats.textContent = "DEF:" + edef + " AGI:" + eagi;
    const active = exports.get_active();
    if (pets[active]) {
      $("player-avatar").textContent = pets[active].e;
      $("player-name").textContent = pets[active].n + " Lv" + (pets[active].lv ?? 1) + " " + (["金","木","土","水","火"][pets[active].el ?? 4] || "?");
      const playerStats = $("player-stats"); if (playerStats) playerStats.textContent = "DEF:" + (pets[active].def ?? 0) + " AGI:" + (pets[active].agi ?? 0);
    }
    petsMod.renderSwitchPanel(petSwitchPanel, ctx);
  }

  function handleResult(ctx) {
    const pets = getPets(), storedPets = getStored();
    const { syncFromMoonBit, pokedex, ui } = ctx;
    const dealt = exports.get_last_damage_dealt();
    const taken = exports.get_last_damage_taken();
    const msgText = ds(exports.get_last_message());
    const isCrit = msgText.includes("暴击");
    const isDodge = exports.get_last_dodged ? exports.get_last_dodged() : msgText.includes("闪避");
    const isSkill = msgText.includes("元素技");
    syncBattleUI(ctx);

    if (dealt > 0) {
      ui.playAttackAnim($("player-avatar"), "player-av");
      if (isSkill) ui.playChargeGlow($("player-avatar"));
    }
    if (dealt > 0) {
      ui.showDamageFloat($("enemy-avatar"), dealt, false, isCrit);
      ui.playHitAnim($("enemy-avatar"));
      if (isSkill) ui.spawnParticles($("enemy-avatar"), EL_COLORS[exports.get_player_element()] || "#fff", 6);
    }
    if (isCrit) { ui.screenCritFlash(); ui.screenShake(); }
    else if (dealt > 0 && !isCrit) { ui.screenShake(); }

    if (taken > 0 && !exports.get_last_catch_success()) {
      if (isDodge) { ui.showMissText($("player-avatar")); ui.playDodgeAnim($("player-avatar")); }
      else { ui.showDamageFloat($("player-avatar"), taken, false, false); ui.playHitAnim($("player-avatar")); ui.playAttackAnim($("enemy-avatar"), "enemy-av"); }
    }

    ui.setLog(msgText);
    const won = exports.get_last_enemy_defeated(), lost = exports.get_last_player_defeated(), caught = exports.get_last_catch_success();

    if (caught || won) {
      if (caught) { syncFromMoonBit(); pokedex.markCaught(ds(exports.get_enemy_name())); ui.playCatchFlash(); ui.spawnParticles($("enemy-avatar"), "#ffd700", 10); }
      if (won) { ui.playDefeatAnim($("enemy-avatar")); }
      const max = exports.get_max_pets ? exports.get_max_pets() : 5;
      const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10;
      if (pets.length > max) {
        if (storedPets.length < maxStored) { exports.store_pet(pets.length - 1); syncFromMoonBit(); ui.setLog(msgText + ` 队伍已满，新宠物已自动寄存。`); }
        else { petsMod.showReleasePicker(ctx); return; }
      }
      setTimeout(() => exitBattle(ctx), 1500);
      return;
    }
    if (lost) {
      syncFromMoonBit(); exports.auto_switch_active(); syncFromMoonBit();
      if (exports.all_fainted()) { ui.setLog(`所有宠物都无法出战了…逃离了战斗。`); setTimeout(() => exitBattle(ctx), 1800); return; }
      if (exports.has_other_pet()) {
        const dead = pets.findIndex((p) => p.cur_hp <= 0);
        ui.setLog(`${pets[dead]?.n || "宠物"} 倒下了！请切换宠物或逃跑。`);
        [btnAttack, btnSkill, btnUseHerb, btnUseRevive, btnUseHerb50, btnUseHerbHalf, btnUseHerbFull, btnUseReviveFull, btnUseCharm, btnUseGreatCharm].forEach((b) => { if (b) b.disabled = true; });
        btnRun.disabled = false; petsMod.renderSwitchPanel(petSwitchPanel, ctx); return;
      }
    }
    ui.setButtons(true, exports);
  }

  function exitBattle(ctx) {
    const rp = document.getElementById("release-picker"); if (rp) rp.remove();
    exports.commit_battle(); ctx.syncFromMoonBit();
    if (exports.get_last_leveled_up && exports.get_last_leveled_up()) {
      const pet = getPets()[exports.get_active()];
      if (pet) { ui.showEventPopup(`🎉 ${pet.e} ${pet.n} 升级到 Lv${pet.lv}！`);
        const tag = document.querySelector(`.captured-tag[data-idx="${exports.get_active()}"]:not([data-stored="1"])`); if (tag) ui.playLevelGlow(tag); }
    }
    petSwitchPanel.hidden = true; const bi = $("battle-items"); if (bi) bi.hidden = true;
    $("map-items").hidden = false; battleView.hidden = true; mapView.hidden = false;
    ctx.trySpawnSpecial();
  }

  function setupButtons(ctx) {
    btnAttack.addEventListener("click", () => { ui.setButtons(false, exports); exports.player_attack(); handleResult(ctx); });
    btnSkill?.addEventListener("click", () => { ui.setButtons(false, exports); exports.elemental_skill(); handleResult(ctx); });
    btnRun.addEventListener("click", () => {
      ui.setButtons(false, exports); const wasDead = exports.get_player_hp() <= 0; exports.run_away();
      if (wasDead) { exports.auto_switch_active(); ctx.syncFromMoonBit(); }
      ui.setLog(ds(exports.get_last_message())); setTimeout(() => exitBattle(ctx), 900);
    });
    btnUseHerb?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb()) { ui.setLog(ds(exports.get_last_message())); syncBattleUI(ctx); ctx.syncFromMoonBit(); ui.showDamageFloat($("player-avatar"), 20, true); } ui.setButtons(true, exports); });
    btnUseRevive?.addEventListener("click", () => {
      const dead = getPets().findIndex((p) => p.cur_hp <= 0); if (dead < 0) { alert("没有需要复苏的宠物"); return; }
      ui.setButtons(false, exports); if (exports.use_revive(dead)) { ui.setLog(ds(exports.get_last_message())); syncBattleUI(ctx); ctx.syncFromMoonBit(); } ui.setButtons(true, exports);
    });
    btnUseHerb50?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb50()) { ui.setLog(ds(exports.get_last_message())); syncBattleUI(ctx); ctx.syncFromMoonBit(); ui.showDamageFloat($("player-avatar"), 50, true); } ui.setButtons(true, exports); });
    btnUseHerbHalf?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb_half()) { ui.setLog(ds(exports.get_last_message())); syncBattleUI(ctx); ctx.syncFromMoonBit(); ui.showDamageFloat($("player-avatar"), 25, true); } ui.setButtons(true, exports); });
    btnUseHerbFull?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb_full()) { ui.setLog(ds(exports.get_last_message())); syncBattleUI(ctx); ctx.syncFromMoonBit(); ui.showDamageFloat($("player-avatar"), 999, true); } ui.setButtons(true, exports); });
    btnUseReviveFull?.addEventListener("click", () => {
      const dead = getPets().findIndex((p) => p.cur_hp <= 0); if (dead < 0) { alert("没有需要复苏的宠物"); return; }
      ui.setButtons(false, exports); if (exports.use_revive_full(dead)) { ui.setLog(ds(exports.get_last_message())); syncBattleUI(ctx); ctx.syncFromMoonBit(); } ui.setButtons(true, exports);
    });
    btnUseCharm?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_charm()) { handleResult(ctx); } else { ui.setButtons(true, exports); } });
    btnUseGreatCharm?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_great_charm()) { handleResult(ctx); } else { ui.setButtons(true, exports); } });
  }

  function enterBattle(ctx, sceneKey) {
    const locId = SCENES[sceneKey].id;
    if (!exports.start_battle(locId)) { ui.showEventPopup("所有宠物都倒下了！使用醒神草或寻找恢复事件吧。"); return; }
    syncBattleUI(ctx);
    ctx.pokedex.markEncountered(ds(exports.get_enemy_name()));
    ui.setLog(`遭遇了 ${ds(exports.get_enemy_name())}！选择你的行动。`);
    ui.setButtons(true, exports);
    petSwitchPanel.hidden = false; const bi = $("battle-items"); if (bi) bi.hidden = false;
    $("map-items").hidden = true; mapView.hidden = true; battleView.hidden = false;
  }

  return { syncBattleUI, handleResult, exitBattle, setupButtons, enterBattle, petSwitchPanel, btnAttack, btnRun, btnSkill, btnUseHerb, btnUseRevive, btnUseHerb50, btnUseHerbHalf, btnUseHerbFull, btnUseReviveFull, btnUseCharm, btnUseGreatCharm };
}
