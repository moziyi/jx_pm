// state.mbt — 数据结构与全局状态
// 已拥有宠物
priv struct CapturedEntry {
  name    : String
  emoji   : String
  hp      : Int
  atk     : Int
  lv      : Int
  mut cur_hp : Int
  element : Element
}

// 道具
priv struct Inventory {
  mut herbs  : Int
  mut revives : Int
  mut charms : Int
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
  mut enemy_element  : Element
  mut owned          : Array[CapturedEntry]
  mut active         : Int
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
  enemy_element: Fire,
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

let _inventory : Inventory = { herbs: 3, revives: 1, charms: 2 }

// 敌方基础属性（用于 boost_enemy 计算）
priv struct EnemyBase { mut hp : Int; mut atk : Int }
let _enemy_base : EnemyBase = { hp: 0, atk: 0 }

// 特殊事件点位
priv struct SpecialEvent {
  mut active : Bool
  mut etype  : Int
  mut x      : Int
  mut y      : Int
}
let _special : SpecialEvent = { active: false, etype: 0, x: 0, y: 0 }
