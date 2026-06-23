// config.js — 游戏配置（纯数据，修改即可调整游戏参数）

export const ELEMENTS = ['金', '木', '土', '水', '火']

// 元素常量映射，方便配置时直接使用名字
export const EL = { METAL: 0, WOOD: 1, EARTH: 2, WATER: 3, FIRE: 4 }

export const STARTER_PET = { n: '小幽', e: '🧚', hp: 35, atk: 8, lv: 1, cur_hp: 35, el: EL.FIRE }

export const INITIAL_ITEMS = { herbs: 3, revives: 1, charms: 2, great_charms: 1 }

// 场景 → MoonBit location_id 映射
export const SCENES = {
  forest:  { id: 1, name: '幽暗森林', emoji: '🌲' },
  cave:    { id: 2, name: '水晶矿洞', emoji: '💎' },
  ruins:   { id: 3, name: '古代神殿', emoji: '🏛️' },
  lake:    { id: 4, name: '月影湖泊', emoji: '🌊' },
  volcano: { id: 5, name: '炎熔火山', emoji: '🌋' },
  realm:   { id: 6, name: '幻境裂隙', emoji: '🌀' },
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
      { w: 3, enemy: { name: '幽林精灵', emoji: '🧚', hp: 35, atk: 8, el: EL.WOOD } },
      { w: 3, enemy: { name: '荆棘藤怪', emoji: '🌿', hp: 30, atk: 10, el: EL.WOOD } },
      { w: 2, enemy: { name: '幻光蜂鸟', emoji: '🐦', hp: 22, atk: 7, el: EL.FIRE } },
      { w: 2, enemy: { name: '林间石灵', emoji: '🗿', hp: 40, atk: 6, el: EL.EARTH } },
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
      { w: 3, enemy: { name: '水晶蝙蝠', emoji: '🦇', hp: 28, atk: 10, el: EL.EARTH } },
      { w: 3, enemy: { name: '深窟蝙蝠', emoji: '🦇', hp: 25, atk: 12, el: EL.EARTH } },
      { w: 2, enemy: { name: '晶石巨蛛', emoji: '🕷️', hp: 38, atk: 13, el: EL.METAL } },
      { w: 2, enemy: { name: '地底水母', emoji: '🎐', hp: 30, atk: 8, el: EL.WATER } },
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
      { w: 3, enemy: { name: '神殿卫士', emoji: '⚗️', hp: 50, atk: 14, el: EL.METAL } },
      { w: 2, enemy: { name: '圣殿骑士', emoji: '⚔️', hp: 45, atk: 16, el: EL.METAL } },
      { w: 3, enemy: { name: '古神仆从', emoji: '🗿', hp: 42, atk: 10, el: EL.EARTH } },
      { w: 2, enemy: { name: '封印火灵', emoji: '🔥', hp: 32, atk: 15, el: EL.FIRE } },
    ],
    events: [
      { w: 2, type: 'item', msg: '祭坛上供奉着醒神草', item: 'revives', n: 1 },
      { w: 1, type: 'heal_active_full', msg: '神殿的祝福完全治愈了出战宠物！' },
      { w: 1, type: 'hurt_active', msg: '陷阱触发！出战宠物受伤', n: 15 },
      { w: 2, type: 'item', msg: '发现了古代药草', item: 'herbs', n: 2 },
      { w: 1, type: 'revive_one', msg: '神殿圣光唤醒了一只倒下的宠物' },
    ]
  },
  lake: {
    battles: [
      { w: 3, enemy: { name: '月影水灵', emoji: '💧', hp: 32, atk: 7, el: EL.WATER } },
      { w: 2, enemy: { name: '深海电鳗', emoji: '⚡', hp: 28, atk: 12, el: EL.WATER } },
      { w: 3, enemy: { name: '冰霜精灵', emoji: '❄️', hp: 30, atk: 9, el: EL.WATER } },
      { w: 2, enemy: { name: '湖底巨龟', emoji: '🐢', hp: 48, atk: 6, el: EL.WOOD } },
    ],
    events: [
      { w: 2, type: 'heal_all', msg: '湖水治愈了全体宠物', n: 15 },
      { w: 2, type: 'item', msg: '捡到了漂流而来的药草', item: 'herbs', n: 1 },
      { w: 1, type: 'hurt_all', msg: '湖中漩涡！全体宠物受伤', n: 10 },
      { w: 2, type: 'item', msg: '月光下发现了幻兽符', item: 'charms', n: 1 },
      { w: 1, type: 'heal_active_full', msg: '湖中仙子祝福了出战宠物' },
    ]
  },
  volcano: {
    battles: [
      { w: 3, enemy: { name: '炎魔幼龙', emoji: '🔥', hp: 30, atk: 13, el: EL.FIRE } },
      { w: 3, enemy: { name: '熔岩蜥蜴', emoji: '🦎', hp: 32, atk: 14, el: EL.FIRE } },
      { w: 2, enemy: { name: '灰烬凤凰', emoji: '🦅', hp: 26, atk: 11, el: EL.FIRE } },
      { w: 2, enemy: { name: '硫磺石魔', emoji: '🪨', hp: 44, atk: 9, el: EL.EARTH } },
    ],
    events: [
      { w: 2, type: 'heal_active_full', msg: '火山温泉治愈了出战宠物！' },
      { w: 2, type: 'item', msg: '熔岩裂缝中发现了药草', item: 'herbs', n: 2 },
      { w: 1, type: 'hurt_active', msg: '被岩浆溅射灼伤！', n: 12 },
      { w: 2, type: 'item', msg: '拾到了火焰中的幻兽符', item: 'charms', n: 1 },
      { w: 2, type: 'revive_one', msg: '不灭火种唤醒了一只宠物' },
    ]
  },
  realm: {
    battles: [
      { w: 3, enemy: { name: '幻影奇美拉', emoji: '🐲', hp: 40, atk: 10, el: EL.WATER } },
      { w: 2, enemy: { name: '虚空行者', emoji: '👤', hp: 35, atk: 14, el: EL.METAL } },
      { w: 3, enemy: { name: '混沌之眼', emoji: '👁', hp: 38, atk: 12, el: EL.WATER } },
      { w: 2, enemy: { name: '幻光独角兽', emoji: '🦄', hp: 30, atk: 8, el: EL.WOOD } },
    ],
    events: [
      { w: 2, type: 'item', msg: '裂隙中飘出高级幻兽符', item: 'great_charms', n: 1 },
      { w: 2, type: 'heal_all', msg: '幻境能量治愈了全体宠物', n: 20 },
      { w: 1, type: 'item', msg: '拾到了裂隙中的醒神草和药草', item: 'revives', n: 1, extra: { item: 'herbs', n: 2 } },
      { w: 2, type: 'heal_active_full', msg: '幻境守护者祝福了出战宠物' },
      { w: 1, type: 'revive_one', msg: '幻境低语唤醒了一只倒下的宠物' },
    ]
  },
}

