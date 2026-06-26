// items.js — 道具菜单：弹窗/tab/目标选择

const ITEMS = [
  { key:'herb', emoji:'🧪', name:'药草', cat:'heal', desc:'回复 20 HP', use:(e)=>e.use_herb() },
  { key:'herb50', emoji:'💊', name:'强效药草', cat:'heal', desc:'回复 50 HP', use:(e)=>e.use_herb50() },
  { key:'herb_half', emoji:'🌸', name:'半恢复草', cat:'heal', desc:'回复 50% Max HP', use:(e)=>e.use_herb_half() },
  { key:'herb_full', emoji:'🌟', name:'全恢复草', cat:'heal', desc:'回复全部 HP', use:(e)=>e.use_herb_full() },
  { key:'revive', emoji:'🌿', name:'醒神草', cat:'heal', desc:'复苏，回复 50% HP', use:(e,idx)=>e.use_revive(idx), isRevive:true },
  { key:'revive_full', emoji:'✨', name:'满血醒神草', cat:'heal', desc:'复苏，回复全部 HP', use:(e,idx)=>e.use_revive_full(idx), isRevive:true },
  { key:'charm', emoji:'🔮', name:'幻兽符', cat:'fight', desc:'捕捉率 +15%', use:(e)=>e.use_charm(), battleOnly:true },
  { key:'great_charm', emoji:'⭐', name:'高级幻兽符', cat:'fight', desc:'捕捉率 +30%', use:(e)=>e.use_great_charm(), battleOnly:true },
];

export function createItems($, exports, ds, petsMod, syncFromMoonBit) {
  let activeTab = 'all';
  let mode = 'map'; // 'map' | 'battle'
  let hasUseResult = null; // callback after use

  const popup = $("item-popup");
  const listEl = $("item-list");
  const targetPick = $("target-pick");
  const targetList = $("target-list");

  function updateItemIds() {
    ITEMS.forEach(i => i.get = exports['get_' + i.key] ? exports['get_' + i.key]() : 0);
  }

  function count(key) {
    return exports['get_' + key] ? exports['get_' + key]() : 0;
  }

  function openMenu(m, afterUse) {
    mode = m;
    hasUseResult = afterUse || null;
    updateItemIds();
    popup.hidden = false;
    targetPick.hidden = true;
    renderTabs();
    renderItems();
  }

  function closeMenu() {
    popup.hidden = true;
    targetPick.hidden = true;
  }

  function renderTabs() {
    popup.querySelectorAll(".item-tab").forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === activeTab);
      tab.onclick = () => { activeTab = tab.dataset.tab; renderTabs(); renderItems(); };
    });
  }

  function renderItems() {
    const filtered = ITEMS.filter(i => {
      if (activeTab === 'heal') return i.cat === 'heal';
      if (activeTab === 'fight') return i.cat === 'fight';
      return true;
    });
    listEl.innerHTML = filtered.map(i => {
      const c = count(i.key);
      const disabled = c <= 0 || (i.battleOnly && mode !== 'battle');
      return `<div class="item-row">
        <span class="item-row-icon">${i.emoji}</span>
        <span class="item-row-name">${i.name}<span style="font-size:10px;color:var(--text-dim);margin-left:8px;">${i.desc}</span></span>
        <span class="item-row-count">x${c}</span>
        <button class="item-row-use" data-key="${i.key}" ${disabled?'disabled':''}>使用</button>
      </div>`;
    }).join('');
    listEl.querySelectorAll(".item-row-use:not([disabled])").forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.key;
        const item = ITEMS.find(i => i.key === key);
        if (!item || count(key) <= 0) return;
        if (item.cat === 'heal') showTargetPicker(item);
        else useBattleItem(item);
      };
    });
  }

  function showTargetPicker(item) {
    const pets = petsMod.getPets();
    targetPick.hidden = false;
    popup.hidden = true;
    const isRevive = item.isRevive;
    targetList.innerHTML = pets.map((p, idx) => {
      const dead = p.cur_hp <= 0;
      const full = p.cur_hp >= p.hp;
      const hpPct = Math.max(0, (p.cur_hp / p.hp) * 100);
      const hpColor = hpPct > 50 ? 'green' : hpPct > 25 ? 'yellow' : 'red';
      let selectable = true, reason = '';
      if (isRevive && !dead) { selectable = false; reason = '存活中'; }
      else if (!isRevive && dead) { selectable = false; reason = '已阵亡'; }
      else if (!isRevive && full) { selectable = false; reason = 'HP已满'; }
      return `<div class="target-card${selectable?'':' disabled'}" data-idx="${idx}"${selectable?'':' title="'+reason+'"'}>
        <span class="target-card-icon">${p.e}</span>
        <div class="target-card-info">
          <div><span class="target-card-name">${p.n}</span> <span class="target-card-lv">Lv${p.lv??1}</span> ${dead?'💀':''} ${reason ? '<span style="color:var(--text-dim);font-size:10px;">('+reason+')</span>' : ''}</div>
          <div class="target-card-hp">
            <span>${Math.max(0,p.cur_hp)}/${p.hp}</span>
            <div class="target-card-hp-bar"><div class="target-card-hp-fill ${hpColor}" style="width:${hpPct}%"></div></div>
          </div>
        </div>
      </div>`;
    }).join('');
    targetList.querySelectorAll(".target-card:not(.disabled)").forEach(card => {
      card.onclick = () => {
        const idx = parseInt(card.dataset.idx);
        item.use(exports, idx);
        targetPick.hidden = true;
        syncFromMoonBit();
        closeMenu();
        if (hasUseResult) hasUseResult();
      };
    });
    $("target-cancel").onclick = () => { targetPick.hidden = true; popup.hidden = false; };
  }

  function useBattleItem(item) {
    if (item.use(exports)) {
      closeMenu();
      syncFromMoonBit();
      if (hasUseResult) hasUseResult();
    } else {
      closeMenu();
    }
  }

  return { openMenu, closeMenu };
}
