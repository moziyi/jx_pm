// items.js — 道具计数 + 地图道具按钮

export function createItems($, exports, syncFromMoonBit) {

  function updateCounts() {
    const h = exports.get_herbs(),
      r = exports.get_revives(),
      c = exports.get_charms(),
      gc = exports.get_great_charms ? exports.get_great_charms() : 0,
      h50 = exports.get_herb50 ? exports.get_herb50() : 0,
      hh = exports.get_herb_half ? exports.get_herb_half() : 0,
      hf = exports.get_herb_full ? exports.get_herb_full() : 0,
      rf = exports.get_revive_full ? exports.get_revive_full() : 0;
    const set = (id, n) => { const el = $(id); if (el) el.textContent = "x" + n; };
    set("herb-count", h); set("map-herb-count", h);
    set("revive-count", r); set("map-revive-count", r);
    set("herb50-count", h50); set("map-herb50-count", h50);
    set("herb-half-count", hh); set("map-herb-half-count", hh);
    set("herb-full-count", hf); set("map-herb-full-count", hf);
    set("revive-full-count", rf); set("map-revive-full-count", rf);
    set("charm-count", c); set("great-charm-count", gc);
    const btnUseHerb = $("btn-herb"),
      btnUseRevive = $("btn-revive"),
      btnUseHerb50 = $("btn-herb50"),
      btnUseHerbHalf = $("btn-herb-half"),
      btnUseHerbFull = $("btn-herb-full"),
      btnUseReviveFull = $("btn-revive-full"),
      btnUseCharm = $("btn-charm");
    if (btnUseHerb) btnUseHerb.disabled = h <= 0;
    if (btnUseRevive) btnUseRevive.disabled = r <= 0;
    if (btnUseHerb50) btnUseHerb50.disabled = h50 <= 0;
    if (btnUseHerbHalf) btnUseHerbHalf.disabled = hh <= 0;
    if (btnUseHerbFull) btnUseHerbFull.disabled = hf <= 0;
    if (btnUseReviveFull) btnUseReviveFull.disabled = rf <= 0;
    if (btnUseCharm) btnUseCharm.disabled = c <= 0;
  }

  function setupMapButtons(ctx) {
    const { pets } = ctx;
    $("map-herb")?.addEventListener("click", () => {
      if (exports.get_herbs() > 0) { exports.use_herb(); syncFromMoonBit(); }
    });
    $("map-revive")?.addEventListener("click", () => {
      if (exports.get_revives() <= 0) return;
      const dead = pets.findIndex((p) => p.cur_hp <= 0);
      if (dead < 0) { alert("没有需要复苏的宠物"); return; }
      exports.use_revive(dead); syncFromMoonBit();
    });
    $("map-herb50")?.addEventListener("click", () => {
      if (exports.get_herb50 ? exports.get_herb50() > 0 : false) { exports.use_herb50(); syncFromMoonBit(); }
    });
    $("map-herb-half")?.addEventListener("click", () => {
      if (exports.get_herb_half ? exports.get_herb_half() > 0 : false) { exports.use_herb_half(); syncFromMoonBit(); }
    });
    $("map-herb-full")?.addEventListener("click", () => {
      if (exports.get_herb_full ? exports.get_herb_full() > 0 : false) { exports.use_herb_full(); syncFromMoonBit(); }
    });
    $("map-revive-full")?.addEventListener("click", () => {
      if (exports.get_revive_full ? exports.get_revive_full() <= 0 : true) return;
      const dead = pets.findIndex((p) => p.cur_hp <= 0);
      if (dead < 0) { alert("没有需要复苏的宠物"); return; }
      exports.use_revive_full(dead); syncFromMoonBit();
    });
  }

  return { updateCounts, setupMapButtons };
}
