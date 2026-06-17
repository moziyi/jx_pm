// config.js — 游戏配置（纯数据，修改即可调整游戏参数）

export const ELEMENTS = ['金', '木', '土', '水', '火']

export const STARTER_PET = { n: '小幽', e: '🧚', hp: 35, atk: 8, lv: 1, cur_hp: 35, el: 4 }

export const INITIAL_ITEMS = { herbs: 3, revives: 1, charms: 2 }

// 场景 → MoonBit location_id 映射
export const SCENES = {
  forest: { id: 1, name: '幽暗森林', emoji: '🌲' },
  cave:   { id: 2, name: '水晶矿洞', emoji: '💎' },
  ruins:  { id: 3, name: '古代神殿', emoji: '🏛️' },
  lake:   { id: 4, name: '月影湖泊', emoji: '🌊' },
}

// 特殊事件类型（仅在地图显示的标记）
export const SPECIAL_EVENTS = {
  1: { name: '宝藏', emoji: '💎', cls: 'm-treasure' },
  2: { name: '稀有敌人', emoji: '⭐', cls: 'm-rare' },
  3: { name: '神秘商人', emoji: '🧙', cls: 'm-merchant' },
}

// 事件配置：每个场景有 battles（战斗池）和 events（非战斗池），按权重随机
export const EVENTS = {
  forest: {
    battles: [
      { w: 4, enemy: { name: '幽林精灵', emoji: '🧚', hp: 35, atk: 8, el: 1 } },
      { w: 1, enemy: { name: '烈风妖精', emoji: '🧚', hp: 42, atk: 10, el: 4 } },  // 稀有火变体
    ],
    events: [
      { w: 3, type: 'item', msg: '树洞中发现了药草！', item: 'herbs', n: 1 },
      { w: 2, type: 'heal_active_full', msg: '森林灵气完全治愈了出战宠物！' },
      { w: 1, type: 'hurt_active', msg: '踩到了毒刺！出战宠物受伤', n: 10 },
      { w: 2, type: 'revive_one', msg: '发现了倒在路边的宠物，用药草救醒了它' },
      { w: 1, type: 'item', msg: '拾到了遗落的幻兽符！', item: 'charms', n: 1 },
    ]
  },
  cave: {
    battles: [
      { w: 4, enemy: { name: '水晶蝙蝠', emoji: '🦇', hp: 28, atk: 10, el: 2 } },
      { w: 1, enemy: { name: '巨型石像鬼', emoji: '🗿', hp: 40, atk: 14, el: 2 } },
    ],
    events: [
      { w: 2, type: 'item', msg: '挖到了药草和醒神草！', item: 'herbs', n: 1, extra: { item: 'revives', n: 1 } },
      { w: 2, type: 'heal_all', msg: '矿石的能量治愈了全体宠物', n: 10 },
      { w: 1, type: 'hurt_all', msg: '矿洞塌方！全体宠物受伤', n: 8 },
      { w: 2, type: 'item', msg: '发现了闪亮的幻兽符', item: 'charms', n: 1 },
      { w: 1, type: 'revive_one', msg: '矿洞深处传来了宠物苏醒的声音' },
    ]
  },
  ruins: {
    battles: [
      { w: 4, enemy: { name: '神殿卫士', emoji: '⚗️', hp: 50, atk: 14, el: 0 } },
      { w: 1, enemy: { name: '黄金巨像', emoji: '🗽', hp: 65, atk: 18, el: 0 } },
    ],
    events: [
      { w: 2, type: 'item', msg: '祭坛上供奉着醒神草', item: 'revives', n: 1 },
      { w: 1, type: 'heal_active_full', msg: '神殿的祝福完全治愈了出战宠物！' },
      { w: 1, type: 'hurt_active', msg: '陷阱触发！出战宠物受伤', n: 15 },
      { w: 2, type: 'item', msg: '发现了古代药草配方', item: 'herbs', n: 2 },
      { w: 1, type: 'revive_one', msg: '神殿圣光唤醒了一只倒下的宠物' },
    ]
  },
  lake: {
    battles: [
      { w: 4, enemy: { name: '月影水灵', emoji: '💧', hp: 32, atk: 7, el: 3 } },
      { w: 1, enemy: { name: '深寒巨蟒', emoji: '🐍', hp: 45, atk: 11, el: 3 } },
    ],
    events: [
      { w: 2, type: 'heal_all', msg: '湖水治愈了全体宠物', n: 15 },
      { w: 2, type: 'item', msg: '捡到了漂流而来的药草', item: 'herbs', n: 1 },
      { w: 1, type: 'hurt_all', msg: '湖中漩涡！全体宠物受伤', n: 10 },
      { w: 2, type: 'item', msg: '月光下发现了幻兽符', item: 'charms', n: 1 },
      { w: 1, type: 'heal_active_full', msg: '湖中仙子祝福了出战宠物' },
    ]
  },
}

// 加权随机选取
export function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.w, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.w
    if (r <= 0) return item
  }
  return items[items.length - 1]
}
