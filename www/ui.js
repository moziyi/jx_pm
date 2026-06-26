// ui.js — UI 工具：动画/弹窗/HP条/日志/按钮状态

export const EL_COLORS = ['#d4af37', '#4caf50', '#b8956a', '#4da6d9', '#e85d3a'];

export function createUI($, battleView, battleLog, btnAttack, btnRun, btnSkill, btnItems) {

  function $(id) { return document.getElementById(id); } // re-bind locally

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
    if (!battleView) return;
    battleView.classList.add("crit-flash");
    setTimeout(() => battleView.classList.remove("crit-flash"), 500);
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
    if (!battleView) return;
    battleView.classList.add("shaking");
    setTimeout(() => battleView.classList.remove("shaking"), 350);
  }

  function playCatchFlash() {
    const enemy = document.getElementById("enemy-avatar");
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

  function setHp(who, cur, max) {
    const pct = Math.max(0, (cur / max) * 100);
    const bar = document.getElementById(`${who}-hp-bar`);
    bar.style.width = pct + "%";
    bar.className = "hp-fill " + (pct > 50 ? "green" : pct > 25 ? "yellow" : "red");
    document.getElementById(`${who}-hp-text`).textContent = `${Math.max(0, cur)}/${max}`;
  }

  function setLog(msg) {
    battleLog.textContent = msg;
  }

  function setButtons(on, exports) {
    [btnAttack, btnRun, btnItems].forEach((b) => {
      if (b) b.disabled = !on;
    });
    if (btnSkill) {
      const cd = exports.get_skill_cooldown ? exports.get_skill_cooldown() : 0;
      btnSkill.disabled = !on || cd > 0;
      const sub = btnSkill.querySelector(".btn-sub");
      if (sub) sub.textContent = cd > 0 ? "冷却中…" : "五行克制";
    }
  }

  return { showDamageFloat, showMissText, playAttackAnim, playHitAnim, playDodgeAnim, playDefeatAnim, screenCritFlash, playLevelGlow, playChargeGlow, spawnParticles, screenShake, playCatchFlash, showEventPopup, setHp, setLog, setButtons };
}
