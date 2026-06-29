// @ts-check
// pokedex.js — 图鉴：状态/标记/渲染

import { ELEMENTS, SCENES, POKEDEX } from "./config.js";

export function createPokedex() {
  const KEY = "phantom_pokedex";
  let pokedex = {};
  try { pokedex = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { pokedex = {}; }

  function save() { localStorage.setItem(KEY, JSON.stringify(pokedex)); }

  function state(name) { return pokedex[name] || ""; }

  function markEncountered(name) {
    if (!pokedex[name]) { pokedex[name] = "seen"; save(); }
  }

  function markCaught(name) {
    pokedex[name] = "caught"; save();
  }

  function countDiscovered() { return Object.keys(pokedex).length; }

  function render($) {
    const panel = $("pokedex-panel");
    if (!panel) return;
    $("pokedex-count").textContent = `${countDiscovered()}/24`;
    let html = "";
    for (const [scene, monsters] of Object.entries(POKEDEX)) {
      const info = SCENES[scene];
      html += `<div class="dex-group"><div class="dex-group-title">${info.emoji} ${info.name}</div><div class="dex-grid">`;
      for (const m of monsters) {
        const s = state(m.n);
        if (!s) html += `<span class="dex-entry unknown" title="???"><span class="dex-silhouette">⚫</span></span>`;
        else if (s === "seen") html += `<span class="dex-entry seen" title="???"><span class="dex-icon-sm">${m.e}</span></span>`;
        else html += `<span class="dex-entry caught"><span class="dex-icon-sm">${m.e}</span><span class="dex-name">${m.n}</span><span class="dex-el">${ELEMENTS[m.el]}</span></span>`;
      }
      html += `</div></div>`;
    }
    panel.innerHTML = html;
  }

  return { state, markEncountered, markCaught, countDiscovered, render };
}
