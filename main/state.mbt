// state.mbt — 数据结构、全局状态、地点配置

// JS 互操作
fn math_random() -> Double = "env" "math_random"

// 地点配置
priv struct LocationConfig {
  name  : String
  emoji : String
  hp    : Int
  atk   : Int
}

// 已拥有宠物
priv struct CapturedEntry {
  name  : String
  emoji : String
  hp    : Int   // max HP
  atk   : Int
  lv    : Int
  mut cur_hp : Int
}

// 行动结果
priv struct LastResult {
  mut message         : String
  mut damage_dealt    : Int
  mut damage_taken    : Int
  mut catch_success   : Bool
  mut catch_rate      : Double
  mut player_defeated : Bool
  mut enemy_defeated  : Bool
}

// 游戏状态
priv struct GameState {
  mut player_hp      : Int
  mut player_max_hp  : Int
  mut player_atk      : Int
  mut enemy_hp       : Int
  mut enemy_max_hp   : Int
  mut enemy_atk      : Int
  mut enemy_name     : String
  mut enemy_emoji    : String
  mut owned          : Array[CapturedEntry]
  mut active         : Int
}

// 初始宠物
let _starter : CapturedEntry = {
  name:   "小幽",
  emoji:  "🧚",
  hp:     35,
  atk:    8,
  lv:     1,
  cur_hp: 35,
}

// 全局实例
let _state : GameState = {
  player_hp:     _starter.cur_hp,
  player_max_hp: _starter.hp,
  player_atk:     _starter.atk,
  enemy_hp:      0,
  enemy_max_hp:  0,
  enemy_atk:     0,
  enemy_name:    "",
  enemy_emoji:   "",
  owned:         [_starter],
  active:        0,
}

let _result : LastResult = {
  message:         "",
  damage_dealt:    0,
  damage_taken:    0,
  catch_success:   false,
  catch_rate:      0.0,
  player_defeated: false,
  enemy_defeated:  false,
}

// 地点数据
fn get_location(id : Int) -> LocationConfig {
  match id {
    1 => { name: "幽林精灵", emoji: "🧚", hp: 35, atk: 8  }
    2 => { name: "水晶蝙蝠", emoji: "🦇", hp: 28, atk: 10 }
    3 => { name: "神殿卫士", emoji: "⚗️",  hp: 50, atk: 14 }
    4 => { name: "月影水灵", emoji: "💧", hp: 32, atk: 7  }
    _ => { name: "未知生物", emoji: "❓", hp: 30, atk: 9  }
  }
}
