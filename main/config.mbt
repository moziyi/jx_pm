// config.mbt — 游戏常量与配置

// 五行元素
enum Element {
  Metal
  Wood
  Earth
  Water
  Fire
}

// 地点配置
priv struct LocationConfig {
  name    : String
  emoji   : String
  hp      : Int
  atk     : Int
  element : Element
}

fn get_location(id : Int) -> LocationConfig {
  match id {
    1 => { name: "幽林精灵", emoji: "🧚", hp: 35, atk: 8,  element: Wood  }
    2 => { name: "水晶蝙蝠", emoji: "🦇", hp: 28, atk: 10, element: Earth }
    3 => { name: "神殿卫士", emoji: "⚗️",  hp: 50, atk: 14, element: Metal }
    4 => { name: "月影水灵", emoji: "💧", hp: 32, atk: 7,  element: Water }
    _ => { name: "未知生物", emoji: "❓", hp: 30, atk: 9,  element: Fire  }
  }
}

// 初始宠物
let _starter : CapturedEntry = {
  name:    "小幽",
  emoji:   "🧚",
  hp:      35,
  atk:     8,
  lv:      1,
  cur_hp:  35,
  element: Fire,
}

// 初始道具
let _init_inventory : Inventory = { herbs: 3, revives: 1, charms: 2 }

// 常量
let max_pets : Int = 5

// Element 转换
pub fn element_to_int(e : Element) -> Int {
  match e {
    Metal => 0
    Wood  => 1
    Earth => 2
    Water => 3
    Fire  => 4
  }
}

fn int_to_element(i : Int) -> Element {
  match i {
    0 => Metal
    1 => Wood
    2 => Earth
    3 => Water
    _ => Fire
  }
}