// 图鉴 — 全部 24 种怪物（按场景分组）
export const POKEDEX = {
  forest: [
    { n: '幽林精灵', e: '🧚', el: EL.WOOD },
    { n: '荆棘藤怪', e: '🌿', el: EL.WOOD },
    { n: '幻光蜂鸟', e: '🐦', el: EL.FIRE },
    { n: '林间石灵', e: '🗿', el: EL.EARTH },
  ],
  cave: [
    { n: '水晶蝙蝠', e: '🦇', el: EL.EARTH },
    { n: '深窟蝙蝠', e: '🦇', el: EL.EARTH },
    { n: '晶石巨蛛', e: '🕷️', el: EL.METAL },
    { n: '地底水母', e: '🎐', el: EL.WATER },
  ],
  ruins: [
    { n: '神殿卫士', e: '⚗️', el: EL.METAL },
    { n: '圣殿骑士', e: '⚔️', el: EL.METAL },
    { n: '古神仆从', e: '🗿', el: EL.EARTH },
    { n: '封印火灵', e: '🔥', el: EL.FIRE },
  ],
  lake: [
    { n: '月影水灵', e: '💧', el: EL.WATER },
    { n: '深海电鳗', e: '⚡', el: EL.WATER },
    { n: '冰霜精灵', e: '❄️', el: EL.WATER },
    { n: '湖底巨龟', e: '🐢', el: EL.WOOD },
  ],
  volcano: [
    { n: '炎魔幼龙', e: '🔥', el: EL.FIRE },
    { n: '熔岩蜥蜴', e: '🦎', el: EL.FIRE },
    { n: '灰烬凤凰', e: '🦅', el: EL.FIRE },
    { n: '硫磺石魔', e: '🪨', el: EL.EARTH },
  ],
  realm: [
    { n: '幻影奇美拉', e: '🐲', el: EL.WATER },
    { n: '虚空行者', e: '👤', el: EL.METAL },
    { n: '混沌之眼', e: '👁', el: EL.WATER },
    { n: '幻光独角兽', e: '🦄', el: EL.WOOD },
  ],
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
