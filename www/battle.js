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

  function stagedItemResult(ctx, healVal) {
    function fixName(m) { const a = getPets()[exports.get_active()]; return a ? m.replace("未知", a.n) : m; }
    const msg1 = fixName(ds(exports.get_last_message()));
    const msg2 = fixName(ds(exports.get_last_message2 ? exports.get_last_message2() : ""));
    ctx.syncFromMoonBit();
    const taken = exports.get_last_damage_taken();
    const pHp = exports.get_player_hp();
    // 阶段1：治疗后HP（未受反击）
    if (msg2 !== "") {
      ui.setHp("player", pHp + taken, exports.get_player_max_hp());
    }
    ui.setLog(msg1);
    if (healVal) ui.showDamageFloat($("player-avatar"), healVal, true);
    if (msg2 !== "") {
      setTimeout(() => { ui.setLog(msg2); ui.setHp("player", pHp, exports.get_player_max_hp()); const e = exports.get_enemy_hp(), em = exports.get_enemy_max_hp(); ui.setHp("enemy", e, em); setTimeout(() => ui.setButtons(true, exports), 700); }, 700);
    } else {
      setTimeout(() => ui.setButtons(true, exports), 700);
    }
  }

  function handleResult(ctx) {
    const pets = getPets(), storedPets = getStored();
    const { syncFromMoonBit, pokedex, ui } = ctx;
    function fixName(m) { const a = pets[exports.get_active()]; return a ? m.replace("未知", a.n) : m; }
    const msg1 = fixName(ds(exports.get_last_message()));
    const msg2 = fixName(ds(exports.get_last_message2 ? exports.get_last_message2() : ""));
    const dealt = exports.get_last_damage_dealt();
    const taken = exports.get_last_damage_taken();
    const isCrit = msg1.includes("暴击") || msg2.includes("暴击");
    const isDodge = (exports.get_last_dodged ? exports.get_last_dodged() : false) || msg1.includes("未命中") || msg2.includes("未命中");
    const isSkill = msg1.includes("元素技") || msg2.includes("元素技");
    const enemyName = ds(exports.get_enemy_name());
    const enemyPhase1 = msg1.includes(enemyName);
    const playerMaxHp = exports.get_player_max_hp();
    const enemyMaxHp = exports.get_enemy_max_hp();

    function showPhase1() {
      // 阶段1血量：只反映先手方的变化
      const pHp = exports.get_player_hp(), eHp = exports.get_enemy_hp();
      if (enemyPhase1) {
        // 敌人先手：敌方HP尚未受反击影响
        ui.setHp("player", pHp, playerMaxHp);
        ui.setHp("enemy", eHp + dealt, enemyMaxHp);
      } else if (msg2 !== "") {
        // 我方先手：我方HP尚未受反击影响
        ui.setHp("player", pHp + taken, playerMaxHp);
        ui.setHp("enemy", eHp, enemyMaxHp);
      } else {
        syncBattleUI(ctx);
      }
      ui.setLog(msg1);
      if (enemyPhase1) {
        // 阶段1：敌人先手
        ui.playAttackAnim($("enemy-avatar"), "enemy-av");
        if (isDodge && msg1.includes("未命中")) { ui.showMissText($("player-avatar")); ui.playDodgeAnim($("player-avatar")); }
        else if (taken > 0) { ui.showDamageFloat($("player-avatar"), taken, false, false); ui.playHitAnim($("player-avatar")); }
      } else if (dealt > 0) {
        // 阶段1：我方先手
        ui.playAttackAnim($("player-avatar"), "player-av");
        if (isSkill) ui.playChargeGlow($("player-avatar"));
        ui.showDamageFloat($("enemy-avatar"), dealt, false, isCrit && msg1.includes("暴击"));
        ui.playHitAnim($("enemy-avatar"));
        if (isSkill) ui.spawnParticles($("enemy-avatar"), EL_COLORS[exports.get_player_element()] || "#fff", 6);
      }
      if (isCrit && msg1.includes("暴击")) { ui.screenCritFlash(); ui.screenShake(); }
      else if (dealt > 0 && !isCrit && !enemyPhase1) ui.screenShake();
    }

    function showPhase2() {
      if (msg2 === "") { finalize(); return; }
      ui.setLog(msg2);
      syncBattleUI(ctx);
      if (enemyPhase1) {
        // 阶段2：我方反击
        ui.playAttackAnim($("player-avatar"), "player-av");
        if (isSkill) ui.playChargeGlow($("player-avatar"));
        if (dealt > 0) { ui.showDamageFloat($("enemy-avatar"), dealt, false, isCrit && msg2.includes("暴击")); ui.playHitAnim($("enemy-avatar")); }
        if (isSkill) ui.spawnParticles($("enemy-avatar"), EL_COLORS[exports.get_player_element()] || "#fff", 6);
      } else {
        // 阶段2：敌人反击
        if (isDodge && msg2.includes("未命中")) { ui.showMissText($("player-avatar")); ui.playDodgeAnim($("player-avatar")); }
        else if (taken > 0) { ui.showDamageFloat($("player-avatar"), taken, false, false); ui.playHitAnim($("player-avatar")); ui.playAttackAnim($("enemy-avatar"), "enemy-av"); }
      }
      if (isCrit && msg2.includes("暴击")) { ui.screenCritFlash(); ui.screenShake(); }
      setTimeout(finalize, 700);
    }

    function finalize() {
      const won = exports.get_last_enemy_defeated(), lost = exports.get_last_player_defeated(), caught = exports.get_last_catch_success();
      // 修复 "未知" 名字 → 用 JS 侧正确名字替换
      function fixName(m) { const a = pets[exports.get_active()]; return a ? m.replace("未知", a.n) : m; }
      if (caught || won) {
        if (caught) { syncFromMoonBit(); pokedex.markCaught(ds(exports.get_enemy_name())); ui.playCatchFlash(); ui.spawnParticles($("enemy-avatar"), "#ffd700", 10); }
        if (won) { ui.playDefeatAnim($("enemy-avatar")); }
        const max = exports.get_max_pets ? exports.get_max_pets() : 5;
        const maxStored = exports.get_max_stored ? exports.get_max_stored() : 10;
        if (pets.length > max) {
          if (storedPets.length < maxStored) { exports.store_pet(pets.length - 1); syncFromMoonBit(); ui.setLog(fixName(msg1) + (msg2 ? " " + msg2 : "") + ` 队伍已满，新宠物已自动寄存。`); }
          else { petsMod.showReleasePicker(ctx); return; }
        }
        setTimeout(() => exitBattle(ctx), 1500);
        return;
      }
      if (lost) {
        syncFromMoonBit();
        // 标记出战宠物战败
        const deadIdx = exports.get_active();
        if (pets[deadIdx]) pets[deadIdx].cur_hp = 0;
        // 不清除，让玩家自行选择
        if (exports.all_fainted()) { ui.setLog(`所有宠物都无法出战了…逃离了战斗。`); setTimeout(() => exitBattle(ctx), 1800); return; }
        // 提示玩家选择切换或逃跑
        ui.setLog(`${pets[deadIdx]?.n || "宠物"} 倒下了！请切换宠物或逃跑。`);
        [btnAttack, btnSkill, btnUseHerb, btnUseRevive, btnUseHerb50, btnUseHerbHalf, btnUseHerbFull, btnUseReviveFull, btnUseCharm, btnUseGreatCharm].forEach((b) => { if (b) b.disabled = true; });
        btnRun.disabled = false; petsMod.renderSwitchPanel(petSwitchPanel, ctx); return;
      }
      ui.setButtons(true, exports);
    }

    showPhase1();
    if (msg2 !== "") setTimeout(showPhase2, 700);
    else setTimeout(finalize, 700);
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
    btnUseHerb?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb()) { stagedItemResult(ctx, 20); } else ui.setButtons(true, exports); });
    btnUseRevive?.addEventListener("click", () => {
      const dead = getPets().findIndex((p) => p.cur_hp <= 0); if (dead < 0) { alert("没有需要复苏的宠物"); return; }
      ui.setButtons(false, exports); if (exports.use_revive(dead)) { stagedItemResult(ctx); } else ui.setButtons(true, exports);
    });
    btnUseHerb50?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb50()) { stagedItemResult(ctx, 50); } else ui.setButtons(true, exports); });
    btnUseHerbHalf?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb_half()) { stagedItemResult(ctx, 25); } else ui.setButtons(true, exports); });
    btnUseHerbFull?.addEventListener("click", () => { ui.setButtons(false, exports); if (exports.use_herb_full()) { stagedItemResult(ctx, 999); } else ui.setButtons(true, exports); });
    btnUseReviveFull?.addEventListener("click", () => {
      const dead = getPets().findIndex((p) => p.cur_hp <= 0); if (dead < 0) { alert("没有需要复苏的宠物"); return; }
      ui.setButtons(false, exports); if (exports.use_revive_full(dead)) { stagedItemResult(ctx); } else ui.setButtons(true, exports);
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
