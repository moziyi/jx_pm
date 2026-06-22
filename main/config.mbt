// config.mbt — 游戏常量与配置

// JS 互操作

///|
fn math_random() -> Double = "env" "math_random"

// 五行元素

///|
enum Element {
  Metal
  Wood
  Earth
  Water
  Fire
}

// 战斗元素效果

///|
enum BattleEffect {
  Restrain // 克制 1.2x
  Restricted // 被克 0.8x
  Generate // 相生 0.5x 治疗
  Neutral // 1.0x
}

// 获取元素战斗效果

///|
pub fn battle_effect(atk : Element, def : Element) -> BattleEffect {
  match (atk, def) {
    // 克制
    (Metal, Wood)
    | (Wood, Earth)
    | (Earth, Water)
    | (Water, Fire)
    | (Fire, Metal) => Restrain
    // 被克
    (Wood, Metal)
    | (Earth, Wood)
    | (Water, Earth)
    | (Fire, Water)
    | (Metal, Fire) => Restricted
    // 相生
    (Metal, Water)
    | (Water, Wood)
    | (Wood, Fire)
    | (Fire, Earth)
    | (Earth, Metal) => Generate
    _ => Neutral
  }
}

///|
fn effect_to_mult(e : BattleEffect) -> Double {
  match e {
    Restrain => 1.2
    Restricted => 0.8
    Generate => 0.5
    Neutral => 1.0
  }
}

// 地点配置

///|
priv struct LocationConfig {
  name : String
  emoji : String
  hp : Int
  atk : Int
  def : Int
  agi : Int
  element : Element
}

///|
fn get_location(id : Int) -> LocationConfig {
  match id {
    1 =>
      {
        name: "幽林精灵",
        emoji: "🧚",
        hp: 35,
        atk: 8,
        def: 3,
        agi: 6,
        element: Wood,
      }
    2 =>
      {
        name: "水晶蝙蝠",
        emoji: "🦇",
        hp: 28,
        atk: 10,
        def: 5,
        agi: 4,
        element: Earth,
      }
    3 =>
      {
        name: "神殿卫士",
        emoji: "⚗️",
        hp: 50,
        atk: 14,
        def: 8,
        agi: 2,
        element: Metal,
      }
    4 =>
      {
        name: "月影水灵",
        emoji: "💧",
        hp: 32,
        atk: 7,
        def: 2,
        agi: 8,
        element: Water,
      }
    _ =>
      {
        name: "未知生物",
        emoji: "❓",
        hp: 30,
        atk: 9,
        def: 4,
        agi: 4,
        element: Fire,
      }
  }
}

// 初始宠物

///|
let _starter : CapturedEntry = {
  name: "小幽",
  emoji: "🧚",
  hp: 35,
  atk: 8,
  def: 3,
  agi: 5,
  lv: 1,
  exp: 0,
  cur_hp: 35,
  element: Fire,
}

// 初始道具

///|
let _init_inventory : Inventory = {
  herbs: 3,
  revives: 1,
  charms: 2,
  great_charms: 1,
}

// 常量

///|
let max_pets : Int = 5

// 等级系统

///|
let max_level : Int = 50

///|
pub fn exp_to_next(lv : Int) -> Int {
  if lv >= max_level {
    0
  } else {
    15 + lv * lv * 10
  }
}

///|
pub fn get_max_level() -> Int {
  max_level
}

///|
fn calc_exp_reward(hp : Int, atk : Int, def : Int, agi : Int, lv : Int) -> Int {
  let raw = hp + atk * 2 + def + agi + lv * 5
  if raw < 1 {
    1
  } else {
    raw
  }
}

// 特殊事件类型

///|
priv enum EventType {
  Treasure
  EliteBattle
  Merchant
}

///|
fn event_type_to_int(e : EventType) -> Int {
  match e {
    Treasure => 1
    EliteBattle => 2
    Merchant => 3
  }
}

///|
fn int_to_event_type(i : Int) -> EventType {
  match i {
    1 => Treasure
    2 => EliteBattle
    3 => Merchant
    _ => Treasure
  }
}

// Element 转换

///|
pub fn element_to_int(e : Element) -> Int {
  match e {
    Metal => 0
    Wood => 1
    Earth => 2
    Water => 3
    Fire => 4
  }
}

///|
fn int_to_element(i : Int) -> Element {
  match i {
    0 => Metal
    1 => Wood
    2 => Earth
    3 => Water
    _ => Fire
  }
}
