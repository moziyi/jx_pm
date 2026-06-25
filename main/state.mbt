// state.mbt — 数据结构与全局状态
// 已拥有宠物

///|
priv struct CapturedEntry {
  id : Int
  name : String
  emoji : String
  mut hp : Int
  mut atk : Int
  mut def : Int
  mut agi : Int
  mut lv : Int
  mut exp : Int
  mut cur_hp : Int
  element : Element
}

///|
priv struct IdCounter { mut next : Int }

///|
let _id_counter : IdCounter = { next: 2 }

///|
fn next_id() -> Int {
  let id = _id_counter.next
  _id_counter.next = _id_counter.next + 1
  id
}

// 道具

///|
priv struct Inventory {
  mut herbs : Int
  mut revives : Int
  mut charms : Int
  mut great_charms : Int
  mut herb50 : Int
  mut herb_half : Int
  mut herb_full : Int
  mut revive_full : Int
}

// 行动结果

///|
priv struct LastResult {
  mut message : String
  mut damage_dealt : Int
  mut damage_taken : Int
  mut catch_success : Bool
  mut catch_rate : Double
  mut player_defeated : Bool
  mut enemy_defeated : Bool
  mut exp_gained : Int
  mut leveled_up : Bool
  mut dodged : Bool
}

// 游戏状态

///|
priv struct GameState {
  mut player_hp : Int
  mut player_max_hp : Int
  mut player_atk : Int
  mut enemy_hp : Int
  mut enemy_max_hp : Int
  mut enemy_atk : Int
  mut enemy_def : Int
  mut enemy_agi : Int
  mut enemy_lv : Int
  mut enemy_name : String
  mut enemy_emoji : String
  mut enemy_element : Element
  mut owned : Array[CapturedEntry]
  mut active : Int
  mut stored : Array[CapturedEntry]
  mut skill_cooldown : Int
  mut enemy_action_count : Int
}

// 全局实例

///|
let _state : GameState = {
  player_hp: _starter.cur_hp,
  player_max_hp: _starter.hp,
  player_atk: _starter.atk,
  enemy_hp: 0,
  enemy_max_hp: 0,
  enemy_atk: 0,
  enemy_def: 0,
  enemy_agi: 0,
  enemy_lv: 0,
  enemy_name: "",
  enemy_emoji: "",
  enemy_element: Fire,
  owned: [_starter],
  active: 0,
  stored: [],
  skill_cooldown: 0,
  enemy_action_count: 0,
}

///|
let _result : LastResult = {
  message: "",
  damage_dealt: 0,
  damage_taken: 0,
  catch_success: false,
  catch_rate: 0.0,
  player_defeated: false,
  enemy_defeated: false,
  exp_gained: 0,
  leveled_up: false,
  dodged: false,
}

///|
let _inventory : Inventory = {
  herbs: 3,
  revives: 1,
  charms: 2,
  great_charms: 1,
  herb50: 1,
  herb_half: 1,
  herb_full: 0,
  revive_full: 0,
}

// 敌方基础属性（用于 boost_enemy 计算）

///|
priv struct EnemyBase {
  mut hp : Int
  mut atk : Int
}

///|
let _enemy_base : EnemyBase = { hp: 0, atk: 0 }

// 特殊事件点位

///|
priv struct SpecialEvent {
  mut active : Bool
  mut etype : EventType
  mut x : Int
  mut y : Int
}

///|
let _special : SpecialEvent = { active: false, etype: Treasure, x: 0, y: 0 }
