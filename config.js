// config.js — 游戏配置（纯数据，修改即可调整游戏参数）

export const ELEMENTS = ['金', '木', '土', '水', '火']

export const STARTER_PET = { n: '小幽', e: '🧚', hp: 35, atk: 8, lv: 1, cur_hp: 35, el: 4 }

export const INITIAL_ITEMS = { herbs: 3, revives: 1, charms: 2 }

export const LOCATIONS = {
  1: { name: '幽暗森林', enemy: '幽林精灵', emoji: '🧚', hp: 35, atk: 8, el: 1 },
  2: { name: '水晶矿洞', enemy: '水晶蝙蝠', emoji: '🦇', hp: 28, atk: 10, el: 2 },
  3: { name: '古代神殿', enemy: '神殿卫士', emoji: '⚗️', hp: 50, atk: 14, el: 0 },
  4: { name: '月影湖泊', enemy: '月影水灵', emoji: '💧', hp: 32, atk: 7, el: 3 },
}

// 特殊事件类型
export const SPECIAL_EVENTS = {
  1: { name: '宝藏', emoji: '💎', cls: 'm-treasure', desc: '发现了宝藏！' },
  2: { name: '稀有敌人', emoji: '⭐', cls: 'm-rare', desc: '强大的敌人出现了！' },
  3: { name: '神秘商人', emoji: '🧙', cls: 'm-merchant', desc: '神秘商人路过…' },
}

// type: 'item' | 'heal_active' | 'heal_all' | 'hurt_active' | 'hurt_all' | 'battle'
export const EVENTS = {
  // 幽暗森林
  1: [
    { msg: '🧚 幽林精灵出现了！', type: 'battle' },
    { msg: '树洞中发现了药草！', type: 'item', item: 'herbs', n: 1 },
    { msg: '森林灵气治愈了出战宠物', type: 'heal_active_full' },
    { msg: '踩到了毒刺！出战宠物受伤', type: 'hurt_active', n: 10 },
    { msg: '发现了一只倒在路边的宠物，用草药救醒', type: 'revive_one' },
  ],
  // 水晶矿洞
  2: [
    { msg: '🦇 水晶蝙蝠袭来！', type: 'battle' },
    { msg: '挖到了药草和醒神草！', type: 'item', item: 'herbs', n: 1, extra: { item: 'revives', n: 1 } },
    { msg: '矿石能量治愈了全体宠物', type: 'heal_all', n: 10 },
    { msg: '矿洞塌方！全体宠物受伤', type: 'hurt_all', n: 8 },
    { msg: '发现了闪亮的幻兽符', type: 'item', item: 'charms', n: 1 },
  ],
  // 古代神殿
  3: [
    { msg: '⚗️ 神殿卫士苏醒了！', type: 'battle' },
    { msg: '祭坛上供奉着醒神草', type: 'item', item: 'revives', n: 1 },
    { msg: '神殿的祝福恢复了出战宠物全部 HP', type: 'heal_active', n: 999 },
    { msg: '陷阱触发！出战宠物受伤', type: 'hurt_active', n: 15 },
    { msg: '发现了古代药草配方', type: 'item', item: 'herbs', n: 2 },
  ],
  // 月影湖泊
  4: [
    { msg: '💧 月影水灵浮出水面！', type: 'battle' },
    { msg: '湖水治愈了全体宠物', type: 'heal_all', n: 15 },
    { msg: '捡到了漂流而来的药草', type: 'item', item: 'herbs', n: 1 },
    { msg: '湖中漩涡！全体宠物受伤', type: 'hurt_all', n: 10 },
    { msg: '月光下发现了幻兽符', type: 'item', item: 'charms', n: 1 },
  ],
}
